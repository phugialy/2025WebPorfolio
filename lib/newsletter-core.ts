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

export type ArticleLink = { title: string; url: string; summary?: string };

// ---------------------------------------------------------------------------
// Shared email layout. Rules it follows (email clients are far less forgiving
// than browsers): one 600px column built from tables, every style inline,
// system fonts, a hidden preheader, a table-based button that renders in
// Outlook, a plain-text twin of every message, and a small dark-mode block
// for clients that support it (Apple Mail and others; ignored elsewhere).
// ---------------------------------------------------------------------------

const BRAND_YELLOW = "#FFC400";
const INK = "#111111";
const MUTED = "#5b5d63";
const RULE = "#e6e6e1";
const FONT = "Arial,Helvetica,sans-serif";

export function truncate(value: string, max: number): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:-]+$/, "") + "…";
}

function preheaderHtml(text: string) {
  // The padding of zero-width characters stops mail apps from pulling body text into the preview.
  const pad = "&#847;&zwnj;&nbsp;".repeat(40);
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#ffffff;">${escapeHtml(text)}${pad}</div>`;
}

function buttonHtml(url: string, label: string) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;"><tr><td align="center" bgcolor="${BRAND_YELLOW}" style="border-radius:6px;background:${BRAND_YELLOW};"><a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:16px;font-weight:bold;line-height:20px;color:${INK};text-decoration:none;border-radius:6px;">${escapeHtml(label)}</a></td></tr></table>`;
}

function layout(opts: { preheader: string; title: string; bodyHtml: string; footerHtml: string }) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(opts.title)}</title>
<style>
@media (prefers-color-scheme: dark) {
  .bg { background:#0d0e10 !important; }
  .card { background:#17181c !important; }
  .ink { color:#f1f1ee !important; }
  .muted { color:#a7a9b0 !important; }
  .rule { border-color:#2b2d33 !important; }
  .link { color:${BRAND_YELLOW} !important; }
}
@media only screen and (max-width:620px) { .pad { padding-left:20px !important; padding-right:20px !important; } }
</style></head>
<body class="bg" style="margin:0;padding:0;background:#f4f4f1;">
${preheaderHtml(opts.preheader)}
<table role="presentation" class="bg" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f4f1;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" class="card" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;">
<tr><td style="height:5px;line-height:5px;font-size:5px;background:${BRAND_YELLOW};">&nbsp;</td></tr>
<tr><td class="pad" style="padding:24px 32px 0 32px;font-family:${FONT};"><span class="ink" style="font-size:18px;font-weight:bold;letter-spacing:0.2px;color:${INK};">Phugialy</span></td></tr>
<tr><td class="pad ink" style="padding:20px 32px 8px 32px;font-family:${FONT};font-size:16px;line-height:1.6;color:${INK};">${opts.bodyHtml}</td></tr>
<tr><td class="pad muted" style="padding:20px 32px 28px 32px;font-family:${FONT};font-size:12px;line-height:1.6;color:${MUTED};"><div class="rule" style="border-top:1px solid ${RULE};padding-top:16px;">${opts.footerHtml}</div></td></tr>
</table></td></tr></table></body></html>`;
}

function footerLines(opts: { address?: string; unsubscribeUrl?: string; privacyUrl: string; reason: string }) {
  const html: string[] = [`${escapeHtml(opts.reason)}<br>`];
  const text: string[] = [opts.reason];
  if (opts.unsubscribeUrl) {
    html.push(`<a class="link" href="${escapeHtml(opts.unsubscribeUrl)}" style="color:${MUTED};">Unsubscribe</a> &middot; `);
    text.push(`Unsubscribe: ${opts.unsubscribeUrl}`);
  }
  html.push(`<a class="link" href="${escapeHtml(opts.privacyUrl)}" style="color:${MUTED};">Privacy Policy</a>`);
  text.push(`Privacy Policy: ${opts.privacyUrl}`);
  if (opts.address) {
    html.push(`<br>Phugialy &middot; ${escapeHtml(opts.address)}`);
    text.push(`Phugialy, ${opts.address}`);
  }
  return { html: html.join(""), text: text.join("\n") };
}

function p(html: string, extra = "") {
  return `<p style="margin:0 0 14px 0;${extra}">${html}</p>`;
}

function articleRows(articles: ArticleLink[]) {
  return articles
    .map((a) => {
      const summary = a.summary ? truncate(a.summary, 170) : "";
      return `<tr><td class="rule" style="padding:16px 0;border-top:1px solid ${RULE};font-family:${FONT};">
<a class="link ink" href="${escapeHtml(a.url)}" target="_blank" style="font-size:17px;line-height:1.35;font-weight:bold;color:${INK};text-decoration:none;">${escapeHtml(a.title)}</a>
${summary ? `<p class="muted" style="margin:6px 0 8px 0;font-size:14px;line-height:1.55;color:${MUTED};">${escapeHtml(summary)}</p>` : `<div style="height:6px;"></div>`}
<a class="link" href="${escapeHtml(a.url)}" target="_blank" style="font-size:14px;font-weight:bold;color:#8a6a00;text-decoration:underline;">Read the note &rarr;</a>
</td></tr>`;
    })
    .join("");
}

function articleListTable(articles: ArticleLink[]) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${articleRows(articles)}</table>`;
}

function articleListText(articles: ArticleLink[]) {
  return articles
    .map((a) => `${a.title}\n${a.summary ? truncate(a.summary, 170) + "\n" : ""}${a.url}`)
    .join("\n\n");
}

export function buildConfirmationEmail(opts: {
  confirmUrl: string;
  privacyUrl: string;
  address?: string;
}): EmailParts {
  const footer = footerLines({
    address: opts.address,
    privacyUrl: opts.privacyUrl,
    reason: "You're getting this one-time message because this email address was entered on phugialy.com.",
  });
  const body = [
    `<h1 class="ink" style="margin:0 0 14px 0;font-size:24px;line-height:1.25;color:${INK};">One click to confirm.</h1>`,
    p("Someone (hopefully you) asked to get the Phugialy daily email at this address: one email a day with the top AI stories we published."),
    buttonHtml(opts.confirmUrl, "Yes, send me the daily email"),
    p(
      `Button not working? Copy this link into your browser:<br><a class="link" href="${escapeHtml(opts.confirmUrl)}" style="color:#8a6a00;word-break:break-all;">${escapeHtml(opts.confirmUrl)}</a>`,
      `font-size:13px;line-height:1.55;`
    ),
    p("The link works for 7 days. If you didn't ask for this, just ignore this message. You won't be subscribed and we won't email you again."),
  ].join("");
  const html = layout({
    preheader: "One click and you're on the list. The link works for 7 days.",
    title: "Confirm your Phugialy daily email",
    bodyHtml: body,
    footerHtml: footer.html,
  });
  const text = [
    "One click to confirm.",
    "",
    "Someone (hopefully you) asked to get the Phugialy daily email at this address: one email a day with the top AI stories we published.",
    "",
    `Yes, send me the daily email: ${opts.confirmUrl}`,
    "",
    "The link works for 7 days. If you didn't ask for this, just ignore this message. You won't be subscribed and we won't email you again.",
    "",
    footer.text,
  ].join("\n");
  return { subject: "Confirm your Phugialy daily email", html, text };
}

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
    reason: "You're getting this because you subscribed to the Phugialy daily email at phugialy.com.",
  });
  const articles = opts.articles.slice(0, 3);
  const body = [
    `<h1 class="ink" style="margin:0 0 14px 0;font-size:24px;line-height:1.25;color:${INK};">You're in. Here's what to expect.</h1>`,
    p("Thanks for subscribing. Once a day you'll get a short email with the top AI stories from Phugialy. No sales pitches, and no spam."),
    articles.length > 0
      ? `<p class="ink" style="margin:18px 0 4px 0;font-size:13px;font-weight:bold;letter-spacing:0.8px;text-transform:uppercase;color:${INK};">To start, a few of our recent notes</p>${articleListTable(articles)}`
      : "",
    p(
      "Just reply to this email if there's a topic you'd like us to cover. We read every reply.",
      "margin-top:18px;"
    ),
    p(
      `<span class="muted">Tip: add phu@phugialy.com to your contacts so these emails land in your inbox, not your spam folder.</span>`,
      `font-size:13px;line-height:1.55;color:${MUTED};`
    ),
  ].join("");
  const html = layout({
    preheader: "One email a day, no sales pitches. Here's what to expect.",
    title: "You're in",
    bodyHtml: body,
    footerHtml: footer.html,
  });
  const text = [
    "You're in. Here's what to expect.",
    "",
    "Thanks for subscribing. Once a day you'll get a short email with the top AI stories from Phugialy. No sales pitches, and no spam.",
    "",
    ...(articles.length > 0 ? ["To start, a few of our recent notes:", "", articleListText(articles), ""] : []),
    "Just reply to this email if there's a topic you'd like us to cover. We read every reply.",
    "",
    "Tip: add phu@phugialy.com to your contacts so these emails land in your inbox, not your spam folder.",
    "",
    footer.text,
  ].join("\n");
  return { subject: "You're in: here's what to expect", html, text };
}

// The daily digest. Pure and ready, but it is not sent by anything yet: the
// scheduled send is a later, separately approved step.
export function buildDigestSubject(items: ArticleLink[]): string {
  if (items.length === 0) return "Phugialy daily";
  const lead = truncate(items[0].title, 58);
  return items.length > 1 ? `${lead} (+${items.length - 1} more)` : lead;
}

export function buildDigestEmail(opts: {
  dateLabel: string;
  items: ArticleLink[];
  unsubscribeUrl: string;
  privacyUrl: string;
  address?: string;
}): EmailParts {
  const items = opts.items.slice(0, 5);
  const footer = footerLines({
    address: opts.address,
    unsubscribeUrl: opts.unsubscribeUrl,
    privacyUrl: opts.privacyUrl,
    reason: "You're getting this because you subscribed to the Phugialy daily email at phugialy.com.",
  });
  const lead = items[0];
  const rest = items.slice(1);
  const body = [
    `<p class="muted" style="margin:0 0 6px 0;font-size:13px;letter-spacing:0.8px;text-transform:uppercase;color:${MUTED};">${escapeHtml(opts.dateLabel)}</p>`,
    `<h1 class="ink" style="margin:0 0 6px 0;font-size:24px;line-height:1.25;color:${INK};">The top AI stories today</h1>`,
    lead
      ? `<p class="ink" style="margin:18px 0 4px 0;font-size:13px;font-weight:bold;letter-spacing:0.8px;text-transform:uppercase;color:${INK};">Top story</p>${articleListTable([lead])}`
      : "",
    rest.length > 0
      ? `<p class="ink" style="margin:14px 0 4px 0;font-size:13px;font-weight:bold;letter-spacing:0.8px;text-transform:uppercase;color:${INK};">Also today</p>${articleListTable(rest)}`
      : "",
    p("Hit reply and tell us what you'd like covered next.", "margin-top:18px;"),
  ].join("");
  const html = layout({
    preheader: lead?.summary ? truncate(lead.summary, 110) : buildDigestSubject(items),
    title: buildDigestSubject(items),
    bodyHtml: body,
    footerHtml: footer.html,
  });
  const text = [
    `${opts.dateLabel}`,
    "The top AI stories today",
    "",
    ...(lead ? ["TOP STORY", "", articleListText([lead]), ""] : []),
    ...(rest.length > 0 ? ["ALSO TODAY", "", articleListText(rest), ""] : []),
    "Hit reply and tell us what you'd like covered next.",
    "",
    footer.text,
  ].join("\n");
  return { subject: buildDigestSubject(items), html, text };
}
