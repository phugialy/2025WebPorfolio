import { NextRequest, NextResponse } from "next/server";
import {
  AppointmentInput,
  hasEmailConfig,
  saveAppointmentRecord,
  sendConfirmationEmail,
  validateAppointment,
} from "@/lib/scheduling";

export async function POST(request: NextRequest) {
  let input: AppointmentInput;

  try {
    input = (await request.json()) as AppointmentInput;
  } catch {
    return NextResponse.json({ errors: ["Invalid request body."] }, { status: 400 });
  }

  const errors = validateAppointment(input);

  if (errors.length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  try {
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

    await sendConfirmationEmail(input);
    await saveAppointmentRecord(input);

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error("Schedule booking error:", error);
    return NextResponse.json(
      { errors: ["Unable to complete the booking right now. Please try again later."] },
      { status: 500 }
    );
  }
}
