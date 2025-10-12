"use client";

import { useState } from "react";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
    honeypot: "", // Hidden field for bot detection
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Client-side validation
    if (!formData.name.trim()) {
      setError("Name is required");
      setLoading(false);
      return;
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      setError("Valid email is required");
      setLoading(false);
      return;
    }
    if (!formData.message.trim()) {
      setError("Message is required");
      setLoading(false);
      return;
    }

    // Honeypot check
    if (formData.honeypot) {
      setError("Invalid submission");
      setLoading(false);
      return;
    }

    try {
      // In production, this would call a Convex mutation
      // For now, simulate the submission
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Simulate success
      setSuccess(true);
      setFormData({ name: "", email: "", message: "", honeypot: "" });
      
      // TODO: Replace with actual Convex mutation when Convex is initialized
      // const result = await convex.mutation(api.contacts.submit, {
      //   name: formData.name,
      //   email: formData.email,
      //   message: formData.message,
      //   honeypot: formData.honeypot,
      // });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <header className="mb-12 text-center">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Contact Me</h1>
            <p className="text-xl text-muted-foreground">
              Have a project in mind? Let&apos;s discuss how we can work together.
            </p>
          </header>

          {success ? (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle>Message Sent!</CardTitle>
                <CardDescription>
                  Thank you for reaching out. I&apos;ll get back to you soon.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setSuccess(false)} variant="outline">
                  Send Another Message
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Get in Touch</CardTitle>
                <CardDescription>
                  Fill out the form below and I&apos;ll respond as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Honeypot field - hidden from users */}
                  <input
                    type="text"
                    name="website"
                    value={formData.honeypot}
                    onChange={(e) =>
                      setFormData({ ...formData, honeypot: e.target.value })
                    }
                    style={{ display: "none" }}
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                  />

                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-2">
                      Name *
                    </label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Your name"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                      Email *
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="your.email@example.com"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium mb-2">
                      Message *
                    </label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      placeholder="Tell me about your project..."
                      rows={6}
                      required
                      disabled={loading}
                    />
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                      {error}
                    </div>
                  )}

                  <Button type="submit" size="lg" disabled={loading} className="w-full">
                    {loading ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}

