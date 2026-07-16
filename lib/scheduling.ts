import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { escapeHtml, getEmailConfigStatus, sendResendEmail } from "@/lib/email";

export type ScheduleService =
  | "commercial-sales"
  | "applied-ai"
  | "automation-workflow"
  | "operations";

export type AppointmentInput = {
  service: ScheduleService;
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
};

type CalendarEvent = {
  start?: { dateTime?: string };
  end?: { dateTime?: string };
};

const timeZone = process.env.GOOGLE_TIME_ZONE || process.env.SCHEDULE_TIME_ZONE || "America/Chicago";
const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
const ownerEmail = process.env.SCHEDULE_OWNER_EMAIL || process.env.ADMIN_EMAIL || "contact@phugialy.com";
const notificationEmail =
  process.env.SCHEDULE_NOTIFICATION_EMAIL ||
  process.env.SCHEDULE_OWNER_EMAIL ||
  process.env.ADMIN_EMAIL ||
  ownerEmail;
const meetingMinutes = Number(process.env.SCHEDULE_MEETING_MINUTES || 30);

export const scheduleServices: Record<
  ScheduleService,
  { label: string; summary: string; description: string }
> = {
  "commercial-sales": {
    label: "Commercial Sales Support",
    summary: "Commercial sales support intro",
    description: "Discuss sales support, lead generation, outreach, and follow-up needs.",
  },
  "applied-ai": {
    label: "Applied AI Workflow",
    summary: "Applied AI workflow consultation",
    description: "Discuss AI workflow design, orchestration, training materials, or agentic processes.",
  },
  "automation-workflow": {
    label: "Automation Workflow",
    summary: "Automation workflow consultation",
    description: "Discuss automation opportunities across technical or business operations.",
  },
  operations: {
    label: "Operations Consulting",
    summary: "Operations consulting intro",
    description: "Discuss operations, manufacturing, warehouse, or IT deployment process needs.",
  },
};

export type AvailabilitySlot = {
  time: string;
  label: string;
  available: boolean;
  reason?: "busy" | "outside-hours" | "past";
};

export function isScheduleService(value: string): value is ScheduleService {
  return value in scheduleServices;
}

export function getService(value: string | null | undefined) {
  return isScheduleService(value || "") ? scheduleServices[value as ScheduleService] : scheduleServices["commercial-sales"];
}

function hasGoogleCalendarConfig() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      (process.env.GOOGLE_CALENDAR_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN)
  );
}

export function getSchedulingConfigStatus() {
  const email = getEmailConfigStatus();
  return {
    calendarConnected: hasGoogleCalendarConfig(),
    emailConnected: email.resendConnected,
    emailProvider: email.resendConnected ? "resend" : "not-configured",
    fromEmail: email.fromEmail,
    notificationEmail: email.notificationEmail,
    calendarId,
    timeZone,
    meetingMinutes,
  };
}

async function getGoogleAccessToken(refreshToken?: string) {
  if (!hasGoogleCalendarConfig()) {
    throw new Error("Google OAuth scheduling env vars are missing");
  }

  const token = refreshToken || process.env.GOOGLE_REFRESH_TOKEN;
  if (!token) {
    throw new Error("Google OAuth refresh token is missing");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: token,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token request failed: ${response.status}`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Google token response did not include an access token");
  }

  return data.access_token;
}

function getCalendarRefreshToken() {
  return process.env.GOOGLE_CALENDAR_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN;
}

export function hasEmailConfig() {
  return getEmailConfigStatus().resendConnected;
}

export function businessDaysFromToday(days = 21) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return date;
  }).filter((date) => {
    const day = date.getDay();
    return day >= 1 && day <= 6;
  });
}

export function timeSlots() {
  const slots: string[] = [];
  for (let hour = 8; hour < 18; hour += 1) {
    slots.push(`${String(hour).padStart(2, "0")}:00`);
    slots.push(`${String(hour).padStart(2, "0")}:30`);
  }
  return slots;
}

export function createLocalDateTime(date: string, time: string) {
  return `${date}T${time}:00`;
}

export function createEndDateTime(date: string, time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const totalMinutes = hour * 60 + minute + meetingMinutes;
  const endHour = Math.floor(totalMinutes / 60);
  const endMinute = totalMinutes % 60;
  return `${date}T${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}:00`;
}

export function validateAppointment(input: Partial<AppointmentInput> | null | undefined) {
  const errors: string[] = [];
  if (!input) return ["Appointment details are required."];
  const date = new Date(`${input.date || ""}T00:00:00`);
  const day = date.getDay();

  if (!input.service || !isScheduleService(input.service)) errors.push("Select a valid service.");
  if (!input.name?.trim()) errors.push("Name is required.");
  if (!input.email || !/^\S+@\S+\.\S+$/.test(input.email)) errors.push("A valid email is required.");
  if (!input.phone?.trim()) errors.push("Phone number is required.");
  if (!input.date || Number.isNaN(date.getTime())) errors.push("Select a valid date.");
  if (day < 1 || day > 6) errors.push("Appointments are available Monday through Saturday.");
  if (!input.time || !timeSlots().includes(input.time)) errors.push("Select a time between 8:00 AM and 6:00 PM.");
  if (input.date && input.time && isPastSlot(input.date, input.time)) errors.push("Select a future appointment time.");

  return errors;
}

function getDateTimeParts(dateTime: Date, zone = timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(dateTime);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function zonedDateTimeToUtc(date: string, time: string, zone = timeZone) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const parts = getDateTimeParts(utcGuess, zone);
  const zoneAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  const offsetMs = zoneAsUtc - utcGuess.getTime();
  return new Date(utcGuess.getTime() - offsetMs);
}

function isPastSlot(date: string, time: string) {
  const slotStart = zonedDateTimeToUtc(date, time);
  return slotStart.getTime() <= Date.now();
}

function formatTimeLabel(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

export function formatAppointmentDate(date: string, time: string) {
  return zonedDateTimeToUtc(date, time).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  });
}

export async function getBusyTimes(date: string) {
  if (!hasGoogleCalendarConfig()) {
    return {
      configured: false,
      busy: [] as string[],
    };
  }

  const token = await getGoogleAccessToken(getCalendarRefreshToken());
  const response = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      timeMin: zonedDateTimeToUtc(date, "00:00").toISOString(),
      timeMax: zonedDateTimeToUtc(date, "23:59").toISOString(),
      timeZone,
      items: [{ id: calendarId }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Calendar availability failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    calendars?: Record<string, { busy?: CalendarEvent[] }>;
  };
  const intervals = data.calendars?.[calendarId]?.busy || [];
  const busy = new Set<string>();

  for (const event of intervals) {
    if (!event.start?.dateTime || !event.end?.dateTime) continue;
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);

    for (const slot of timeSlots()) {
      const slotStart = zonedDateTimeToUtc(date, slot);
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + meetingMinutes);
      if (slotStart < end && slotEnd > start) {
        busy.add(slot);
      }
    }
  }

  return {
    configured: true,
    busy: Array.from(busy),
  };
}

export async function getAvailabilitySlots(date: string): Promise<{
  configured: boolean;
  slots: AvailabilitySlot[];
}> {
  const availability = await getBusyTimes(date);
  const busy = new Set(availability.busy);

  return {
    configured: availability.configured,
    slots: timeSlots().map((time) => {
      const isBusy = busy.has(time);
      const past = isPastSlot(date, time);
      return {
        time,
        label: formatTimeLabel(time),
        available: !isBusy && !past,
        reason: isBusy ? "busy" : past ? "past" : undefined,
      };
    }),
  };
}

export async function createCalendarEvent(input: AppointmentInput) {
  const token = await getGoogleAccessToken(getCalendarRefreshToken());
  const service = scheduleServices[input.service];
  const startDateTime = createLocalDateTime(input.date, input.time);
  const endDateTime = createEndDateTime(input.date, input.time);

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        summary: `${service.summary} - ${input.name}`,
        description: [
          service.description,
          "",
          `Name: ${input.name}`,
          `Email: ${input.email}`,
          `Phone: ${input.phone}`,
          input.notes ? `Notes: ${input.notes}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        start: { dateTime: startDateTime, timeZone },
        end: { dateTime: endDateTime, timeZone },
        attendees: [{ email: input.email }, { email: ownerEmail }],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Google Calendar event create failed: ${response.status}`);
  }

  return (await response.json()) as { id?: string; htmlLink?: string };
}

export async function sendConfirmationEmail(input: AppointmentInput) {
  const service = scheduleServices[input.service];
  const when = formatAppointmentDate(input.date, input.time);
  const safeName = escapeHtml(input.name.trim());
  const safeEmail = escapeHtml(input.email.trim());
  const safePhone = escapeHtml(input.phone.trim());
  const safeNotes = input.notes?.trim() ? escapeHtml(input.notes.trim()) : "";
  const safeService = escapeHtml(service.label);
  const safeWhen = escapeHtml(when);
  const safeDescription = escapeHtml(service.description);

  const confirmationSubject = `Thanks for reaching out: ${service.label}`;
  const confirmationText = [
    `Hi ${input.name.trim()},`,
    "",
    `Thanks for sending a ${service.label} request. I received your preferred time for ${when}.`,
    "",
    "What you selected:",
    service.description,
    "",
    input.notes?.trim() ? `Your note: ${input.notes.trim()}` : "",
    "",
    "I will review the details and follow up if anything needs to shift.",
    "",
    "Best,",
    "Phu Gia Ly",
  ]
    .filter(Boolean)
    .join("\n");
  const confirmationHtml = `
    <div style="margin:0;background:#f6f8fb;padding:32px 16px;font-family:Arial,sans-serif;color:#111827">
      <div style="margin:0 auto;max-width:620px;border:1px solid #e5e7eb;border-radius:16px;background:#ffffff;padding:28px">
        <p style="margin:0 0 10px;color:#2563eb;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Request received</p>
        <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#0f172a">Hi ${safeName}, thanks for reaching out.</h1>
        <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#374151">I received your <strong>${safeService}</strong> request with a preferred time of <strong>${safeWhen}</strong>.</p>
        <div style="margin:22px 0;padding:16px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe">
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#1e3a8a">What you selected</p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#1f2937">${safeDescription}</p>
        </div>
        ${
          safeNotes
            ? `<div style="margin:18px 0;padding:14px;border-radius:12px;background:#f9fafb;border:1px solid #e5e7eb"><p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#374151">Your note</p><p style="margin:0;font-size:14px;line-height:1.6;color:#4b5563">${safeNotes}</p></div>`
            : ""
        }
        <p style="margin:18px 0 0;font-size:14px;line-height:1.7;color:#4b5563">I will review the details and follow up if anything needs to shift. This note confirms that your request made it through.</p>
        <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#111827">Best,<br/>Phu Gia Ly</p>
      </div>
    </div>
  `;

  const internalSubject = `New form request: ${input.name.trim()} - ${service.label}`;
  const internalText = [
    `New form request for ${when}`,
    "",
    `Service: ${service.label}`,
    `Name: ${input.name.trim()}`,
    `Email: ${input.email.trim()}`,
    `Phone: ${input.phone.trim()}`,
    input.notes?.trim() ? `Notes: ${input.notes.trim()}` : "Notes: none",
  ].join("\n");
  const internalHtml = `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.6">
      <h2 style="margin:0 0 8px">New form request</h2>
      <p style="margin:0 0 16px"><strong>${safeWhen}</strong></p>
      <table style="border-collapse:collapse;width:100%;max-width:620px">
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:700">Service</td><td style="padding:8px;border:1px solid #e5e7eb">${safeService}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:700">Name</td><td style="padding:8px;border:1px solid #e5e7eb">${safeName}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:700">Email</td><td style="padding:8px;border:1px solid #e5e7eb">${safeEmail}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:700">Phone</td><td style="padding:8px;border:1px solid #e5e7eb">${safePhone}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:700">Notes</td><td style="padding:8px;border:1px solid #e5e7eb">${safeNotes || "None"}</td></tr>
      </table>
    </div>
  `;

  const idempotencyBase = `${input.service}-${input.date}-${input.time}-${input.email}`.toLowerCase();

  await Promise.all([
    sendResendEmail({
      to: input.email,
      subject: confirmationSubject,
      html: confirmationHtml,
      text: confirmationText,
      replyTo: notificationEmail,
      idempotencyKey: `schedule-confirmation-${idempotencyBase}`,
    }),
    sendResendEmail({
      to: notificationEmail,
      subject: internalSubject,
      html: internalHtml,
      text: internalText,
      replyTo: input.email,
      idempotencyKey: `schedule-owner-${idempotencyBase}`,
    }),
  ]);
}

export async function saveAppointmentRecord(input: AppointmentInput, googleEventId?: string) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return;

  await supabase.from("appointment_requests").insert({
    service: input.service,
    date: input.date,
    time: input.time,
    name: input.name,
    email: input.email,
    phone: input.phone,
    notes: input.notes || null,
    google_event_id: googleEventId || null,
  });
}
