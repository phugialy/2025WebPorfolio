import {
  MAX_PENDING_PER_HOUR,
  NEWSLETTER_FROM,
  NEWSLETTER_REPLY_TO,
  buildConfirmationEmail,
  buildUnsubscribeHeaders,
  buildWelcomeEmail,
  canResendConfirmation,
  isConfirmExpired,
  normalizeEmail,
  sanitizeSlug,
  sanitizeSource,
  sanitizeTag,
  type ArticleLink,
  type SubscribeSource,
} from "./newsletter-core";

// The signup / confirm / unsubscribe rules, with the database and the mailer
// passed in so every branch can be tested without touching either.

export type SubscriberStatus = "pending" | "active" | "unsubscribed" | "bounced";

export type Subscriber = {
  id: string;
  email: string;
  status: SubscriberStatus;
  confirm_token: string;
  unsubscribe_token: string;
  confirm_sent_at: string | null;
};

export type NewSubscriber = {
  email: string;
  source: SubscribeSource;
  source_slug: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
};

export interface SubscriberStore {
  findByEmail(email: string): Promise<Subscriber | null>;
  findByConfirmToken(token: string): Promise<Subscriber | null>;
  findByUnsubscribeToken(token: string): Promise<Subscriber | null>;
  // Must throw an error with code "duplicate" when the email already exists.
  insert(row: NewSubscriber): Promise<Subscriber>;
  update(id: string, patch: Partial<Subscriber> & { confirmed_at?: string; unsubscribed_at?: string | null }): Promise<void>;
  countPendingSince(isoTime: string): Promise<number>;
}

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  from: string;
  replyTo: string;
  headers?: Record<string, string>;
  idempotencyKey?: string;
};

export type NewsletterDeps = {
  store: SubscriberStore;
  send: (email: OutgoingEmail) => Promise<void>;
  recentArticles: () => Promise<ArticleLink[]>;
  siteUrl: string;
  mailingAddress?: string;
  now?: () => number;
  newToken?: () => string;
  log?: (message: string, detail?: unknown) => void;
};

export type SubscribeInput = {
  email: unknown;
  source?: unknown;
  slug?: unknown;
  utmSource?: unknown;
  utmMedium?: unknown;
  utmCampaign?: unknown;
};

export type SubscribeResult = "ok" | "invalid_email" | "send_failed";
export type ConfirmResult = "confirmed" | "already" | "expired" | "invalid";
export type UnsubscribeResult = "unsubscribed" | "invalid";

const randomToken = () => crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

export function createNewsletterService(deps: NewsletterDeps) {
  const now = deps.now ?? Date.now;
  const newToken = deps.newToken ?? randomToken;
  const log = deps.log ?? ((message: string, detail?: unknown) => console.error(message, detail));
  const base = deps.siteUrl.replace(/\/$/, "");
  const privacyUrl = `${base}/privacy`;

  const confirmUrl = (token: string) => `${base}/newsletter/confirm?token=${token}`;
  const unsubscribePageUrl = (token: string) => `${base}/newsletter/unsubscribe?token=${token}`;
  const unsubscribePostUrl = (token: string) => `${base}/api/newsletter/unsubscribe?token=${token}`;

  async function sendConfirmation(subscriber: Subscriber): Promise<boolean> {
    const mail = buildConfirmationEmail({
      confirmUrl: confirmUrl(subscriber.confirm_token),
      privacyUrl,
      address: deps.mailingAddress,
    });
    try {
      await deps.send({
        to: subscriber.email,
        from: NEWSLETTER_FROM,
        replyTo: NEWSLETTER_REPLY_TO,
        ...mail,
      });
      await deps.store.update(subscriber.id, { confirm_sent_at: new Date(now()).toISOString() });
      return true;
    } catch (error) {
      log("Newsletter confirmation email failed", error);
      return false;
    }
  }

  async function subscribe(input: SubscribeInput): Promise<SubscribeResult> {
    const email = normalizeEmail(input.email);
    if (!email) return "invalid_email";

    const attribution: NewSubscriber = {
      email,
      source: sanitizeSource(input.source) as SubscribeSource,
      source_slug: sanitizeSlug(input.slug),
      utm_source: sanitizeTag(input.utmSource),
      utm_medium: sanitizeTag(input.utmMedium),
      utm_campaign: sanitizeTag(input.utmCampaign),
    };

    const existing = await deps.store.findByEmail(email);

    // Already confirmed, or an address that bounced: say nothing different, send nothing.
    if (existing && (existing.status === "active" || existing.status === "bounced")) {
      return "ok";
    }

    if (existing && existing.status === "pending") {
      if (!canResendConfirmation(existing.confirm_sent_at, now())) return "ok";
      return (await sendConfirmation(existing)) ? "ok" : "send_failed";
    }

    if (existing && existing.status === "unsubscribed") {
      // Re-subscribing: new tokens so any old link stops working, then ask again.
      const hourAgo = new Date(now() - 60 * 60 * 1000).toISOString();
      if ((await deps.store.countPendingSince(hourAgo)) >= MAX_PENDING_PER_HOUR) return "ok";
      const refreshed: Subscriber = {
        ...existing,
        status: "pending",
        confirm_token: newToken(),
        unsubscribe_token: newToken(),
        confirm_sent_at: null,
      };
      await deps.store.update(existing.id, {
        status: "pending",
        confirm_token: refreshed.confirm_token,
        unsubscribe_token: refreshed.unsubscribe_token,
        confirm_sent_at: null,
        unsubscribed_at: null,
      });
      return (await sendConfirmation(refreshed)) ? "ok" : "send_failed";
    }

    // New address. Circuit breaker against someone bombing the form with other people's emails.
    const hourAgo = new Date(now() - 60 * 60 * 1000).toISOString();
    if ((await deps.store.countPendingSince(hourAgo)) >= MAX_PENDING_PER_HOUR) {
      log("Newsletter signup circuit breaker open: skipping confirmation email");
      return "ok";
    }

    let created: Subscriber;
    try {
      created = await deps.store.insert(attribution);
    } catch (error) {
      if ((error as { code?: string })?.code === "duplicate") return "ok"; // lost a race: same address
      throw error;
    }
    return (await sendConfirmation(created)) ? "ok" : "send_failed";
  }

  async function confirm(rawToken: unknown): Promise<ConfirmResult> {
    const token = typeof rawToken === "string" ? rawToken.trim() : "";
    if (!/^[0-9a-f]{64}$/i.test(token)) return "invalid";

    const subscriber = await deps.store.findByConfirmToken(token);
    if (!subscriber) return "invalid";
    if (subscriber.status === "active") return "already";
    if (subscriber.status !== "pending") return "invalid";
    if (isConfirmExpired(subscriber.confirm_sent_at, now())) return "expired";

    await deps.store.update(subscriber.id, {
      status: "active",
      confirmed_at: new Date(now()).toISOString(),
    });

    // The welcome email is a courtesy: a failure here must not undo the confirmation.
    try {
      const articles = (await deps.recentArticles()).slice(0, 3);
      const mail = buildWelcomeEmail({
        articles,
        unsubscribeUrl: unsubscribePageUrl(subscriber.unsubscribe_token),
        privacyUrl,
        address: deps.mailingAddress,
      });
      await deps.send({
        to: subscriber.email,
        from: NEWSLETTER_FROM,
        replyTo: NEWSLETTER_REPLY_TO,
        headers: buildUnsubscribeHeaders(unsubscribePostUrl(subscriber.unsubscribe_token)),
        idempotencyKey: `welcome-${subscriber.id}`,
        ...mail,
      });
    } catch (error) {
      log("Newsletter welcome email failed", error);
    }
    return "confirmed";
  }

  async function unsubscribe(rawToken: unknown): Promise<UnsubscribeResult> {
    const token = typeof rawToken === "string" ? rawToken.trim() : "";
    if (!/^[0-9a-f]{64}$/i.test(token)) return "invalid";

    const subscriber = await deps.store.findByUnsubscribeToken(token);
    if (!subscriber) return "invalid";
    if (subscriber.status !== "unsubscribed") {
      await deps.store.update(subscriber.id, {
        status: "unsubscribed",
        unsubscribed_at: new Date(now()).toISOString(),
      });
    }
    return "unsubscribed";
  }

  return { subscribe, confirm, unsubscribe };
}
