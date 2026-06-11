import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ratelimit } from "@/lib/ratelimit";
import { captureAPIError } from "@/lib/sentry";
import { runScan } from "@/lib/signals/run-scan";

export const maxDuration = 300;

const bodySchema = z.object({
  includeFirehose: z.boolean().optional(),
});

/** Manual scan trigger from the UI. */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = await ratelimit.picksRefresh.limit(user.id);
    if (!success) {
      return NextResponse.json(
        { error: "Rate limited — scans are limited to 3 per 10 minutes." },
        { status: 429 },
      );
    }

    const json: unknown = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json ?? {});

    const summary = await runScan({
      includeFirehose: parsed.success ? parsed.data.includeFirehose : undefined,
    });

    return NextResponse.json({ summary });
  } catch (error) {
    captureAPIError(error, { route: "picks/refresh" });
    return NextResponse.json(
      { error: "Scan failed." },
      { status: 500 },
    );
  }
}
