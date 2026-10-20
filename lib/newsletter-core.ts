// Pure newsletter helpers: no database, no network, no "@/" imports, so they
// run under Vitest without any setup. Server logic is in lib/newsletter.ts.

export const NEWSLETTER_FROM = "Phu Gia Ly <phu@phugialy.com>";
export const NEWSLETTER_REPLY_TO = "phu@phugialy.com";

export const SOURCES = ["bar", "end-of-article", "footer", "unsubscribe-page"] as const;
export type SubscribeSource = (typeof SOURCES)[number];

const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

// Returns the lowercased address, or null if it is not a plausible email.
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length < 3 || email.length > 254) return null;
  if (!EMAIL_PATTERN.test(email)) return null;
  const [local, domain] = email.split("@");
  if (local.length > 64 || domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) {
    return null;
  }
  return email;
}

export function sanitizeSource(raw: unknown): SubscribeSource {
  return typeof raw === "string" && (SOURCES as readonly string[]).includes(raw)
    ? (raw as SubscribeSource)
    : "footer";
}

// Campaign tags and page slugs come from the browser, so cap and clean them
// before they are stored. Printable ASCII only; null when empty.
export function sanitizeTag(raw: unknown, max = 100): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/[^\x20-\x7E]/g, "").trim().slice(0, max);
  return cleaned.length > 0 ? cleaned : null;
}

export function sanitizeSlug(raw: unknown): string | null {
  const value = sanitizeTag(raw, 200);
  if (!value) return null;
  return value.split("?")[0].split("#")[0] || null;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// How long a confirmation link stays valid.
export const CONFIRM_TTL_MS = 7 * 24 * 60 * 60 * 1000;
// Do not re-send a confirmation to the same address more often than this.
export const RESEND_COOLDOWN_MS = 10 * 60 * 1000;
// Circuit breaker: if this many new unconfirmed signups arrive in an hour,
// stop sending confirmation emails (someone is likely bombing the form).
export const MAX_PENDING_PER_HOUR = 50;

export function isConfirmExpired(confirmSentAt: string | null, now = Date.now()): boolean {
  if (!confirmSentAt) return false;
  return now - new Date(confirmSentAt).getTime() > CONFIRM_TTL_MS;
}

export function canResendConfirmation(confirmSentAt: string | null, now = Date.now()): boolean {
  if (!confirmSentAt) return true;
  return now - new Date(confirmSentAt).getTime() >= RESEND_COOLDOWN_MS;
}

export function buildUnsubscribeHeaders(unsubscribeUrl: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>, <mailto:${NEWSLETTER_REPLY_TO}?subject=unsubscribe>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

type EmailParts = { subject: string; html: string; text: string };

const shell = (inner: string, footerHtml: string) => `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f6f4;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f6f4;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:8px;">
<tr><td style="padding:28px 28px 8px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#111111;">${inner}</td></tr>
<tr><td style="padding:16px 28px 28px 28px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#666666;border-top:1px solid #eeeeee;">${footerHtml}</td></tr>
</table></td></tr></table></body></html>`;

function footerLines(opts: { address?: string; unsubscribeUrl?: string; privacyUrl: string }) {
  const html: string[] = [];
  const text: string[] = [];
  if (opts.unsubscribeUrl) {
    html.push(
      `<a href="${escapeHtml(opts.unsubscribeUrl)}" style="color:#666666;">Unsubscribe</a> &middot; `
    );
    text.push(`Unsubscribe: ${opts.unsubscribeUrl}`);
  }
  html.push(`<a href="${escapeHtml(opts.privacyUrl)}" style="color:#666666;">Privacy Policy</a>`);
  text.push(`Privacy Policy: ${opts.privacyUrl}`);
  if (opts.address) {
    html.push(`<br>Phugialy &middot; ${escapeHtml(opts.address)}`);
    text.push(`Phugialy, ${opts.address}`);
  }
  return { html: html.join(""), text: text.join("\n") };
}

export function buildConfirmationEmail(opts: {
  confirmUrl: string;
  privacyUrl: string;
  address?: string;
}): EmailParts {
  const footer = footerLines({ address: opts.address, privacyUrl: opts.privacyUrl });
  const button = `<p style="margin:24px 0;"><a href="${escapeHtml(opts.confirmUrl)}" style="background:#111111;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;display:inline-block;font-weight:bold;">Yes, send me the daily email</a></p>`;
  const html = shell(
    `<p style="margin:0 0 12px 0;">Hi,</p>
<p style="margin:0 0 12px 0;">Someone (hopefully you) asked to get the Phugialy daily email at this address. It's one email a day with the top AI stories we published.</p>
${button}
<p style="margin:0 0 12px 0;">If you didn't ask for this, ignore this message. You won't be subscribed and we won't email you again.</p>`,
    footer.html
  );
  const text = [
    "Hi,",
    "",
    "Someone (hopefully you) asked to get the Phugialy daily email at this address. It's one email a day with the top AI stories we published.",
    "",
    `Yes, send me the daily email: ${opts.confirmUrl}`,
    "",
    "If you didn't ask for this, ignore this message. You won't be subscribed and we won't email you again.",
    "",
    footer.text,
  ].join("\n");
  return { subject: "Confirm your Phugialy daily email", html, text };
}

export type ArticleLink = { title: string; url: string };

export function buildWelcomeEmail(opts: {
  articles: ArticleLink[];
  unsubscribeUrl: string;
  privacyUrl: string;
  address?: string;
}): EmailParts {
  const footer = footerLines({
    address: opts.address,
    unsubscribeUrl: opts.unsubscribeUrl,
    privacyUrl: opts.privacyUrl,
  });
  const list = opts.articles
    .map(
      (a) =>
        `<li style="margin:0 0 8px 0;"><a href="${escapeHtml(a.url)}" style="color:#111111;">${escapeHtml(a.title)}</a></li>`
    )
    .join("");
  const html = shell(
    `<p style="margin:0 0 12px 0;">Thanks for subscribing. Here's what you'll get: one email a day with the latest stories from Phugialy. No sales pitches, and no spam.</p>
${list ? `<p style="margin:0 0 8px 0;">To start, a few of our recent notes:</p><ul style="margin:0 0 16px 20px;padding:0;">${list}</ul>` : ""}
<p style="margin:0 0 12px 0;">Just reply to this email if there's a topic you'd like us to cover. We read every reply.</p>`,
    footer.html
  );
  const text = [
    "Thanks for subscribing. Here's what you'll get: one email a day with the latest stories from Phugialy. No sales pitches, and no spam.",
    "",
    ...(opts.articles.length > 0
      ? ["To start, a few of our recent notes:", ...opts.articles.map((a) => `- ${a.title}: ${a.url}`), ""]
      : []),
    "Just reply to this email if there's a topic you'd like us to cover. We read every reply.",
    "",
    footer.text,
  ].join("\n");
  return { subject: "You're in: here's what to expect", html, text };
}
