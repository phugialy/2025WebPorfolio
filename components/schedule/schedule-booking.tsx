"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ServiceKey = "commercial-sales" | "applied-ai" | "automation-workflow" | "operations";

type AvailabilitySlot = {
  time: string;
  label: string;
  available: boolean;
  reason?: "busy" | "outside-hours" | "past";
};

const services: Record<ServiceKey, { label: string; description: string }> = {
  "commercial-sales": {
    label: "Commercial Sales Support",
    description: "Lead generation, qualification, follow-up, and local market outreach.",
  },
  "applied-ai": {
    label: "Applied AI Workflow",
    description: "AI workflow design, orchestration, implementation, and training material planning.",
  },
  "automation-workflow": {
    label: "Automation Workflow",
    description: "Business or technical workflow automation with clear handoffs and review points.",
  },
  operations: {
    label: "Operations Consulting",
    description: "Operations, manufacturing, warehouse, and IT deployment process discussion.",
  },
};

const serviceKeys = Object.keys(services) as ServiceKey[];
const timeZone = "America/Chicago";

function isServiceKey(value: string | null): value is ServiceKey {
  return Boolean(value && value in services);
}

function toDateInputValue(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getMonthDays(monthDate: Date) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function formatSelectedDate(dateValue: string) {
  if (!dateValue) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateValue}T12:00:00`));
}

export function ScheduleBooking() {
  const searchParams = useSearchParams();
  const serviceParam = searchParams.get("service");
  const initialService: ServiceKey = isServiceKey(serviceParam)
    ? serviceParam
    : "commercial-sales";
  const today = useMemo(() => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
  }, []);

  const [service, setService] = useState<ServiceKey>(initialService);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today));
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null);
  const [emailConnected, setEmailConnected] = useState<boolean | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  const monthDays = useMemo(() => getMonthDays(visibleMonth), [visibleMonth]);
  const selectedService = services[service];

  useEffect(() => {
    if (!selectedDate) return;

    let cancelled = false;
    setSelectedTime("");
    setLoadingSlots(true);
    setErrors([]);

    fetch(`/api/schedule/availability?date=${selectedDate}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load availability");
        return data as {
          slots: AvailabilitySlot[];
          calendarConnected: boolean;
          emailConnected: boolean;
        };
      })
      .then((data) => {
        if (cancelled) return;
        setSlots(data.slots);
        setCalendarConnected(data.calendarConnected);
        setEmailConnected(data.emailConnected);
      })
      .catch((error) => {
        if (cancelled) return;
        setSlots([]);
        setErrors([error instanceof Error ? error.message : "Unable to load availability"]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const selectDate = (date: Date) => {
    setSuccess(false);
    setErrors([]);
    setSelectedDate(toDateInputValue(date));
  };

  const canSelectDate = (date: Date) => {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    const day = value.getDay();
    return value >= today && day >= 1 && day <= 6;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setErrors([]);
    setSuccess(false);

    try {
      const response = await fetch("/api/schedule/book", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          service,
          date: selectedDate,
          time: selectedTime,
          ...form,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setErrors(data.errors || ["Unable to complete the booking."]);
        return;
      }

      setSuccess(true);
      setForm({ name: "", email: "", phone: "", notes: "" });
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Unable to complete the booking."]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            Monday to Saturday, 8:00 AM to 6:00 PM CT
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            Schedule a short working session.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Pick the service, choose an available time, then leave the basic contact details I need to confirm the conversation.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase text-primary">Service</p>
              <h2 className="mt-1 font-display text-2xl font-semibold">{selectedService.label}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {selectedService.description}
              </p>
            </div>

            <div className="grid gap-2">
              {serviceKeys.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setService(key)}
                  className={cn(
                    "rounded-xl border p-3 text-left text-sm transition-colors",
                    service === key
                      ? "border-primary bg-primary/10 text-foreground"
                      : "bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  <span className="font-medium">{services[key].label}</span>
                  <span className="mt-1 block text-xs leading-relaxed">{services[key].description}</span>
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-xl bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground">
              Calendar blocking uses Google Calendar. Confirmation and internal lead notices use Resend.
              {calendarConnected === false && (
                <span className="mt-2 block font-medium text-amber-600 dark:text-amber-300">
                  Local preview mode: Google Calendar is not connected in this environment yet.
                </span>
              )}
              {emailConnected === false && (
                <span className="mt-2 block font-medium text-amber-600 dark:text-amber-300">
                  Email preview mode: Resend is not connected in this environment yet.
                </span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-primary">Date and time</p>
                <h2 className="mt-1 font-display text-2xl font-semibold">
                  {visibleMonth.toLocaleString("en-US", { month: "long", year: "numeric" })}
                </h2>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Previous month"
                  onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Next month"
                  onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map((date) => {
                const value = toDateInputValue(date);
                const disabled = !canSelectDate(date);
                const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
                const isSelected = selectedDate === value;

                return (
                  <button
                    key={value}
                    type="button"
                    disabled={disabled}
                    onClick={() => selectDate(date)}
                    className={cn(
                      "aspect-square rounded-lg border text-sm transition-colors",
                      isSelected && "border-primary bg-primary text-primary-foreground",
                      !isSelected && isCurrentMonth && !disabled && "bg-background hover:border-primary/60",
                      !isCurrentMonth && "text-muted-foreground/40",
                      disabled && "cursor-not-allowed bg-muted/40 text-muted-foreground/40"
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {selectedDate && (
              <div className="mt-6 border-t pt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{formatSelectedDate(selectedDate)}</p>
                    <p className="text-xs text-muted-foreground">Central time, {timeZone}</p>
                  </div>
                  {loadingSlots && <span className="text-xs text-muted-foreground">Loading times...</span>}
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {slots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => {
                        setSelectedTime(slot.time);
                        setSuccess(false);
                      }}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm transition-colors",
                        selectedTime === slot.time && "border-primary bg-primary text-primary-foreground",
                        selectedTime !== slot.time && slot.available && "bg-background hover:border-primary/60",
                        !slot.available && "cursor-not-allowed bg-muted/40 text-muted-foreground/40"
                      )}
                      title={!slot.available ? (slot.reason === "busy" ? "Already booked" : "Unavailable") : undefined}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedDate && selectedTime && (
              <form onSubmit={handleSubmit} className="mt-6 border-t pt-5">
                <div className="mb-4 rounded-xl bg-primary/10 p-4 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <Clock className="h-4 w-4 text-primary" />
                    {formatSelectedDate(selectedDate)} at {slots.find((slot) => slot.time === selectedTime)?.label}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    Name
                    <Input
                      className="mt-2"
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                      required
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Email
                    <div className="relative mt-2">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        type="email"
                        value={form.email}
                        onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                        required
                      />
                    </div>
                  </label>
                  <label className="text-sm font-medium sm:col-span-2">
                    Phone
                    <div className="relative mt-2">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        type="tel"
                        value={form.phone}
                        onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                        required
                      />
                    </div>
                  </label>
                  <label className="text-sm font-medium sm:col-span-2">
                    Notes <span className="font-normal text-muted-foreground">(optional)</span>
                    <Textarea
                      className="mt-2"
                      value={form.notes}
                      onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                      placeholder="Share a quick context note, timeline, or workflow you want to discuss."
                    />
                  </label>
                </div>

                {errors.length > 0 && (
                  <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    {errors.map((error) => (
                      <p key={error}>{error}</p>
                    ))}
                  </div>
                )}

                {success && (
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-200">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <p>
                      Your appointment was registered. A confirmation email is on the way.
                    </p>
                  </div>
                )}

                <Button type="submit" className="mt-5 w-full sm:w-auto" size="lg" disabled={submitting}>
                  {submitting ? "Scheduling..." : "Confirm appointment"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
