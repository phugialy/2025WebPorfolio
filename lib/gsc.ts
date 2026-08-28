import { createSign } from "crypto";

// Service-account, not OAuth: Search Console explicitly supports adding a
// service account as a read-only ("Restricted") property user, so this
// avoids the refresh-token-expiry risk an unattended daily cron would face
// if the OAuth consent screen is still in "Testing" mode. No new dependency
// -- signs the JWT with Node's built-in crypto, same lightweight-fetch style
// as the existing Calendar integration in lib/scheduling.ts.
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Reports the shape of the configured credentials without ever exposing
 * their actual value -- lengths, presence of expected markers, newline
 * style. Safe to return in an API response for diagnosing a malformed
 * private key (a common failure mode when pasting a multi-line PEM key
 * into an env var UI) without needing to see the secret itself.
 */
export function diagnoseGscCredentialShape() {
  const clientEmail = process.env.GSC_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GSC_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!rawKey) {
    return { emailPresent: Boolean(clientEmail), keyPresent: false };
  }

  const normalizedKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;

  return {
    emailPresent: Boolean(clientEmail),
    emailLooksValid: Boolean(clientEmail && /^[^@]+@[^@]+\.iam\.gserviceaccount\.com$/.test(clientEmail)),
    keyPresent: true,
    keyLength: rawKey.length,
    keyHasEscapedNewlines: rawKey.includes("\\n"),
    keyHasRealNewlines: rawKey.includes("\n"),
    normalizedKeyLineCount: normalizedKey.split("\n").length,
    startsWithBeginMarker: normalizedKey.trim().startsWith("-----BEGIN PRIVATE KEY-----"),
    endsWithEndMarker: normalizedKey.trim().endsWith("-----END PRIVATE KEY-----"),
    containsCarriageReturn: rawKey.includes("\r"),
    wrappedInExtraQuotes: rawKey.trim().startsWith('"') && rawKey.trim().endsWith('"'),
  };
}

async function getAccessToken(): Promise<string> {
  const clientEmail = process.env.GSC_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GSC_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!clientEmail || !rawKey) {
    throw new Error("GSC service account credentials are not configured");
  }

  // Vercel's env var UI can store literal "\n" sequences instead of real
  // newlines depending on how a multi-line PEM key was pasted -- normalize
  // either way.
  const privateKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: clientEmail,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const signatureInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claimSet))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signatureInput);
  const signature = base64url(signer.sign(privateKey));
  const jwt = `${signatureInput}.${signature}`;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = (await response.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!data.access_token) {
    throw new Error(
      `Failed to get GSC access token: ${data.error || response.status} ${data.error_description || ""}`
    );
  }
  return data.access_token;
}

export type GscRow = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export async function querySearchAnalytics(params: {
  siteUrl: string;
  startDate: string;
  endDate: string;
  dimensions: Array<"query" | "page" | "date">;
  rowLimit?: number;
}): Promise<GscRow[]> {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(params.siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: params.startDate,
        endDate: params.endDate,
        dimensions: params.dimensions,
        rowLimit: params.rowLimit ?? 25,
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GSC API error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as { rows?: GscRow[] };
  return data.rows || [];
}
