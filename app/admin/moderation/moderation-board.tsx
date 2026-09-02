"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/components/affiliate/admin-ui";

type ModerationReply = {
  id: string;
  thread_id: string;
  author_email: string;
  author_name: string;
  body: string;
  status: "visible" | "hidden" | "removed";
  created_at: string;
  threads: { title: string | null } | null;
};

export function ModerationBoard() {
  const [replies, setReplies] = useState<ModerationReply[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await fetch("/api/admin/moderation/feed").then((r) => r.json());
    setReplies(data.replies || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const setReplyStatus = async (id: string, status: "visible" | "hidden" | "removed") => {
    await fetch(`/api/admin/moderation/replies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const setUserStatus = async (email: string, status: "active" | "muted" | "banned") => {
    if (!confirm(`Set ${email} to ${status}?`)) return;
    await fetch("/api/admin/moderation/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, status }),
    });
    load();
  };

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase text-primary">Admin Control Center</p>
        <h1 className="mt-2 font-display text-4xl font-bold">Discussion Moderation</h1>
        <p className="mt-3 text-muted-foreground">
          Every reply across every Field Note, newest first. Hide/remove a reply, or mute/ban its
          author.
        </p>

        {loading ? (
          <p className="mt-8 text-muted-foreground">Loading...</p>
        ) : replies.length === 0 ? (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>No replies yet</CardTitle>
              <CardDescription>Nothing to moderate.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="mt-8 grid gap-3">
            {replies.map((reply) => (
              <Card key={reply.id}>
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-sm">
                        {reply.author_name}{" "}
                        <span className="font-normal text-muted-foreground">({reply.author_email})</span>
                      </CardTitle>
                      <CardDescription>
                        on &quot;{reply.threads?.title || "Field Note"}&quot; · {formatDate(reply.created_at)}
                      </CardDescription>
                      <p className="mt-2 whitespace-pre-wrap text-sm">{reply.body}</p>
                    </div>
                    <span
                      className={
                        reply.status === "visible"
                          ? "shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                          : "shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                      }
                    >
                      {reply.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {reply.status !== "visible" && (
                      <Button size="sm" variant="outline" onClick={() => setReplyStatus(reply.id, "visible")}>
                        Restore
                      </Button>
                    )}
                    {reply.status !== "hidden" && (
                      <Button size="sm" variant="outline" onClick={() => setReplyStatus(reply.id, "hidden")}>
                        Hide
                      </Button>
                    )}
                    {reply.status !== "removed" && (
                      <Button size="sm" variant="outline" onClick={() => setReplyStatus(reply.id, "removed")}>
                        Remove
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setUserStatus(reply.author_email, "muted")}
                    >
                      Mute author
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setUserStatus(reply.author_email, "banned")}
                    >
                      Ban author
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
