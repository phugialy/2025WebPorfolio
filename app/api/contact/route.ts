import { NextRequest, NextResponse } from "next/server";
import { escapeHtml, getEmailConfigStatus, sendResendEmail } from "@/lib/email";

type ContactInput = {
  name?: string;
  email?: string;
  phone?: string;
  topic?: string;
  message?: string;
  honeypot?: string;
};

const topicLabels: Record<string, string> = {
  "ai-workflow": "AI or automation workflow",
  "article-note": "Question about an article",
  "web-system": "Web app or software system",
  "commercial-sales": "Commercial sales support",
  general: "General conversation",
};

const ownerEmail =
  process.env.CONTACT_NOTIFICATION_EMAIL ||
  process.env.SCHEDULE_NOTIFICATION_EMAIL ||
  process.env.SCHEDULE_OWNER_EMAIL ||
  process.env.ADMIN_EMAIL ||
  "phu.lyg@gmail.com";

function clean(value?: string) {
  return value?.trim() || "";
}

function validate(input: ContactInput) {
  const errors: string[] = [];
  const name = clean(input.name);
  const email = clean(input.email);
  const message = clean(input.message);
  const phone = clean(input.phone);

  if (clean(input.honeypot)) errors.push("Invalid submission.");
  if (!name) errors.push("Name is required.");
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) errors.push("A valid email is required.");
  if (phone && phone.length < 7) errors.push("Enter a valid phone number or leave it blank.");
  if (!message || message.length < 12) {
    errors.push("Add a short message with a little context.");
  }

  return errors;
}

export async function POST(request: NextRequest) {
  let input: ContactInput;

  try {
    input = (await request.json()) as ContactInput;
  } catch {
    return NextResponse.json({ errors: ["Invalid request body."] }, { status: 400 });
  }

  const errors = validate(input);
  if (errors.length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const emailStatus = getEmailConfigStatus();
  if (!emailStatus.resendConnected) {
    return NextResponse.json(
      { errors: ["Contact email is not connected yet. Please try again later."] },
      { status: 503 }
    );
  }

  const name = clean(input.name);
  const email = clean(input.email);
  const phone = clean(input.phone);
  const topic = topicLabels[clean(input.topic)] || topicLabels.general;
  const message = clean(input.message);

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safePhone = escapeHtml(phone || "Not provided");
  const safeTopic = escapeHtml(topic);
  const safeMessage = escapeHtml(message);

  const confirmationSubject = "Thanks for reaching out to Phu Gia Ly";
  const confirmationText = [
    `Hi ${name},`,
    "",
    "Thanks for reaching out. I received your message and will review the context before replying.",
    "",
    `Topic: ${topic}`,
    "",
    "Your message:",
    message,
    "",
    "Best,",
    "Phu Gia Ly",
  ].join("\n");
  const confirmationHtml = `
    <div style="margin:0;background:#f6f8fb;padding:32px 16px;font-family:Arial,sans-serif;color:#111827">
      <div style="margin:0 auto;max-width:620px;border:1px solid #e5e7eb;border-radius:16px;background:#ffffff;padding:28px">
        <p style="margin:0 0 10px;color:#2563eb;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Message received</p>
        <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#0f172a">Hi ${safeName}, thanks for starting the conversation.</h1>
        <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#374151">I received your note about <strong>${safeTopic}</strong>. I will review the context and reply with the next useful step.</p>
        <div style="margin:22px 0;padding:16px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe">
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#1e3a8a">Your message</p>
          <p style="margin:0;font-size:14px;line-height:1.7;color:#1f2937;white-space:pre-wrap">${safeMessage}</p>
        </div>
        <p style="margin:22px 0 0;font-size:14px;line-height:1.7;color:#4b5563">This confirms your message made it through. You do not need to resend it.</p>
        <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#111827">Best,<br/>Phu Gia Ly</p>
      </div>
    </div>
  `;

  const ownerSubject = `New conversation request: ${name} - ${topic}`;
  const ownerText = [
    "New contact form submission",
    "",
    `Topic: ${topic}`,
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone || "Not provided"}`,
    "",
    "Message:",
    message,
  ].join("\n");
  const ownerHtml = `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.6">
      <h2 style="margin:0 0 8px">New conversation request</h2>
      <p style="margin:0 0 16px"><strong>${safeTopic}</strong></p>
      <table style="border-collapse:collapse;width:100%;max-width:680px">
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:700">Name</td><td style="padding:8px;border:1px solid #e5e7eb">${safeName}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:700">Email</td><td style="padding:8px;border:1px solid #e5e7eb">${safeEmail}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:700">Phone</td><td style="padding:8px;border:1px solid #e5e7eb">${safePhone}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:700">Message</td><td style="padding:8px;border:1px solid #e5e7eb;white-space:pre-wrap">${safeMessage}</td></tr>
      </table>
    </div>
  `;

  try {
    const idempotencyBase = `${email}-${Date.now()}`.toLowerCase();

    await Promise.all([
      sendResendEmail({
        to: email,
        subject: confirmationSubject,
        html: confirmationHtml,
        text: confirmationText,
        replyTo: ownerEmail,
        idempotencyKey: `contact-confirmation-${idempotencyBase}`,
      }),
      sendResendEmail({
        to: ownerEmail,
        subject: ownerSubject,
        html: ownerHtml,
        text: ownerText,
        replyTo: email,
        idempotencyKey: `contact-owner-${idempotencyBase}`,
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { errors: ["Unable to send the message right now. Please try again later."] },
      { status: 500 }
    );
  }
}
