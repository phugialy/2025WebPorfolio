import { NextRequest, NextResponse } from "next/server";
import { getAvailabilitySlots, getSchedulingConfigStatus } from "@/lib/scheduling";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "Missing date" }, { status: 400 });
  }

  try {
    const availability = await getAvailabilitySlots(date);
    const config = getSchedulingConfigStatus();
    return NextResponse.json({
      date,
      configured: availability.configured,
      calendarConnected: config.calendarConnected,
      timeZone: config.timeZone,
      meetingMinutes: config.meetingMinutes,
      slots: availability.slots,
    });
  } catch (error) {
    console.error("Schedule availability error:", error);
    return NextResponse.json(
      { error: "Unable to load availability" },
      { status: 500 }
    );
  }
}
