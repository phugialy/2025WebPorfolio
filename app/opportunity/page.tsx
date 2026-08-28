"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Compass, Hammer, Send, TrendingUp } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trackNavigationEvent } from "@/lib/analytics";

type Intent = "save-money" | "worth-building" | "worth-using" | "understand";

const INTENTS: { value: Intent; label: string; quote: string; icon: typeof Compass }[] = [
  {
    value: "save-money",
    label: "Save or make money",
    quote: "Show me where this saves or makes money.",
    icon: TrendingUp,
  },
  {
    value: "worth-building",
    label: "Build something",
    quote: "Show me what's actually worth building.",
    icon: Hammer,
  },
  {
    value: "worth-using",
    label: "Choose the right tool",
    quote: "Tell me what's actually worth using.",
    icon: CheckCircle2,
  },
  {
    value: "understand",
    label: "Just get oriented",
    quote: "Help me understand this without drowning.",
    icon: Compass,
  },
];

const BUDGET_OPTIONS: { value: string; label: string }[] = [
  { value: "not-sure", label: "Not sure yet" },
  { value: "under_500", label: "Under $500" },
  { value: "500_2000", label: "$500 - $2,000" },
  { value: "2000_10000", label: "$2,000 - $10,000" },
  { value: "over_10000", label: "$10,000+" },
];

type FormState = {
  name: string;
  email: string;
  company: string;
  workflow: string;
  painPoints: string;
  budget: string;
  outcome: string;
  honeypot: string;
};

const initialFormState: FormState = {
  name: "",
  email: "",
  company: "",
  workflow: "",
  painPoints: "",
  budget: "not-sure",
  outcome: "",
  honeypot: "",
};

function OpportunityIntake() {
  const searchParams = useSearchParams();
  const articleParam = searchParams.get("article");
  const source = articleParam ? `article:${articleParam}` : searchParams.get("from") || "direct";

  const [intent, setIntent] = useState<Intent | null>(null);
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  const updateField = (field: keyof FormState, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const selectIntent = (value: Intent) => {
    setIntent(value);
    trackNavigationEvent("opportunity_intent_selected", { intent: value, source_page: source });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!intent) return;
    setLoading(true);
    setErrors([]);

    try {
      const response = await fetch("/api/opportunity", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...formData, intent, source }),
      });
      const data = (await response.json().catch(() => ({}))) as { errors?: string[] };

      if (!response.ok) {
        setErrors(data.errors || ["Unable to send the request right now."]);
        return;
      }

      trackNavigationEvent("opportunity_brief_requested", { intent, source_page: source });
      setSuccess(true);
      setFormData(initialFormState);
    } catch {
      setErrors(["Unable to send the request right now."]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen overflow-hidden bg-[#07080b] text-foreground">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 opacity-70"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(59,130,246,0.14) 0%, rgba(7,8,11,0) 34%), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
            backgroundSize: "100% 100%, 72px 72px, 72px 72px",
            maskImage: "linear-gradient(180deg, black 0%, black 54%, transparent 100%)",
          }}
        />

        <div className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-black/25 px-3 py-1 text-xs font-medium text-muted-foreground shadow-inner shadow-white/5">
            <Send className="h-3.5 w-3.5 text-primary" />
            AI Opportunity Brief
          </div>
          <h1 className="mt-6 font-display text-4xl font-bold leading-tight md:text-5xl">
            What are you trying to do with AI?
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            Tell me your situation and I&apos;ll send back a written breakdown: what&apos;s worth
            doing, what to skip, and one recommended first step. No sales pitch, no generic
            checklist.
          </p>

          {success ? (
            <div className="mt-8 rounded-[1.55rem] bg-white/[0.045] p-6 shadow-2xl shadow-black/35 backdrop-blur-xl sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h2 className="mt-5 font-display text-3xl font-bold">Request sent.</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                You should receive a confirmation email shortly. I review every request personally
                before replying.
              </p>
            </div>
          ) : !intent ? (
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {INTENTS.map(({ value, label, quote, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => selectIntent(value)}
                  className="rounded-2xl bg-white/[0.045] p-5 text-left shadow-2xl shadow-black/25 backdrop-blur-xl transition hover:bg-white/[0.075]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-4 font-display text-lg font-bold">{label}</p>
                  <p className="mt-1 text-sm italic text-muted-foreground">&ldquo;{quote}&rdquo;</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-[1.75rem] bg-black/25 p-4 shadow-2xl shadow-black/35 backdrop-blur-xl sm:p-5">
              <form onSubmit={handleSubmit} className="rounded-[1.35rem] bg-white/[0.045] p-5 sm:p-7">
                <button
                  type="button"
                  onClick={() => setIntent(null)}
                  className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Change what you&apos;re trying to do
                </button>

                <input
                  type="text"
                  name="website"
                  value={formData.honeypot}
                  onChange={(event) => updateField("honeypot", event.target.value)}
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium">
                    Name
                    <Input
                      value={formData.name}
                      onChange={(event) => updateField("name", event.target.value)}
                      placeholder="Your name"
                      disabled={loading}
                      required
                      className="border-white/10 bg-black/25"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Email
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      placeholder="you@example.com"
                      disabled={loading}
                      required
                      className="border-white/10 bg-black/25"
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium">
                    Company / context{" "}
                    <span className="text-xs font-normal text-muted-foreground">optional</span>
                    <Input
                      value={formData.company}
                      onChange={(event) => updateField("company", event.target.value)}
                      placeholder="Company, project, or just 'solo'"
                      disabled={loading}
                      className="border-white/10 bg-black/25"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Budget range
                    <select
                      value={formData.budget}
                      onChange={(event) => updateField("budget", event.target.value)}
                      disabled={loading}
                      className="flex h-10 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {BUDGET_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="mt-4 grid gap-2 text-sm font-medium">
                  Current workflow or tools
                  <Textarea
                    value={formData.workflow}
                    onChange={(event) => updateField("workflow", event.target.value)}
                    placeholder="What are you doing today, and with what tools?"
                    rows={3}
                    disabled={loading}
                    required
                    className="border-white/10 bg-black/25"
                  />
                </label>

                <label className="mt-4 grid gap-2 text-sm font-medium">
                  Pain points{" "}
                  <span className="text-xs font-normal text-muted-foreground">optional</span>
                  <Textarea
                    value={formData.painPoints}
                    onChange={(event) => updateField("painPoints", event.target.value)}
                    placeholder="What's slow, manual, or frustrating right now?"
                    rows={3}
                    disabled={loading}
                    className="border-white/10 bg-black/25"
                  />
                </label>

                <label className="mt-4 grid gap-2 text-sm font-medium">
                  Desired outcome
                  <Textarea
                    value={formData.outcome}
                    onChange={(event) => updateField("outcome", event.target.value)}
                    placeholder="What would 'this worked' look like?"
                    rows={3}
                    disabled={loading}
                    required
                    className="border-white/10 bg-black/25"
                  />
                </label>

                {errors.length > 0 && (
                  <div className="mt-4 rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">
                    {errors.map((error) => (
                      <p key={error}>{error}</p>
                    ))}
                  </div>
                )}

                <Button type="submit" size="lg" disabled={loading} className="mt-6 w-full">
                  {loading ? "Sending..." : "Request My AI Opportunity Brief"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export default function OpportunityPage() {
  return (
    <Suspense fallback={null}>
      <OpportunityIntake />
    </Suspense>
  );
}
