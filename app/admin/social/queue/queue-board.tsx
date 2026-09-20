"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type GuardrailVerdict = {
  decision?: "publish" | "revise" | "reject";
  checks?: {
    factualAccuracy?: number;
    platformPolicyFit?: number;
    brandVoiceFit?: number;
    spamPatternRisk?: number;
  };
  disclosureRequired?: boolean;
  disclosurePresent?: boolean;
  sensitiveTopicFlags?: string[];
  reasoning?: string;
};

type SocialQueuePost = {
  id: string;
  account_id: string | null;
  platform: "instagram" | "facebook" | "linkedin" | "x";
  status: string;
  draft_copy: string | null;
  final_copy: string | null;
  guardrail_verdict: GuardrailVerdict | null;
  approved_by: string | null;
  rejection_reason: string | null;
  created_at: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export function QueueBoard() {
  const [posts, setPosts] = useState<SocialQueuePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [migrationPending, setMigrationPending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/social/queue");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load queue");
        setPosts([]);
      } else {
        setPosts(data.posts || []);
        setMigrationPending(Boolean(data.migrationPending));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const patchPost = async (id: string, body: Record<string, unknown>) => {
    setBusyId(id);
    try {
      await fetch(`/api/admin/social/queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setEditingId(null);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const approve = (post: SocialQueuePost) => {
    if (!confirm(`Approve and publish this ${post.platform} post?`)) return;
    patchPost(post.id, { action: "approve" });
  };

  const reject = (post: SocialQueuePost) => {
    const reason = prompt("Reason for rejecting this draft?") || "";
    patchPost(post.id, { action: "reject", rejectionReason: reason });
  };

  const startEdit = (post: SocialQueuePost) => {
    setEditingId(post.id);
    setEditText(post.final_copy || post.draft_copy || "");
  };

  const saveEdit = (post: SocialQueuePost) => {
    if (!editText.trim()) return;
    patchPost(post.id, { action: "edit", draftCopy: editText });
  };

  const saveAndApprove = (post: SocialQueuePost) => {
    if (!editText.trim()) return;
    patchPost(post.id, { action: "approve", finalCopy: editText });
  };

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase text-primary">Admin Control Center</p>
        <h1 className="mt-2 font-display text-4xl font-bold">Social Approval Queue</h1>
        <p className="mt-3 text-muted-foreground">
          Agent-drafted social posts awaiting human review, oldest first. Approve to publish, edit
          the draft before approving, or reject with a reason.
        </p>

        {loading && <p className="mt-8 text-muted-foreground">Loading...</p>}

        {!loading && error && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Couldn&apos;t load the queue</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        )}

        {!loading && !error && migrationPending && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-base">Queue table not set up yet</CardTitle>
              <CardDescription>
                The <code>social_posts</code> table hasn&apos;t been created yet. Once the Phase 0
                migration is applied and the pipeline starts drafting posts, they&apos;ll show up
                here for review.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {!loading && !error && !migrationPending && posts.length === 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Queue is empty</CardTitle>
              <CardDescription>Nothing is waiting on review right now.</CardDescription>
            </CardHeader>
          </Card>
        )}

        {!loading && !error && posts.length > 0 && (
          <div className="mt-8 grid gap-3">
            {posts.map((post) => {
              const verdict = post.guardrail_verdict;
              const disclosureFlag = Boolean(verdict?.disclosureRequired && !verdict?.disclosurePresent);
              const isEditing = editingId === post.id;
              const isBusy = busyId === post.id;

              return (
                <Card key={post.id}>
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-sm capitalize">{post.platform}</CardTitle>
                        <CardDescription>{formatDate(post.created_at)}</CardDescription>
                      </div>
                      <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                        {disclosureFlag && (
                          <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                            Disclosure required
                          </span>
                        )}
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                          {post.status}
                        </span>
                      </div>
                    </div>

                    {isEditing ? (
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={5}
                        className="text-sm"
                      />
                    ) : (
                      <p className="whitespace-pre-wrap text-sm">
                        {post.final_copy || post.draft_copy || "(no draft copy)"}
                      </p>
                    )}

                    {verdict && (
                      <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground">Guardrail: {verdict.decision || "unknown"}</p>
                        {verdict.reasoning && <p className="mt-1">{verdict.reasoning}</p>}
                        {verdict.sensitiveTopicFlags && verdict.sensitiveTopicFlags.length > 0 && (
                          <p className="mt-1">Flags: {verdict.sensitiveTopicFlags.join(", ")}</p>
                        )}
                      </div>
                    )}

                    {post.rejection_reason && (
                      <p className="text-xs text-destructive">Rejected: {post.rejection_reason}</p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {isEditing ? (
                        <>
                          <Button size="sm" onClick={() => saveAndApprove(post)} disabled={isBusy}>
                            Save &amp; Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => saveEdit(post)} disabled={isBusy}>
                            Save Draft
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} disabled={isBusy}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" onClick={() => approve(post)} disabled={isBusy}>
                            Approve &amp; Publish
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => startEdit(post)} disabled={isBusy}>
                            Edit
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => reject(post)} disabled={isBusy}>
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
