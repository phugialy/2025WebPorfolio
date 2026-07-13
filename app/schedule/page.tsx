import { Suspense } from "react";
import { Navigation } from "@/components/navigation";
import { ScheduleBooking } from "@/components/schedule/schedule-booking";

export default function SchedulePage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-background text-foreground">
        <Suspense fallback={<div className="container mx-auto px-4 py-12">Loading scheduler...</div>}>
          <ScheduleBooking />
        </Suspense>
      </main>
    </>
  );
}
