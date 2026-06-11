import { createHash, randomBytes } from "crypto";

/**
 * X (Twitter) OAuth 2.0 PKCE helpers for the "link your account" flow.
 * Requires X_OAUTH_CLIENT_ID / X_OAUTH_CLIENT_SECRET from an X developer
 * app with OAuth 2.0 enabled and callback set to
 * `${NEXT_PUBLIC_APP_URL}/api/picks/twitter/callback`.
 */

const AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";
const TOKEN_URL = "https://api.x.com/2/oauth2/token";
const API_BASE = "https://api.x.com/2";

export const X_OAUTH_SCOPES = [
  "tweet.read",
  "users.read",
  "follows.read",
  "offline.access",
];

export function isXOAuthConfigured(): boolean {
  return Boolean(
    process.env.X_OAUTH_CLIENT_ID?.trim() &&
      process.env.X_OAUTH_CLIENT_SECRET?.trim(),
  );
}

export function getRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/picks/twitter/callback`;
}

export function generatePkce(): {
  state: string;
  codeVerifier: string;
  codeChallenge: string;
} {
  const state = randomBytes(16).toString("hex");
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { state, codeVerifier, codeChallenge };
}

export function buildAuthorizeUrl(state: string, codeChallenge: string): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.X_OAUTH_CLIENT_ID!);
  url.searchParams.set("redirect_uri", getRedirectUri());
  url.searchParams.set("scope", X_OAUTH_SCOPES.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export interface XTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

function basicAuthHeader(): string {
  const creds = Buffer.from(
    `${process.env.X_OAUTH_CLIENT_ID}:${process.env.X_OAUTH_CLIENT_SECRET}`,
  ).toString("base64");
  return `Basic ${creds}`;
}

export async function exchangeCode(
  code: string,
  codeVerifier: string,
): Promise<XTokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getRedirectUri(),
      code_verifier: codeVerifier,
    }),
  });
  if (!res.ok) {
    throw new Error(`X token exchange failed ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function refreshToken(
  refreshTokenValue: string,
): Promise<XTokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshTokenValue,
    }),
  });
  if (!res.ok) {
    throw new Error(`X token refresh failed ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export interface XUser {
  id: string;
  username: string;
  name: string;
  description?: string;
  public_metrics?: { followers_count: number };
}

export async function fetchMe(accessToken: string): Promise<XUser> {
  const res = await fetch(`${API_BASE}/users/me?user.fields=public_metrics`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`X /users/me failed ${res.status}`);
  }
  const body = await res.json();
  return body.data as XUser;
}

/** Pages through accounts the connected user follows (max ~3 pages). */
export async function fetchFollowing(
  accessToken: string,
  xUserId: string,
): Promise<XUser[]> {
  const users: XUser[] = [];
  let paginationToken: string | undefined;

  for (let page = 0; page < 3; page++) {
    const url = new URL(`${API_BASE}/users/${xUserId}/following`);
    url.searchParams.set("max_results", "1000");
    url.searchParams.set("user.fields", "description,public_metrics");
    if (paginationToken) {
      url.searchParams.set("pagination_token", paginationToken);
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`X /following failed ${res.status}: ${await res.text()}`);
    }
    const body = await res.json();
    users.push(...((body.data || []) as XUser[]));
    paginationToken = body.meta?.next_token;
    if (!paginationToken) break;
  }

  return users;
}
