import { describe, expect, it, vi } from "vitest";
import {
  DAILY_OPENROUTER_SPEND_CAP_USD,
  buildWatchdogEmail,
  evaluateSocialWatchdog,
  runSocialWatchdog,
  type SocialRunRow,
  type WatchdogEmail,
} from "./watchdog";
import type { Query, Store } from "../ports";

const NOW = new Date("2026-09-20T12:00:00.000Z");

function hoursAgo(hours: number): string {
  return new Date(NOW.getTime() - hours * 60 * 60 * 1000).toISOString();
}

function makeRun(overrides: Partial<SocialRunRow> = {}): SocialRunRow {
  return {
    id: "run-1",
    accountId: "acct-1",
    job: "signal-scan",
    ok: true,
    summary: null,
    createdAt: hoursAgo(1),
    ...overrides,
  };
}

describe("evaluateSocialWatchdog", () => {
  it("is healthy when a successful run exists within the tick window", () => {
    const result = evaluateSocialWatchdog([makeRun({ ok: true, createdAt: hoursAgo(1) })], {
      tickWindowHours: 4,
      now: NOW,
    });

    expect(result.healthy).toBe(true);
    expect(result.findings).toEqual([]);
    expect(result.lastSuccessfulRunAt).toBe(hoursAgo(1));
  });

  it("treats 'nothing to publish today' as healthy -- a successful run's summary content never triggers a finding", () => {
    const result = evaluateSocialWatchdog(
      [
        makeRun({
          ok: true,
          createdAt: hoursAgo(1),
          summary: { candidatesEvaluated: 0, discovered: 0 },
        }),
      ],
      { tickWindowHours: 4, now: NOW }
    );

    expect(result.healthy).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it("flags no_recent_activity when there are zero runs in the lookback window", () => {
    const result = evaluateSocialWatchdog([], { tickWindowHours: 4, activityLookbackHours: 12, now: NOW });

    expect(result.healthy).toBe(false);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].code).toBe("no_recent_activity");
    expect(result.lastSuccessfulRunAt).toBeNull();
  });

  it("ignores runs older than the lookback window when checking for recent activity", () => {
    const result = evaluateSocialWatchdog(
      [makeRun({ ok: true, createdAt: hoursAgo(48) })],
      { tickWindowHours: 4, activityLookbackHours: 12, now: NOW }
    );

    expect(result.findings.map((f) => f.code)).toEqual(["no_recent_activity"]);
    // Still surfaced for reporting purposes even though it's outside the window.
    expect(result.lastSuccessfulRunAt).toBe(hoursAgo(48));
  });

  it("flags stale_tick when recent runs exist but none succeeded within the window, for generic (non-credential) failures", () => {
    const result = evaluateSocialWatchdog(
      [
        makeRun({ ok: false, createdAt: hoursAgo(1), summary: { error: "RSS feed timed out" } }),
        makeRun({ ok: false, createdAt: hoursAgo(2), summary: { error: "network error" } }),
      ],
      { tickWindowHours: 4, activityLookbackHours: 12, now: NOW }
    );

    expect(result.healthy).toBe(false);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].code).toBe("stale_tick");
  });

  it("flags credential_failure instead of stale_tick when a recent failure looks auth-shaped (text heuristic)", () => {
    const result = evaluateSocialWatchdog(
      [makeRun({ ok: false, createdAt: hoursAgo(1), job: "publish", summary: { error: "401 Unauthorized" } })],
      { tickWindowHours: 4, activityLookbackHours: 12, now: NOW }
    );

    expect(result.healthy).toBe(false);
    expect(result.findings.map((f) => f.code)).toEqual(["credential_failure"]);
    expect(result.findings[0].message).toContain("publish");
  });

  it("flags credential_failure via the typed errorType field, without needing the text heuristic", () => {
    const result = evaluateSocialWatchdog(
      [makeRun({ ok: false, createdAt: hoursAgo(1), summary: { errorType: "credential", error: "something odd" } })],
      { tickWindowHours: 4, activityLookbackHours: 12, now: NOW }
    );

    expect(result.findings.map((f) => f.code)).toEqual(["credential_failure"]);
  });

  it("prefers credential_failure over stale_tick when both credential and non-credential failures are present", () => {
    const result = evaluateSocialWatchdog(
      [
        makeRun({ ok: false, createdAt: hoursAgo(1), summary: { error: "network blip" } }),
        makeRun({ ok: false, createdAt: hoursAgo(1), summary: { errorType: "credential" } }),
      ],
      { tickWindowHours: 4, activityLookbackHours: 12, now: NOW }
    );

    expect(result.findings.map((f) => f.code)).toEqual(["credential_failure"]);
  });

  it("flags cost_cap_exceeded when trailing-24h spend sums over the cap, even on an otherwise healthy tick", () => {
    const cap = 1;
    const result = evaluateSocialWatchdog(
      [
        makeRun({ ok: true, createdAt: hoursAgo(1), summary: { costUsd: 0.6 } }),
        makeRun({ ok: true, createdAt: hoursAgo(2), summary: { costUsd: 0.6 } }),
      ],
      { tickWindowHours: 4, dailySpendCapUsd: cap, now: NOW }
    );

    expect(result.healthy).toBe(false);
    expect(result.findings.map((f) => f.code)).toEqual(["cost_cap_exceeded"]);
    expect(result.dailySpendUsd).toBeCloseTo(1.2, 5);
  });

  it("does not count spend from more than 24h ago", () => {
    const result = evaluateSocialWatchdog(
      [makeRun({ ok: true, createdAt: hoursAgo(25), summary: { costUsd: 100 } })],
      { tickWindowHours: 4, activityLookbackHours: 48, dailySpendCapUsd: 1, now: NOW }
    );

    expect(result.dailySpendUsd).toBe(0);
    // Only the cost dimension is checked here; no run within the tick
    // window at all also trips stale_tick / no_recent_activity depending
    // on lookback -- this assertion only cares that cost isn't miscounted.
    expect(result.findings.some((f) => f.code === "cost_cap_exceeded")).toBe(false);
  });

  it("uses the DAILY_OPENROUTER_SPEND_CAP_USD default when no override is given", () => {
    const result = evaluateSocialWatchdog(
      [makeRun({ ok: true, createdAt: hoursAgo(1), summary: { costUsd: DAILY_OPENROUTER_SPEND_CAP_USD + 1 } })],
      { tickWindowHours: 4, now: NOW }
    );

    expect(result.findings.map((f) => f.code)).toContain("cost_cap_exceeded");
  });

  it("can report multiple simultaneous findings", () => {
    const result = evaluateSocialWatchdog(
      [
        makeRun({ ok: false, createdAt: hoursAgo(1), summary: { error: "boom", costUsd: 50 } }),
      ],
      { tickWindowHours: 4, activityLookbackHours: 12, dailySpendCapUsd: 1, now: NOW }
    );

    expect(result.healthy).toBe(false);
    expect(result.findings.map((f) => f.code).sort()).toEqual(["cost_cap_exceeded", "stale_tick"]);
  });

  it("ignores rows with an unparseable createdAt instead of throwing", () => {
    const result = evaluateSocialWatchdog(
      [makeRun({ ok: true, createdAt: "not-a-date" })],
      { tickWindowHours: 4, now: NOW }
    );

    // Falls through to no_recent_activity since the bad row is discarded,
    // not counted as recent activity.
    expect(result.findings.map((f) => f.code)).toEqual(["no_recent_activity"]);
  });
});

describe("buildWatchdogEmail", () => {
  it("includes the finding codes and messages in both text and html", () => {
    const result = evaluateSocialWatchdog([], { tickWindowHours: 4, now: NOW });
    const email: WatchdogEmail = buildWatchdogEmail(result);

    expect(email.subject).toContain("1 issue");
    expect(email.text).toContain("no_recent_activity");
    expect(email.html).toContain("no_recent_activity");
    expect(email.html).not.toContain("<script>");
  });

  it("escapes HTML-significant characters in finding messages", () => {
    const result = evaluateSocialWatchdog([], { tickWindowHours: 4, now: NOW });
    result.findings[0] = { ...result.findings[0], message: `<script>alert("x")</script>` };
    const email = buildWatchdogEmail(result);

    expect(email.html).not.toContain("<script>alert");
    expect(email.html).toContain("&lt;script&gt;");
  });
});

function makeMockStore(runs: SocialRunRow[]): Store & { lastQuery?: Query } {
  const store: Store & { lastQuery?: Query } = {
    async get() {
      return null;
    },
    async list<T>(_collection: string, query: Query): Promise<T[]> {
      store.lastQuery = query;
      return runs as unknown as T[];
    },
    async insert<T>(_collection: string, row: T): Promise<T> {
      return row;
    },
    async update<T>(_collection: string, _id: string, patch: Partial<T>): Promise<T> {
      return patch as T;
    },
  };
  return store;
}

describe("runSocialWatchdog", () => {
  it("does not send an email when healthy", async () => {
    const store = makeMockStore([makeRun({ ok: true, createdAt: hoursAgo(1) })]);
    const sendEmail = vi.fn().mockResolvedValue(undefined);

    const result = await runSocialWatchdog({ store, sendEmail, config: { tickWindowHours: 4, now: NOW } });

    expect(result.healthy).toBe(true);
    expect(result.emailSent).toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("sends an email when unhealthy, built from the evaluator's result", async () => {
    const store = makeMockStore([]);
    const sendEmail = vi.fn().mockResolvedValue(undefined);

    const result = await runSocialWatchdog({ store, sendEmail, config: { tickWindowHours: 4, now: NOW } });

    expect(result.healthy).toBe(false);
    expect(result.emailSent).toBe(true);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const sentEmail = sendEmail.mock.calls[0][0] as WatchdogEmail;
    expect(sentEmail.text).toContain("no_recent_activity");
  });

  it("reports emailSent: false and captures the error when sendEmail throws, without throwing itself", async () => {
    const store = makeMockStore([]);
    const sendEmail = vi.fn().mockRejectedValue(new Error("Resend is down"));

    const result = await runSocialWatchdog({ store, sendEmail, config: { tickWindowHours: 4, now: NOW } });

    expect(result.healthy).toBe(false);
    expect(result.emailSent).toBe(false);
    expect(result.emailError).toBe("Resend is down");
  });

  it("filters by accountId in the Store query when one is supplied", async () => {
    const store = makeMockStore([makeRun({ ok: true, createdAt: hoursAgo(1) })]);
    const sendEmail = vi.fn().mockResolvedValue(undefined);

    await runSocialWatchdog({ store, sendEmail, accountId: "acct-42", config: { tickWindowHours: 4, now: NOW } });

    expect(store.lastQuery?.filters).toEqual(
      expect.arrayContaining([{ field: "accountId", op: "eq", value: "acct-42" }])
    );
  });

  it("omits the accountId filter when no accountId is supplied, checking across all accounts", async () => {
    const store = makeMockStore([makeRun({ ok: true, createdAt: hoursAgo(1) })]);
    const sendEmail = vi.fn().mockResolvedValue(undefined);

    await runSocialWatchdog({ store, sendEmail, config: { tickWindowHours: 4, now: NOW } });

    expect(store.lastQuery?.filters?.some((f) => f.field === "accountId")).toBe(false);
  });
});
