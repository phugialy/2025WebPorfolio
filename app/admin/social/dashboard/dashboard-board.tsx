"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Read-only dashboard for the social-agent subsystem -- modeled directly on
// app/admin/seo/seo-board.tsx's pattern (stat cards + tables, one admin API
// route feeding it). See app/api/admin/social/dashboard/route.ts for
// exactly which already-existing functions each section reuses.

type RecentRun = {
  id: string;
  job: string;
  ok: boolean;
  summary: Record<string, unknown> | null;
  createdAt: string;
};

type BrandProfile = {
  found: boolean;
  account_id?: string;
  voice_description?: string;
  tone_guidelines?: string[];
  banned_topics?: string[];
  disclosure_template?: string;
  error?: string;
};

type GuardrailConfig = {
  maxRevisionPasses: number;
  dailyOpenRouterSpendCapUsd: number;
  minSignalScoreToDraft: number;
};

type DashboardData = {
  accountId: string | null;
  accountError: string | null;
  recentRuns: { runs: RecentRun[] } | { error: string };
  brandProfile: BrandProfile;
  guardrailConfig: GuardrailConfig;
  queue: { pendingCount: number; migrationPending: boolean } | { error: string };
  spend: { trailing24hUsd: number; dailySpendCapUsd: number } | { error: string };
};

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardHeader className="gap-1">
        <CardDescription className="text-xs uppercase tracking-wide">{label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
        {hint && <CardDescription className="text-xs">{hint}</CardDescription>}
      </CardHeader>
    </Card>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export function DashboardBoard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/social/dashboard")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) {
          setError(json.error);
        } else {
          setData(json);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load");
        setLoading(false);
      });
  }, []);

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase text-primary">Admin Control Center</p>
        <h1 className="mt-2 font-display text-4xl font-bold">Social Agent Dashboard</h1>
        <p className="mt-3 text-muted-foreground">
          Read-only view of what the social media manager agent has been doing -- recent pipeline
          runs, the current guardrail config and brand voice, the approval queue, and spend against
          the daily cap.
        </p>
        <p className="mt-2 text-sm">
          <Link href="/admin/social/queue" className="text-primary hover:underline">
            Approval queue
          </Link>{" "}
          ·{" "}
          <Link href="/admin/social/settings" className="text-primary hover:underline">
            Brand settings
          </Link>
        </p>

        {loading && <p className="mt-8 text-muted-foreground">Loading...</p>}
        {error && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Couldn&apos;t load the dashboard</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        )}

        {data && (
          <div className="mt-8 grid gap-6">
            {data.accountError && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">No social account resolved</CardTitle>
                  <CardDescription>
                    {data.accountError} Account-scoped sections (recent runs, brand profile) can&apos;t
                    render until this resolves; guardrail config and the queue count don&apos;t depend on
                    an account and still show below.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Queue pending"
                value={"pendingCount" in data.queue ? String(data.queue.pendingCount) : "—"}
                hint={"error" in data.queue ? data.queue.error : "awaiting review"}
              />
              <StatCard
                label="Trailing 24h spend"
                value={"trailing24hUsd" in data.spend ? `$${data.spend.trailing24hUsd.toFixed(2)}` : "—"}
                hint={
                  "dailySpendCapUsd" in data.spend
                    ? `cap $${data.spend.dailySpendCapUsd.toFixed(2)}`
                    : "error" in data.spend
                      ? data.spend.error
                      : undefined
                }
              />
              <StatCard label="Max revision passes" value={String(data.guardrailConfig.maxRevisionPasses)} />
              <StatCard
                label="Min signal score to draft"
                value={`${data.guardrailConfig.minSignalScoreToDraft} / 5`}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Guardrail configuration</CardTitle>
                <CardDescription>
                  Read-only -- reported directly from social-agent/pipeline/guardrail.ts and
                  reliability/watchdog.ts&apos;s own constants (the same values the MCP server&apos;s
                  get_guardrail_config tool exposes). These are the actual safety mechanism and are not
                  editable from any admin UI, including this one.
                </CardDescription>
              </CardHeader>
              <div className="px-6 pb-6 text-sm">
                <dl className="grid gap-2 sm:grid-cols-3">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Max revision passes</dt>
                    <dd className="tabular-nums">{data.guardrailConfig.maxRevisionPasses}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      Daily OpenRouter spend cap
                    </dt>
                    <dd className="tabular-nums">${data.guardrailConfig.dailyOpenRouterSpendCapUsd.toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      Min signal score to draft
                    </dt>
                    <dd className="tabular-nums">{data.guardrailConfig.minSignalScoreToDraft} / 5</dd>
                  </div>
                </dl>
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Brand profile</CardTitle>
                <CardDescription>
                  Read-only summary -- edit this on the{" "}
                  <Link href="/admin/social/settings" className="text-primary hover:underline">
                    settings page
                  </Link>
                  .
                </CardDescription>
              </CardHeader>
              <div className="px-6 pb-6 text-sm">
                {data.brandProfile.error && <p className="text-destructive">{data.brandProfile.error}</p>}
                {!data.brandProfile.found && !data.brandProfile.error && (
                  <p className="text-muted-foreground">No brand profile set yet.</p>
                )}
                {data.brandProfile.found && (
                  <div className="grid gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Voice</p>
                      <p>{data.brandProfile.voice_description || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Tone guidelines</p>
                      <p>{data.brandProfile.tone_guidelines?.join(", ") || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Banned topics</p>
                      <p>{data.brandProfile.banned_topics?.join(", ") || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Disclosure template</p>
                      <p>{data.brandProfile.disclosure_template || "—"}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent runs</CardTitle>
                <CardDescription>Last 20 social_runs rows for this account, most recent first.</CardDescription>
              </CardHeader>
              <div className="overflow-x-auto px-6 pb-6">
                {"error" in data.recentRuns && <p className="text-sm text-destructive">{data.recentRuns.error}</p>}
                {"runs" in data.recentRuns && data.recentRuns.runs.length === 0 && (
                  <p className="text-sm text-muted-foreground">No runs logged yet.</p>
                )}
                {"runs" in data.recentRuns && data.recentRuns.runs.length > 0 && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="py-2 pr-3">Job</th>
                        <th className="py-2 pr-3">Result</th>
                        <th className="py-2 pr-3 text-right">Cost</th>
                        <th className="py-2 pr-3">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentRuns.runs.map((run) => {
                        const costUsd = typeof run.summary?.costUsd === "number" ? run.summary.costUsd : null;
                        return (
                          <tr key={run.id} className="border-b last:border-0">
                            <td className="py-2 pr-3 font-medium">{run.job}</td>
                            <td className="py-2 pr-3">
                              <span
                                className={
                                  run.ok
                                    ? "rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                                    : "rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
                                }
                              >
                                {run.ok ? "ok" : "failed"}
                              </span>
                            </td>
                            <td className="py-2 pr-3 text-right tabular-nums">
                              {costUsd !== null ? `$${costUsd.toFixed(3)}` : "—"}
                            </td>
                            <td className="py-2 pr-3 text-muted-foreground">{formatDate(run.createdAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
