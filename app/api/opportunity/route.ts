import { NextRequest, NextResponse } from "next/server";
import { escapeHtml, getEmailConfigStatus, sendResendEmail } from "@/lib/email";

type OpportunityInput = {
  intent?: string;
  name?: string;
  email?: string;
  company?: string;
  workflow?: string;
  painPoints?: string;
  budget?: string;
  outcome?: string;
  honeypot?: string;
  source?: string;
};

const intentLabels: Record<string, string> = {
  "save-money": "Show me where this saves or makes money",
  "worth-building": "Show me what's actually worth building",
  "worth-using": "Tell me what's actually worth using",
  understand: "Help me understand this without drowning",
};

const budgetLabels: Record<string, string> = {
  "not-sure": "Not sure yet",
  under_500: "Under $500",
  "500_2000": "$500 - $2,000",
  "2000_10000": "$2,000 - $10,000",
  over_10000: "$10,000+",
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

function validate(input: OpportunityInput) {
  const errors: string[] = [];
  const name = clean(input.name);
  const email = clean(input.email);
  const workflow = clean(input.workflow);
  const outcome = clean(input.outcome);

  if (clean(input.honeypot)) errors.push("Invalid submission.");
  if (!intentLabels[clean(input.intent)]) errors.push("Select what you're trying to do with AI.");
  if (!name) errors.push("Name is required.");
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) errors.push("A valid email is required.");
  if (!workflow || workflow.length < 12) {
    errors.push("Add a little detail on your current workflow or tools.");
  }
  if (!outcome || outcome.length < 12) {
    errors.push("Add a little detail on the outcome you want.");
  }

  return errors;
}

export async function POST(request: NextRequest) {
  let input: OpportunityInput;

  try {
    input = (await request.json()) as OpportunityInput;
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
      { errors: ["Request email is not connected yet. Please try again later."] },
      { status: 503 }
    );
  }

  const name = clean(input.name);
  const email = clean(input.email);
  const company = clean(input.company);
  const workflow = clean(input.workflow);
  const painPoints = clean(input.painPoints);
  const outcome = clean(input.outcome);
  const intent = intentLabels[clean(input.intent)];
  const budget = budgetLabels[clean(input.budget)] || budgetLabels["not-sure"];
  const source = clean(input.source) || "unknown";

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeCompany = escapeHtml(company || "Not provided");
  const safeWorkflow = escapeHtml(workflow);
  const safePainPoints = escapeHtml(painPoints || "Not provided");
  const safeOutcome = escapeHtml(outcome);
  const safeIntent = escapeHtml(intent);
  const safeBudget = escapeHtml(budget);
  const safeSource = escapeHtml(source);

  const confirmationSubject = "Your AI Opportunity Brief request";
  const confirmationText = [
    `Hi ${name},`,
    "",
    "Thanks for the context. I'll review it personally and reply with a written breakdown of where AI actually fits for you -- what's worth doing, what's not, and a recommended first step.",
    "",
    `What you're trying to do: ${intent}`,
    "",
    "What you told me:",
    workflow,
    "",
    "Best,",
    "Phu Gia Ly",
  ].join("\n");
  const confirmationHtml = `
    <div style="margin:0;background:#f6f8fb;padding:32px 16px;font-family:Arial,sans-serif;color:#111827">
      <div style="margin:0 auto;max-width:620px;border:1px solid #e5e7eb;border-radius:16px;background:#ffffff;padding:28px">
        <p style="margin:0 0 10px;color:#2563eb;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Request received</p>
        <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#0f172a">Hi ${safeName}, your Opportunity Brief request is in.</h1>
        <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#374151">I'll review the context and reply with a written breakdown -- what's worth doing, what to skip, and one recommended first step.</p>
        <div style="margin:22px 0;padding:16px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe">
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#1e3a8a">What you told me</p>
          <p style="margin:0;font-size:14px;line-height:1.7;color:#1f2937;white-space:pre-wrap">${safeWorkflow}</p>
        </div>
        <p style="margin:22px 0 0;font-size:14px;line-height:1.7;color:#4b5563">This confirms your request made it through. You do not need to resend it.</p>
        <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#111827">Best,<br/>Phu Gia Ly</p>
      </div>
    </div>
  `;

  const ownerSubject = `Opportunity Brief request: ${name}${company ? ` (${company})` : ""}`;
  const ownerText = [
    "New AI Opportunity Brief request",
    "",
    `Intent: ${intent}`,
    `Source: ${source}`,
    `Name: ${name}`,
    `Email: ${email}`,
    `Company: ${company || "Not provided"}`,
    `Budget: ${budget}`,
    "",
    "Current workflow / tools:",
    workflow,
    "",
    "Pain points:",
    painPoints || "Not provided",
    "",
    "Desired outcome:",
    outcome,
  ].join("\n");
  const ownerHtml = `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.6">
      <h2 style="margin:0 0 8px">New AI Opportunity Brief request</h2>
      <p style="margin:0 0 16px"><strong>${safeIntent}</strong></p>
      <table style="border-collapse:collapse;width:100%;max-width:680px">
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:700">Source</td><td style="padding:8px;border:1px solid #e5e7eb">${safeSource}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:700">Name</td><td style="padding:8px;border:1px solid #e5e7eb">${safeName}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:700">Email</td><td style="padding:8px;border:1px solid #e5e7eb">${safeEmail}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:700">Company</td><td style="padding:8px;border:1px solid #e5e7eb">${safeCompany}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:700">Budget</td><td style="padding:8px;border:1px solid #e5e7eb">${safeBudget}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:700">Workflow / tools</td><td style="padding:8px;border:1px solid #e5e7eb;white-space:pre-wrap">${safeWorkflow}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:700">Pain points</td><td style="padding:8px;border:1px solid #e5e7eb;white-space:pre-wrap">${safePainPoints}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:700">Desired outcome</td><td style="padding:8px;border:1px solid #e5e7eb;white-space:pre-wrap">${safeOutcome}</td></tr>
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
        idempotencyKey: `opportunity-confirmation-${idempotencyBase}`,
      }),
      sendResendEmail({
        to: ownerEmail,
        subject: ownerSubject,
        html: ownerHtml,
        text: ownerText,
        replyTo: email,
        idempotencyKey: `opportunity-owner-${idempotencyBase}`,
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Opportunity brief request error:", error);
    return NextResponse.json(
      { errors: ["Unable to send the request right now. Please try again later."] },
      { status: 500 }
    );
  }
}
