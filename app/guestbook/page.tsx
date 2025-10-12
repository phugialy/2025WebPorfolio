"use client";

import { useState } from "react";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function GuestbookPage() {
  const [formData, setFormData] = useState({
    name: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<Array<{ name: string; message: string; createdAt: number }>>([
    {
      name: "Example User",
      message: "Great portfolio! Love the clean design.",
      createdAt: Date.now() - 86400000,
    },
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.name.trim() || !formData.message.trim()) {
      setError("Both fields are required");
      setLoading(false);
      return;
    }

    try {
      // Simulate submission (replace with Convex mutation when initialized)
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      setEntries([
        {
          name: formData.name,
          message: formData.message,
          createdAt: Date.now(),
        },
        ...entries,
      ]);
      
      setFormData({ name: "", message: "" });
      
      // TODO: Replace with actual Convex mutation
      // await convex.mutation(api.guestbook.post, {
      //   name: formData.name,
      //   message: formData.message,
      // });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <header className="mb-12 text-center">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Guestbook</h1>
            <p className="text-xl text-muted-foreground">
              Leave a message and say hello!
            </p>
          </header>

          {/* Post Form */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Sign the Guestbook</CardTitle>
              <CardDescription>Share your thoughts or just say hi!</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                    maxLength={50}
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
                    placeholder="Leave a message..."
                    rows={3}
                    maxLength={500}
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.message.length}/500 characters
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}

                <Button type="submit" disabled={loading}>
                  {loading ? "Posting..." : "Post Message"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Entries List */}
          <div className="space-y-4">
            <h2 className="font-display text-2xl font-semibold">Recent Entries</h2>
            {entries.map((entry, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{entry.name}</CardTitle>
                    <span className="text-sm text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{entry.message}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

