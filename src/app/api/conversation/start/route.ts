import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionId = randomUUID();

  const { error } = await supabase.from("conversation_sessions").insert({
    id: sessionId,
    user_id: user.id,
    type: "fact-find",
    status: "active",
    created_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to create conversation session" },
      { status: 500 },
    );
  }

  return NextResponse.json({ sessionId });
}
