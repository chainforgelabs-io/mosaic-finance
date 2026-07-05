import { NextRequest, NextResponse } from "next/server";

/**
 * Bearer auth for the machine-readable export API. Two independent tokens
 * so consumers can be revoked separately:
 * - EXPORT_API_TOKEN: original consumer (HELM trading bot)
 * - RESEARCH_EXPORT_TOKEN: external systematic-trading research project
 */

export function authorizeExport(request: NextRequest): NextResponse | null {
  const tokens = [
    process.env.EXPORT_API_TOKEN?.trim(),
    process.env.RESEARCH_EXPORT_TOKEN?.trim(),
  ].filter((t): t is string => Boolean(t));

  if (tokens.length === 0) {
    return NextResponse.json(
      { error: "Export API not configured." },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization");
  if (!tokens.some((t) => auth === `Bearer ${t}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Opaque keyset cursor: base64 of JSON tuple. */
export function encodeCursor(parts: (string | number)[]): string {
  return Buffer.from(JSON.stringify(parts)).toString("base64url");
}

export function decodeCursor(
  cursor: string | null,
  expectedLength: number,
): (string | number)[] | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    );
    if (Array.isArray(parsed) && parsed.length === expectedLength) {
      return parsed;
    }
  } catch {
    // fall through
  }
  return null;
}
