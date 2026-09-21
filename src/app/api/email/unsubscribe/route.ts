import { NextRequest, NextResponse } from "next/server";
import {
  applyUnsubscribe,
  verifyUnsubscribeToken,
} from "@/lib/email/unsubscribe";
import { captureAPIError } from "@/lib/sentry";

async function runUnsubscribe(token: string | null) {
  if (!token) {
    return { ok: false as const, error: "missing_token" };
  }
  const payload = verifyUnsubscribeToken(token);
  if (!payload) {
    return { ok: false as const, error: "invalid_token" };
  }
  return applyUnsubscribe(payload.email, payload.list);
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  try {
    const result = await runUnsubscribe(token);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, list: result.list });
  } catch (error) {
    captureAPIError(error, { route: "email/unsubscribe" });
    return NextResponse.json({ error: "unsubscribe_failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const token =
    request.nextUrl.searchParams.get("token") ??
    (await request.formData().then((f) => String(f.get("token") ?? "")).catch(() => ""));
  try {
    const result = await runUnsubscribe(token || null);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, list: result.list });
  } catch (error) {
    captureAPIError(error, { route: "email/unsubscribe" });
    return NextResponse.json({ error: "unsubscribe_failed" }, { status: 500 });
  }
}
