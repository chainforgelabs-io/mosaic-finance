import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const EXTRACTION_PROMPT = `You are an expert at extracting investment holdings from financial statements. Analyze this statement image/document and extract all holdings.

Return ONLY a JSON array of holdings, each with:
- "tickerOrName": The ticker symbol or fund name
- "balance": The dollar balance (number only, no $ or commas)
- "units": The number of units/shares if visible (number or null)

Example:
[
  {"tickerOrName": "XEQT", "balance": 15000, "units": 120},
  {"tickerOrName": "VFV", "balance": 8500, "units": 45},
  {"tickerOrName": "GIC - 1yr", "balance": 5000, "units": null}
]

If you cannot parse any holdings, return an empty array [].
Return ONLY the JSON array, no explanation.`;

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum 10MB." },
        { status: 400 },
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Use PDF, JPEG, PNG, or WebP." },
        { status: 400 },
      );
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const isPdf = file.type === "application/pdf";
    const mediaType = isPdf
      ? ("application/pdf" as const)
      : (file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif");

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const sourceBlock = isPdf
      ? ({
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: mediaType,
            data: base64,
          },
        } as Anthropic.DocumentBlockParam)
      : ({
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: mediaType,
            data: base64,
          },
        } as Anthropic.ImageBlockParam);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [sourceBlock, { type: "text", text: EXTRACTION_PROMPT }],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "Failed to parse statement" },
        { status: 500 },
      );
    }

    let holdings: { tickerOrName: string; balance: number; units: number | null }[];
    try {
      const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/);
      holdings = JSON.parse(jsonMatch?.[0] ?? "[]");
    } catch {
      return NextResponse.json(
        { error: "Could not extract holdings from statement" },
        { status: 422 },
      );
    }

    return NextResponse.json({ holdings });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to process statement";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
