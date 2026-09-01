import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/claude/client";
import { ratelimit } from "@/lib/ratelimit";
import { captureAPIError } from "@/lib/sentry";
import { isSpendingCategory, SPENDING_CATEGORIES } from "@/lib/tracking/categories";
import type { ParsedSpendingItem } from "@/types/tracking";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 8;

const SPENDING_PARSE_PROMPT = `You are a spending-statement parser for Mosaic Finance, a Canadian financial tracking and education platform.

The user uploaded screenshot(s) or a PDF of banking-app transactions. Sensitive information (account numbers, SIN, full legal name, card numbers) may be cropped or redacted. That is expected — do NOT flag redacted fields as errors.

Extract every visible transaction. For each:
- txn_date: ISO date YYYY-MM-DD if visible. If only a day/month is shown, use the most recent matching date. If unknown, null.
- amount: Absolute spend amount in CAD (positive number). Ignore deposits/credits unless clearly a purchase refund that should be skipped.
- description: Merchant or description as shown.
- suggested_category: One of: ${SPENDING_CATEGORIES.join(", ")}
- note: Optional short note (e.g. currency if not CAD).

Skip account balances, transfers between own accounts, and anything that is clearly not a purchase.

OUTPUT FORMAT: Return ONLY a valid JSON object:
{
  "transactions": [
    { "txn_date": "YYYY-MM-DD" | null, "amount": number, "description": string, "suggested_category": string, "note": string | null }
  ],
  "confidence": "high" | "medium" | "low",
  "notes": string
}

RULES:
- Do NOT invent transactions that are not visible
- Amounts must be positive numbers
- If the document is not a spending list, return { "transactions": [], "confidence": "low", "notes": "Document does not appear to be a spending screenshot" }
- Prefer CAD. If another currency is shown, convert only if a CAD amount is also visible; otherwise keep the number and note the currency`;

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
        { error: "No files provided. Upload JPEG, PNG, WebP, or PDF screenshots." },
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

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
        return NextResponse.json(
          {
            error: `Unsupported file type: ${file.type || file.name}. Accepted formats: JPEG, PNG, WebP, PDF.`,
          },
          { status: 400 },
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: "File too large. Maximum size is 10 MB." }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Data = buffer.toString("base64");
      const fileExt = file.name.split(".").pop() ?? "jpg";
      const storagePath = `spending/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        captureAPIError(uploadError, {
          route: "upload/spending",
          userId: user.id,
          step: "storage_upload",
        });
        return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
      }

      const { data: docRecord, error: insertError } = await supabase
        .from("document_uploads")
        .insert({
          user_id: user.id,
          storage_path: storagePath,
          parse_status: "processing",
        })
        .select()
        .single();

      if (insertError || !docRecord) {
        captureAPIError(insertError, {
          route: "upload/spending",
          userId: user.id,
          step: "document_record_insert",
        });
        return NextResponse.json({ error: "Failed to create document record" }, { status: 500 });
      }

      try {
        const isPdf = file.type === "application/pdf";
        const contentBlock = isPdf
          ? {
              type: "document" as const,
              source: {
                type: "base64" as const,
                media_type: "application/pdf" as const,
                data: base64Data,
              },
            }
          : {
              type: "image" as const,
              source: {
                type: "base64" as const,
                media_type: file.type as "image/jpeg" | "image/png" | "image/webp",
                data: base64Data,
              },
            };

        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: [
                contentBlock,
                { type: "text", text: "Parse the spending transactions from this screenshot or statement." },
              ],
            },
          ],
          system: SPENDING_PARSE_PROMPT,
        });

        const responseText =
          response.content[0].type === "text" ? response.content[0].text : "";
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON in Claude Vision response");
        const parsed = JSON.parse(jsonMatch[0]) as {
          transactions?: unknown;
          confidence?: string;
          notes?: string;
        };
        const items = normalizeParsed(parsed);
        allParsed.push(...items);
        if (parsed.confidence === "low") overallConfidence = "low";
        else if (parsed.confidence === "medium" && overallConfidence === "high") {
          overallConfidence = "medium";
        }
        if (parsed.notes) notes.push(parsed.notes);

        await supabase
          .from("document_uploads")
          .update({
            parsed_holdings: parsed,
            parse_status: "completed",
          })
          .eq("id", docRecord.id);

        documentIds.push(docRecord.id);
      } catch (parseError) {
        captureAPIError(parseError, {
          route: "upload/spending",
          userId: user.id,
          documentId: docRecord.id,
          step: "claude_vision_parse",
        });
        await supabase
          .from("document_uploads")
          .update({ parse_status: "failed" })
          .eq("id", docRecord.id);
        return NextResponse.json(
          {
            documentId: docRecord.id,
            status: "failed",
            error:
              "Could not parse the screenshot. Crop out account numbers and try a clearer photo of the transaction list.",
          },
          { status: 422 },
        );
      }
    }

    return NextResponse.json({
      status: "completed",
      documentIds,
      confidence: overallConfidence,
      notes: notes.join(" "),
      transactions: allParsed,
    });
  } catch (error) {
    captureAPIError(error, { route: "upload/spending" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
