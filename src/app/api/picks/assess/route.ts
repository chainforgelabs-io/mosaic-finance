import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ratelimit } from "@/lib/ratelimit";
import { captureAPIError } from "@/lib/sentry";
import { ALL_PERSONA_SLUGS } from "@/lib/ai-commentary/personas";
import {
  generateTakesForTicker,
  generateTickerTake,
  DEFAULT_TAKE_PERSONAS,
} from "@/lib/signals/persona-takes";
import type { PersonaSlug } from "@/lib/market-data/types";

export const maxDuration = 120;

const bodySchema = z.object({
  ticker: z.string().min(1).max(8),
  persona: z.string().optional(),
});

/** On-demand persona assessment for a single ticker. */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = await ratelimit.picksAssess.limit(user.id);
    if (!success) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const json: unknown = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const ticker = parsed.data.ticker.toUpperCase();

    if (parsed.data.persona) {
      if (!ALL_PERSONA_SLUGS.includes(parsed.data.persona as PersonaSlug)) {
        return NextResponse.json({ error: "Invalid persona" }, { status: 400 });
      }
      const take = await generateTickerTake(
        ticker,
        parsed.data.persona as PersonaSlug,
      );
      return NextResponse.json({ takes: [take] });
    }

    const takes = await generateTakesForTicker(ticker, DEFAULT_TAKE_PERSONAS);
    return NextResponse.json({ takes });
  } catch (error) {
    captureAPIError(error, { route: "picks/assess" });
    return NextResponse.json(
      { error: "Assessment failed." },
      { status: 500 },
    );
  }
}
