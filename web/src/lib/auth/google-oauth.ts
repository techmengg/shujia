import crypto from "node:crypto";

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

const stateCookieName = "google_oauth_state";

function getEnvConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return { clientId, clientSecret };
}

export function isGoogleOAuthConfigured() {
  const { clientId, clientSecret } = getEnvConfig();
  return Boolean(clientId && clientSecret);
}

export function getGoogleRedirectUri(request: Request) {
  const base =
    process.env.APP_BASE_URL?.replace(/\/+$/, "") ||
    new URL(request.url).origin;
  return `${base}/api/auth/google/callback`;
}

export function buildGoogleAuthorizationUrl(state: string, redirectUri: string) {
  const { clientId } = getEnvConfig();
  if (!clientId) {
    throw new Error("Google OAuth attempted without configuration.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

export function generateStateToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function getStateCookieName() {
  return stateCookieName;
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  id_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type: "Bearer";
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = getEnvConfig();
  if (!clientId || !clientSecret) {
    throw new Error("Missing Google OAuth configuration.");
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to exchange Google auth code. Status ${response.status}. ${errorText}`,
    );
  }

  return (await response.json()) as GoogleTokenResponse;
}

export type GoogleUserInfo = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

export async function fetchGoogleUserInfo(
  accessToken: string,
): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to fetch Google user info. Status ${response.status}. ${errorText}`,
    );
  }

  return (await response.json()) as GoogleUserInfo;
}
