import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { anthropic } from '@/lib/claude/client';
import { ratelimit } from '@/lib/ratelimit';
import { captureAPIError } from '@/lib/sentry';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const STATEMENT_PARSE_PROMPT = `You are a financial document parser for Mosaic Finance, a Canadian financial planning platform.

The user has uploaded a blacked-out investment statement. Sensitive information (SIN, account numbers, full legal name) may be redacted. That is expected and correct — do NOT flag redacted fields as errors.

Extract all visible investment holdings from this document. For each holding, capture:
- ticker: The ticker symbol (e.g., XEQT, ZAG.TO, VFV). If not visible, use "UNKNOWN".
- name: The full name of the holding (e.g., "iShares Core S&P/TSX Capped Composite Index ETF")
- balance: The market value in CAD. If only shown in another currency, note that.
- units: Number of units/shares if visible. Omit if not shown.

Also identify:
- account_type: The account type if visible (RRSP, TFSA, FHSA, RESP, RDSP, RRIF, DB-RPP, DC-RPP, Hybrid-RPP, Target-Benefit, Group-RRSP, Group-TFSA, DPSP, EPSP, PRPP, VRSP, SPP, ESOP, ESPP, DSPP, RSU, Stock-Options, Phantom-Stock, EOT, LIRA, LRSP, RLSP, LIF, LRIF, PRIF, RLIF, non-registered, Joint, Corporate, In-Trust, Annuity). If multiple accounts are on one statement, group holdings by account.
- total_value: Total portfolio value if shown on the statement.

OUTPUT FORMAT: Return ONLY a valid JSON object:
{
  "accounts": [
    {
      "account_type": "RRSP" | "TFSA" | "FHSA" | "RESP" | "RDSP" | "RRIF" | "DB-RPP" | "DC-RPP" | "Hybrid-RPP" | "Target-Benefit" | "Group-RRSP" | "Group-TFSA" | "DPSP" | "EPSP" | "PRPP" | "VRSP" | "SPP" | "ESOP" | "ESPP" | "DSPP" | "RSU" | "Stock-Options" | "Phantom-Stock" | "EOT" | "LIRA" | "LRSP" | "RLSP" | "LIF" | "LRIF" | "PRIF" | "RLIF" | "non-registered" | "Joint" | "Corporate" | "In-Trust" | "Annuity" | "unknown",
      "holdings": [
        { "ticker": string, "name": string, "balance": number, "units": number | null }
      ],
      "total_value": number | null
    }
  ],
  "confidence": "high" | "medium" | "low",
  "notes": string
}

RULES:
- If a value is partially obscured, provide your best estimate and set confidence to "medium" or "low"
- Do NOT invent holdings that are not visible in the document
- If the document is not a financial statement, return { "accounts": [], "confidence": "low", "notes": "Document does not appear to be a financial statement" }
- All monetary values should be in CAD unless explicitly stated otherwise`;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { success } = await ratelimit.upload.limit(user.id);
    if (!success) {
      return NextResponse.json(
        { error: 'Upload limit reached. Please try again later.' },
        { status: 429 },
      );
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided. Please upload a statement image or PDF.' },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      return NextResponse.json(
        {
          error: `Unsupported file type: ${file.type}. Accepted formats: JPEG, PNG, WebP, PDF.`,
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10 MB.' },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');

    const fileExt = file.name.split('.').pop() ?? 'jpg';
    const storagePath = `statements/${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      captureAPIError(uploadError, {
        route: 'upload/statement',
        userId: user.id,
        step: 'storage_upload',
      });
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 },
      );
    }

    const { data: docRecord, error: insertError } = await supabase
      .from('document_uploads')
      .insert({
        user_id: user.id,
        storage_path: storagePath,
        parse_status: 'processing',
      })
      .select()
      .single();

    if (insertError) {
      captureAPIError(insertError, {
        route: 'upload/statement',
        userId: user.id,
        step: 'document_record_insert',
      });
      return NextResponse.json(
        { error: 'Failed to create document record' },
        { status: 500 },
      );
    }

    let parsedHoldings;
    try {
      const isPdf = file.type === 'application/pdf';
      const contentBlock = isPdf
        ? {
            type: 'document' as const,
            source: {
              type: 'base64' as const,
              media_type: 'application/pdf' as const,
              data: base64Data,
            },
          }
        : {
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
              data: base64Data,
            },
          };

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              contentBlock,
              {
                type: 'text',
                text: 'Parse the investment holdings from this statement.',
              },
            ],
          },
        ],
        system: STATEMENT_PARSE_PROMPT,
      });

      const responseText =
        response.content[0].type === 'text' ? response.content[0].text : '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in Claude Vision response');
      parsedHoldings = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      captureAPIError(parseError, {
        route: 'upload/statement',
        userId: user.id,
        documentId: docRecord.id,
        step: 'claude_vision_parse',
      });

      await supabase
        .from('document_uploads')
        .update({ parse_status: 'failed' })
        .eq('id', docRecord.id);

      return NextResponse.json(
        {
          documentId: docRecord.id,
          status: 'failed',
          error:
            'Could not parse the statement. Please ensure the document is a clear image of a financial statement.',
        },
        { status: 422 },
      );
    }

    await supabase
      .from('document_uploads')
      .update({
        parsed_holdings: parsedHoldings,
        parse_status: 'completed',
      })
      .eq('id', docRecord.id);

    return NextResponse.json({
      documentId: docRecord.id,
      status: 'completed',
      parsedHoldings,
    });
  } catch (error) {
    captureAPIError(error, { route: 'upload/statement' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
