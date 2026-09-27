import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic, claudeSamplingParams, MODEL_IDS } from "@/lib/claude/client";
import { ratelimit } from "@/lib/ratelimit";
import { captureAPIError } from "@/lib/sentry";
import {
  entitlementDenied,
  ENTITLEMENT_COPY,
  loadProfileEntitlements,
  recordUsageEvent,
} from "@/lib/entitlements";
import { isSpendingCategory, SPENDING_CATEGORIES } from "@/lib/tracking/categories";
import { pdfPageChunks, type PdfChunk } from "@/lib/tracking/pdf-chunks";
import { claudeText, dedupeSpendingItems, parseSpendingPayload } from "@/lib/tracking/spending-parse";
import { prepareSpendingMedia, UploadMediaError, type PreparedSpendingMedia } from "@/lib/tracking/upload-media";
import type { ParsedSpendingItem } from "@/types/tracking";

export const maxDuration = 300;

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 8;
const PAGES_PER_CHUNK = 2;
const PARSE_MAX_TOKENS = 12000;

const SPENDING_PARSE_PROMPT = `You are a spending-statement parser for Mosaic Finance, a Canadian financial tracking and education platform.

The user uploaded a photo, screenshot, or PDF of a bank or card statement. Pages are often images with no selectable text. iPhone photos may have been converted from HEIC. Sensitive information (account numbers, SIN, full legal name, card numbers) may be cropped or redacted. That is expected — do NOT flag redacted fields as errors.

Extract money-out lines only: purchases, fees, bill payments, cash withdrawals, and interest charges. For each:
- txn_date: ISO date YYYY-MM-DD. If a line shows only a day, use the statement period year and month printed on the page. If the year is not visible, null.
- amount: The money-out amount as a positive number. Use the withdrawal, debit, or charge column. Do NOT use the running balance.
- description: Merchant or description as shown.
- suggested_category: One of: ${SPENDING_CATEGORIES.join(", ")}
- note: Optional short note (currency if not CAD).

Do not include deposits, payroll, refunds, other money in, transfers between the user's own accounts, opening or closing balances, credit limits, or summary totals.

OUTPUT FORMAT: Return ONLY a valid JSON object:
{
  "transactions": [
    { "txn_date": "YYYY-MM-DD" | null, "amount": number, "description": string, "suggested_category": string, "note": string | null }
  ],
  "confidence": "high" | "medium" | "low",
  "notes": string,
  "period_year": number | null,
  "period_month": number | null
}

RULES:
- Do NOT invent transactions that are not visible on these pages
- Amounts must be positive numbers
- In notes, say how many deposits and own-account transfers you skipped
- If these pages do not show transaction lines, return an empty transactions array, confidence "low", and explain in notes
- Prefer CAD. If another currency is shown, convert only if a CAD amount is also visible; otherwise keep the number and note the currency`;

interface ChunkRead {
  items: ParsedSpendingItem[];
  confidence?: string;
  notes?: string;
  periodYear: number | null;
  periodMonth: number | null;
  truncated: boolean;
}

function pageInstruction(
  chunk: Pick<PdfChunk, "startPage" | "endPage" | "pageCount">,
  periodYear: number | null,
  periodMonth: number | null,
): string {
  const range =
    chunk.startPage === chunk.endPage
      ? `page ${chunk.startPage} of ${chunk.pageCount}`
      : `pages ${chunk.startPage}-${chunk.endPage} of ${chunk.pageCount}`;
  const period =
    periodYear && periodMonth
      ? ` The statement period already found is year ${periodYear}, month ${periodMonth}. Use that when a line does not show a year.`
      : "";
  return `Parse the spending transactions on ${range}.${period} Use the withdrawal or money-out amount, not the running balance.`;
}

function foldConfidence(
  current: "high" | "medium" | "low",
  next: string | undefined,
): "high" | "medium" | "low" {
  if (next === "low" || current === "low") return "low";
  if (next === "medium" || current === "medium") return "medium";
  return "high";
}

function rememberPeriod(read: ChunkRead, periodYear: number | null, periodMonth: number | null) {
  if (
    read.periodYear &&
    read.periodYear >= 1990 &&
    read.periodYear <= 2100 &&
    read.periodMonth &&
    read.periodMonth >= 1 &&
    read.periodMonth <= 12
  ) {
    return { periodYear: read.periodYear, periodMonth: read.periodMonth };
  }
  return { periodYear, periodMonth };
}

async function readBlock(
  block:
    | { kind: "pdf"; data: string }
    | { kind: "image"; data: string; mediaType: PreparedSpendingMedia["mediaType"] },
  instruction: string,
  userId: string,
): Promise<ChunkRead> {
  const contentBlock =
    block.kind === "pdf"
      ? {
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: "application/pdf" as const,
            data: block.data,
          },
        }
      : {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: block.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: block.data,
          },
        };

  const response = await anthropic.messages.create({
    model: MODEL_IDS.sonnet,
    max_tokens: PARSE_MAX_TOKENS,
    ...claudeSamplingParams(MODEL_IDS.sonnet),
    messages: [
      {
        role: "user",
        content: [contentBlock, { type: "text", text: instruction }],
      },
    ],
    system: SPENDING_PARSE_PROMPT,
  });

  await recordUsageEvent({
    userId,
    kind: "upload",
    model: MODEL_IDS.sonnet,
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
    cacheReadTokens: response.usage?.cache_read_input_tokens ?? 0,
  });

  const text = claudeText(
    response.content.map((part) => ({
      type: part.type,
      text: "text" in part ? part.text : undefined,
    })),
  );
  const payload = parseSpendingPayload(text);
  return {
    items: normalizeParsed(payload),
    confidence: payload.confidence,
    notes: payload.notes,
    periodYear: payload.periodYear,
    periodMonth: payload.periodMonth,
    truncated: payload.truncated || response.stop_reason === "max_tokens",
  };
}

async function readPdf(buffer: Buffer, userId: string): Promise<{
  items: ParsedSpendingItem[];
  notes: string[];
  confidence: "high" | "medium" | "low";
}> {
  let chunks: PdfChunk[];
  try {
    chunks = await pdfPageChunks(buffer, PAGES_PER_CHUNK);
  } catch {
    chunks = [{ buffer, startPage: 1, endPage: 1, pageCount: 1 }];
  }

  let periodYear: number | null = null;
  let periodMonth: number | null = null;
  let confidence: "high" | "medium" | "low" = "high";
  const items: ParsedSpendingItem[] = [];
  const notes: string[] = [];

  for (const chunk of chunks) {
    const first = await readBlock(
      { kind: "pdf", data: chunk.buffer.toString("base64") },
      pageInstruction(chunk, periodYear, periodMonth),
      userId,
    );
    let reads = [first];
    if (first.truncated && chunk.endPage > chunk.startPage) {
      const pages = await pdfPageChunks(chunk.buffer, 1);
      reads = [];
      for (const page of pages) {
        reads.push(
          await readBlock(
            { kind: "pdf", data: page.buffer.toString("base64") },
            pageInstruction(page, periodYear, periodMonth),
            userId,
          ),
        );
        const period = rememberPeriod(reads[reads.length - 1], periodYear, periodMonth);
        periodYear = period.periodYear;
        periodMonth = period.periodMonth;
      }
    }

    for (const read of reads) {
      items.push(...read.items);
      if (read.notes) notes.push(read.notes);
      confidence = foldConfidence(confidence, read.confidence);
      const period = rememberPeriod(read, periodYear, periodMonth);
      periodYear = period.periodYear;
      periodMonth = period.periodMonth;
    }
  }

  return { items: dedupeSpendingItems(items), notes, confidence };
}

function normalizeParsed(raw: unknown): ParsedSpendingItem[] {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;
  const list = Array.isArray(obj.transactions) ? obj.transactions : [];
  const out: ParsedSpendingItem[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const amount = Number(r.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const catRaw = String(r.suggested_category ?? "other");
    const suggested_category = isSpendingCategory(catRaw) ? catRaw : "other";
    const dateRaw = r.txn_date;
    const txn_date =
      typeof dateRaw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : null;
    out.push({
      txn_date,
      amount: Math.round(amount * 100) / 100,
      description: String(r.description ?? "").slice(0, 300),
      suggested_category,
      note: r.note != null ? String(r.note).slice(0, 300) : undefined,
    });
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const entitlements = await loadProfileEntitlements(user.id);
    if (!entitlements.canParseUploads) {
      return entitlementDenied("parse", ENTITLEMENT_COPY.parse);
    }

    const { success } = await ratelimit.upload.limit(user.id);
    if (!success) {
      return NextResponse.json(
        { error: "Upload limit reached. Please try again later." },
        { status: 429 },
      );
    }

    const formData = await req.formData();
    const files = formData
      .getAll("files")
      .concat(formData.getAll("file"))
      .filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No files provided. Upload a photo, screenshot, or PDF." },
        { status: 400 },
      );
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Too many files. Maximum is ${MAX_FILES}.` },
        { status: 400 },
      );
    }

    const allParsed: ParsedSpendingItem[] = [];
    const documentIds: string[] = [];
    let overallConfidence: "high" | "medium" | "low" = "high";
    const notes: string[] = [];
    let stored = true;

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: "File too large. Maximum size is 10 MB." }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      let prepared;
      try {
        prepared = await prepareSpendingMedia(Buffer.from(arrayBuffer), file.name, file.type);
      } catch (error) {
        if (error instanceof UploadMediaError) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        throw error;
      }

      const storagePath = `spending/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${prepared.extension}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, prepared.buffer, {
          contentType: prepared.mediaType,
          upsert: false,
        });

      let docRecord: { id: string } | null = null;
      if (uploadError) {
        stored = false;
        captureAPIError(uploadError, {
          route: "upload/spending",
          userId: user.id,
          step: "storage_upload",
        });
      } else {
        const { data, error: insertError } = await supabase
          .from("document_uploads")
          .insert({
            user_id: user.id,
            storage_path: storagePath,
            parse_status: "processing",
          })
          .select()
          .single();

        if (insertError || !data) {
          stored = false;
          captureAPIError(insertError, {
            route: "upload/spending",
            userId: user.id,
            step: "document_record_insert",
          });
        } else {
          docRecord = data;
        }
      }

      try {
        const read =
          prepared.kind === "pdf"
            ? await readPdf(prepared.buffer, user.id)
            : await readBlock(
                {
                  kind: "image",
                  data: prepared.buffer.toString("base64"),
                  mediaType: prepared.mediaType,
                },
                "Parse the spending transactions in this photo or screenshot. Use the withdrawal or money-out amount, not the running balance.",
                user.id,
              );
        const items = prepared.kind === "pdf" ? read.items : dedupeSpendingItems(read.items);
        allParsed.push(...items);
        overallConfidence = foldConfidence(
          overallConfidence,
          "confidence" in read ? read.confidence : undefined,
        );
        const chunkNotes = "notes" in read && Array.isArray(read.notes) ? read.notes : read.notes ? [read.notes] : [];
        notes.push(...chunkNotes.filter((note): note is string => Boolean(note)));

        if (docRecord) {
          await supabase
            .from("document_uploads")
            .update({
              parsed_holdings: { transaction_count: items.length },
              parse_status: "completed",
            })
            .eq("id", docRecord.id);
          documentIds.push(docRecord.id);
        }
      } catch (parseError) {
        captureAPIError(parseError, {
          route: "upload/spending",
          userId: user.id,
          documentId: docRecord?.id,
          step: "claude_vision_parse",
        });
        if (docRecord) {
          await supabase
            .from("document_uploads")
            .update({ parse_status: "failed" })
            .eq("id", docRecord.id);
        }
        notes.push(`Could not read ${file.name}.`);
      }
    }

    const transactions = dedupeSpendingItems(allParsed);
    const joinedNotes = [...new Set(notes.map((note) => note.trim()).filter(Boolean))].join(" ").slice(0, 800);
    if (transactions.length === 0 && notes.some((note) => note.startsWith("Could not read"))) {
      return NextResponse.json(
        {
          status: "failed",
          error: "Could not read the transactions. Try a clearer photo, screenshot, or PDF of the list.",
          notes: joinedNotes,
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      status: "completed",
      documentIds,
      stored,
      confidence: overallConfidence,
      notes: joinedNotes,
      transactions,
    });
  } catch (error) {
    captureAPIError(error, { route: "upload/spending" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
