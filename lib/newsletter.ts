import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sendResendEmail } from "@/lib/email";
import { getPostSummaries } from "@/lib/articles";
import {
  createNewsletterService,
  type NewSubscriber,
  type Subscriber,
  type SubscriberStore,
} from "@/lib/newsletter-service";

// Wires the newsletter rules to the real database (service-role client; the
// tables have no public policies) and to Resend.

const COLUMNS = "id, email, status, confirm_token, unsubscribe_token, confirm_sent_at";

function adminClient() {
  const client = createSupabaseAdminClient();
  if (!client) throw new Error("Supabase write config is missing");
  return client;
}

const supabaseStore: SubscriberStore = {
  async findByEmail(email) {
    const { data, error } = await adminClient()
      .from("email_subscribers")
      .select(COLUMNS)
      .eq("email", email)
      .maybeSingle();
    if (error) throw error;
    return (data as Subscriber | null) ?? null;
  },
  async findByConfirmToken(token) {
    const { data, error } = await adminClient()
      .from("email_subscribers")
      .select(COLUMNS)
      .eq("confirm_token", token)
      .maybeSingle();
    if (error) throw error;
    return (data as Subscriber | null) ?? null;
  },
  async findByUnsubscribeToken(token) {
    const { data, error } = await adminClient()
      .from("email_subscribers")
      .select(COLUMNS)
      .eq("unsubscribe_token", token)
      .maybeSingle();
    if (error) throw error;
    return (data as Subscriber | null) ?? null;
  },
  async insert(row: NewSubscriber) {
    const { data, error } = await adminClient()
      .from("email_subscribers")
      .insert(row)
      .select(COLUMNS)
      .single();
    if (error) {
      throw error.code === "23505" ? Object.assign(new Error("duplicate"), { code: "duplicate" }) : error;
    }
    return data as Subscriber;
  },
  async update(id, patch) {
    const { error } = await adminClient()
      .from("email_subscribers")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },
  async countPendingSince(isoTime) {
    const { count, error } = await adminClient()
      .from("email_subscribers")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .gte("created_at", isoTime);
    if (error) throw error;
    return count ?? 0;
  },
};

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://www.phugialy.com";
}

export const newsletter = createNewsletterService({
  store: supabaseStore,
  siteUrl: siteUrl(),
  // Required in every email footer by CAN-SPAM. Set NEWSLETTER_MAILING_ADDRESS
  // before the first digest goes out.
  mailingAddress: process.env.NEWSLETTER_MAILING_ADDRESS || undefined,
  send: async (mail) => {
    await sendResendEmail({
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      from: mail.from,
      replyTo: mail.replyTo,
      headers: mail.headers,
      idempotencyKey: mail.idempotencyKey,
    });
  },
  recentArticles: async () => {
    const posts = await getPostSummaries();
    return posts.slice(0, 3).map((post) => ({
      title: post.title,
      summary: post.metadata?.aiSummary,
      url: `${siteUrl().replace(/\/$/, "")}/blog/${post.slug}?utm_source=newsletter&utm_medium=email&utm_campaign=welcome`,
    }));
  },
});
