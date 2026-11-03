import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { captureAPIError } from "@/lib/sentry";
import { deleteAccountData } from "@/lib/account/delete-account";

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json().catch(() => null)) as { confirm?: unknown } | null;
    if (body?.confirm !== "DELETE") {
      return NextResponse.json({ error: "Type DELETE to confirm." }, { status: 400 });
    }

    await deleteAccountData(user.id, user.email ?? null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    captureAPIError(error, { route: "user/data" });
    return NextResponse.json({ error: "Could not delete your data. Try again." }, { status: 500 });
  }
}
