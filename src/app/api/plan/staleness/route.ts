import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { captureAPIError } from "@/lib/sentry";

function parseTs(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function maxOf(dates: (Date | null)[]): Date | null {
  const valid = dates.filter((d): d is Date => d != null);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => (a.getTime() >= b.getTime() ? a : b));
}

export async function GET() {
  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const svc = createServiceClient();

    const [
      generatingRes,
      latestPlanRes,
      fpRes,
      ihRes,
      faRes,
      hmRes,
      riskRes,
    ] = await Promise.all([
      svc
        .from("financial_plans")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "generating")
        .limit(1)
        .maybeSingle(),
      svc
        .from("financial_plans")
        .select("id, status, updated_at, created_at")
        .eq("user_id", user.id)
        .neq("status", "superseded")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      svc
        .from("financial_profiles")
        .select("updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      svc
        .from("investment_holdings")
        .select("updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      svc
        .from("fixed_assets")
        .select("updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      svc
        .from("household_members")
        .select("updated_at, created_at")
        .eq("user_id", user.id),
      svc
        .from("risk_profiles")
        .select("created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const generating = Boolean(generatingRes.data?.id);
    const planRow = latestPlanRes.data;

    if (!planRow) {
      return NextResponse.json({
        stale: false,
        generating,
        dataChangedAt: null,
        planUpdatedAt: null,
        planStatus: null,
      });
    }

    if (generating) {
      return NextResponse.json({
        stale: false,
        generating: true,
        dataChangedAt: null,
        planUpdatedAt: planRow.updated_at ?? planRow.created_at,
        planStatus: planRow.status,
      });
    }

    const planUpdatedAt = maxOf([
      parseTs(planRow.updated_at),
      parseTs(planRow.created_at),
    ]);

    const householdMax =
      hmRes.data && hmRes.data.length > 0
        ? maxOf(
            hmRes.data.map((r) =>
              maxOf([parseTs(r.updated_at), parseTs(r.created_at)]),
            ),
          )
        : null;

    const dataChangedAt = maxOf([
      parseTs(fpRes.data?.updated_at),
      parseTs(ihRes.data?.updated_at),
      parseTs(faRes.data?.updated_at),
      householdMax,
      parseTs(riskRes.data?.created_at),
    ]);

    const stale =
      planUpdatedAt != null &&
      dataChangedAt != null &&
      dataChangedAt.getTime() > planUpdatedAt.getTime();

    return NextResponse.json({
      stale,
      generating: false,
      dataChangedAt: dataChangedAt?.toISOString() ?? null,
      planUpdatedAt: planUpdatedAt?.toISOString() ?? null,
      planStatus: planRow.status,
    });
  } catch (error) {
    captureAPIError(error, { route: "plan/staleness" });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
