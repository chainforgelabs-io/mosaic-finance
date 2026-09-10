import { NextResponse } from "next/server";
import { getFoundingStatus } from "@/lib/founding";

export async function GET() {
  const status = await getFoundingStatus();
  return NextResponse.json(status);
}
