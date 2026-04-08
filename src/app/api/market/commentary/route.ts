import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ratelimit } from "@/lib/ratelimit";
import { captureAPIError } from "@/lib/sentry";
import { generateAndStoreCommentary } from "@/lib/ai-commentary/generator";
import { ALL_PERSONA_SLUGS, getModelForTier } from "@/lib/ai-commentary/personas";
import type { PersonaSlug } from "@/lib/market-data/types";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = await ratelimit.marketCommentary.limit(user.id);
    if (!success) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const persona = request.nextUrl.searchParams.get("persona");

    let query = supabase
      .from("ai_commentaries")
      .select("*")
      .order("generated_at", { ascending: false });

    if (persona) {
      query = query.eq("persona", persona);
    }

    const { data: commentaries, error } = await query.limit(64);

    if (error) throw error;

    const formatted = (commentaries || []).map((c) => ({
      id: c.id,
      persona: c.persona,
      modelUsed: c.model_used,
      ...((c.commentary as Record<string, unknown>) || {}),
      generatedAt: c.generated_at,
      period: c.period,
    }));

    return NextResponse.json({ commentaries: formatted });
  } catch (error) {
    captureAPIError(error, { route: "market/commentary" });
    return NextResponse.json(
      { error: "Unable to load commentary." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = await ratelimit.marketCommentary.limit(user.id);
    if (!success) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const body = await request.json();
    const persona = body.persona as PersonaSlug;

    if (!persona || !ALL_PERSONA_SLUGS.includes(persona)) {
      return NextResponse.json(
        { error: "Invalid persona. Must be one of: " + ALL_PERSONA_SLUGS.join(", ") },
        { status: 400 },
      );
    }

    // Determine model based on user tier
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    const model = getModelForTier(profile?.subscription_tier ?? "snapshot");
    const commentary = await generateAndStoreCommentary(persona, model);

    return NextResponse.json({ commentary });
  } catch (error) {
    captureAPIError(error, { route: "market/commentary POST" });
    return NextResponse.json(
      { error: "Unable to generate commentary." },
      { status: 500 },
    );
  }
}
