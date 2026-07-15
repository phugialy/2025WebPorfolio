import { NextRequest, NextResponse } from "next/server";
import {
  AppointmentInput,
  createCalendarEvent,
  getAvailabilitySlots,
  hasEmailConfig,
  saveAppointmentRecord,
  sendConfirmationEmail,
  validateAppointment,
} from "@/lib/scheduling";

export async function POST(request: NextRequest) {
  const input = (await request.json()) as AppointmentInput;
  const errors = validateAppointment(input);

  if (errors.length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  try {
    const availability = await getAvailabilitySlots(input.date);
    if (!availability.configured) {
      return NextResponse.json(
        {
          errors: [
            "Scheduling is not connected to Google Calendar yet. Please add the Google OAuth env vars before accepting bookings.",
          ],
        },
        { status: 503 }
      );
    }

    if (!hasEmailConfig()) {
      return NextResponse.json(
        {
          errors: [
            "Scheduling email is not connected yet. Please add RESEND_API_KEY before accepting bookings.",
          ],
        },
        { status: 503 }
      );
    }

    const selectedSlot = availability.slots.find((slot) => slot.time === input.time);
    if (!selectedSlot?.available) {
      return NextResponse.json(
        { errors: ["That time is no longer available. Please select another slot."] },
        { status: 409 }
      );
    }

    const event = await createCalendarEvent(input);
    await sendConfirmationEmail(input);
    await saveAppointmentRecord(input, event.id);

    return NextResponse.json({
      ok: true,
      eventId: event.id,
      eventUrl: event.htmlLink,
    });
  } catch (error) {
    console.error("Schedule booking error:", error);
    return NextResponse.json(
      { errors: ["Unable to complete the booking right now. Please try again later."] },
      { status: 500 }
    );
  }
}
