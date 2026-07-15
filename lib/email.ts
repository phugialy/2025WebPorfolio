type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  idempotencyKey?: string;
};

type ResendSendResponse = {
  id?: string;
  error?: { message?: string; name?: string };
};

const resendApiUrl = "https://api.resend.com/emails";

export function getEmailConfigStatus() {
  return {
    resendConnected: Boolean(process.env.RESEND_API_KEY),
    fromEmail: process.env.SCHEDULE_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || "",
    notificationEmail:
      process.env.SCHEDULE_NOTIFICATION_EMAIL ||
      process.env.SCHEDULE_OWNER_EMAIL ||
      process.env.ADMIN_EMAIL ||
      "",
  };
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendResendEmail(input: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is missing");
  }

  const from =
    process.env.SCHEDULE_FROM_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    "Phu Gia Ly <onboarding@resend.dev>";

  const response = await fetch(resendApiUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
    }),
  });

  const data = (await response.json().catch(() => ({}))) as ResendSendResponse;

  if (!response.ok) {
    const detail = data.error?.message || response.statusText;
    throw new Error(`Resend email failed: ${response.status} ${detail}`);
  }

  return data;
}
