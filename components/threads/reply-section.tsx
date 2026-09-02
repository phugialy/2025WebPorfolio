"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Reply = {
  id: string;
  parent_reply_id: string | null;
  author_name: string;
  author_image: string | null;
  body: string;
  created_at: string;
};

function ReplyItem({ reply, childReplies }: { reply: Reply; childReplies: Reply[] }) {
  return (
    <div className="grid gap-3">
      <div className="flex gap-3">
        {reply.author_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={reply.author_image} alt={reply.author_name} className="h-8 w-8 flex-none rounded-full" />
        ) : (
          <div className="h-8 w-8 flex-none rounded-full bg-primary/10" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold">{reply.author_name}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(reply.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{reply.body}</p>
        </div>
      </div>
      {childReplies.length > 0 && (
        <div className="ml-11 grid gap-3 border-l pl-4">
          {childReplies.map((child) => (
            <ReplyItem key={child.id} reply={child} childReplies={[]} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ReplySection({ threadId, initialReplies }: { threadId: string; initialReplies: Reply[] }) {
  const { data: session, status } = useSession();
  const [replies, setReplies] = useState(initialReplies);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topLevel = replies.filter((r) => !r.parent_reply_id);
  const childrenOf = (id: string) => replies.filter((r) => r.parent_reply_id === id);

  const submit = async () => {
    if (!body.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/threads/${threadId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to post reply");
      }
      setReplies((current) => [...current, data.reply]);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post reply");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-10 border-t pt-8">
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
        <MessageCircle className="h-4 w-4 text-primary" />
        Discussion {topLevel.length > 0 ? `(${replies.length})` : ""}
      </h2>

      <div className="grid gap-5">
        {topLevel.length === 0 ? (
          <p className="text-sm text-muted-foreground">No replies yet.</p>
        ) : (
          topLevel.map((reply) => <ReplyItem key={reply.id} reply={reply} childReplies={childrenOf(reply.id)} />)
        )}
      </div>

      <div className="mt-6">
        {status === "loading" ? null : session?.user ? (
          <div className="grid gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add to the discussion..."
              rows={3}
              maxLength={2000}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={submit} disabled={submitting || !body.trim()} className="w-fit">
              {submitting ? "Posting..." : "Reply"}
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => signIn("google")} className="w-fit">
            Sign in with Google to reply
          </Button>
        )}
      </div>
    </section>
  );
}
