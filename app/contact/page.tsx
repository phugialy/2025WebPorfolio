"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, Mail, MessageSquareText, Sparkles } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type FormState = {
  name: string;
  email: string;
  phone: string;
  topic: string;
  message: string;
  honeypot: string;
};

const initialFormState: FormState = {
  name: "",
  email: "",
  phone: "",
  topic: "ai-workflow",
  message: "",
  honeypot: "",
};

export default function ContactPage() {
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  const updateField = (field: keyof FormState, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setErrors([]);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = (await response.json().catch(() => ({}))) as { errors?: string[] };

      if (!response.ok) {
        setErrors(data.errors || ["Unable to send the message right now."]);
        return;
      }

      setSuccess(true);
      setFormData(initialFormState);
    } catch {
      setErrors(["Unable to send the message right now."]);
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

        <div className="relative mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(420px,1fr)] lg:px-8 lg:py-16">
          <section className="rounded-[1.75rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.075),rgba(255,255,255,0.025))] p-6 shadow-2xl shadow-black/35 backdrop-blur-xl sm:p-8 lg:sticky lg:top-24 lg:self-start">
            <div className="inline-flex items-center gap-2 rounded-full bg-black/25 px-3 py-1 text-xs font-medium text-muted-foreground shadow-inner shadow-white/5">
              <MessageSquareText className="h-3.5 w-3.5 text-primary" />
              Start conversation
            </div>
            <h1 className="mt-6 font-display text-4xl font-bold leading-tight md:text-5xl">
              Send the context, not a cold pitch.
            </h1>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Use this when a note connects to a real workflow, a business question, or an AI system you want to think through. I will get the message by email and you will receive a confirmation.
            </p>

            <div className="mt-8 grid gap-3">
              {[
                "AI workflow or automation idea",
                "Question from an article",
                "Web app or system conversation",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-black/25 p-3 text-sm text-muted-foreground shadow-inner shadow-white/5">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.75rem] bg-black/25 p-4 shadow-2xl shadow-black/35 backdrop-blur-xl sm:p-5">
            {success ? (
              <div className="rounded-[1.35rem] bg-white/[0.045] p-6 sm:p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h2 className="mt-5 font-display text-3xl font-bold">Message sent.</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  You should receive a confirmation email shortly. I will review your message and reply from there.
                </p>
                <Button className="mt-6" onClick={() => setSuccess(false)}>
                  Send another message
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="rounded-[1.35rem] bg-white/[0.045] p-5 sm:p-7">
                <div className="mb-6">
                  <div className="mb-2 flex items-center gap-2 text-sm text-primary">
                    <Sparkles className="h-4 w-4" />
                    Conversation form
                  </div>
                  <h2 className="font-display text-3xl font-bold">Tell me what you are trying to move forward.</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    A few practical details are enough. Keep it rough if the idea is still forming.
                  </p>
                </div>

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
                    Phone <span className="text-xs font-normal text-muted-foreground">optional</span>
                    <Input
                      value={formData.phone}
                      onChange={(event) => updateField("phone", event.target.value)}
                      placeholder="Best callback number"
                      disabled={loading}
                      className="border-white/10 bg-black/25"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Topic
                    <select
                      value={formData.topic}
                      onChange={(event) => updateField("topic", event.target.value)}
                      disabled={loading}
                      className="flex h-10 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="ai-workflow">AI or automation workflow</option>
                      <option value="article-note">Question about an article</option>
                      <option value="web-system">Web app or software system</option>
                      <option value="commercial-sales">Commercial sales support</option>
                      <option value="general">General conversation</option>
                    </select>
                  </label>
                </div>

                <label className="mt-4 grid gap-2 text-sm font-medium">
                  Message
                  <Textarea
                    value={formData.message}
                    onChange={(event) => updateField("message", event.target.value)}
                    placeholder="What are you trying to build, fix, automate, understand, or decide?"
                    rows={7}
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
                  {loading ? "Sending..." : "Send Message"}
                  <Mail className="h-4 w-4" />
                </Button>
              </form>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
