import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createZernioPlatform } from "./zernio-platform";

// SAFETY: every test in this file mocks `fetch` directly -- none of them,
// under any circumstance, makes a real network call to api.zernio.com. This
// is deliberate and load-bearing, not incidental: a real Zernio account
// (with a real Facebook Page and a real Instagram Business account
// connected) is wired to ZERNIO_API_KEY in this project's real environment,
// so a live call from an automated test run would create real state in a
// live account. `global.fetch` is stubbed with a `vi.fn()` in every test
// below and asserted on directly (URL, method, body) instead of ever being
// allowed to reach the network.

const REAL_FETCH_SHOULD_NEVER_BE_CALLED = () => {
  throw new Error(
    "A test in zernio-platform.test.ts attempted a real network call -- fetch must always be mocked in this file.",
  );
};

beforeEach(() => {
  vi.stubEnv("ZERNIO_API_KEY", "test-key");
  vi.stubGlobal("fetch", vi.fn(REAL_FETCH_SHOULD_NEVER_BE_CALLED));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("createZernioPlatform", () => {
  it("returns null when ZERNIO_API_KEY is not set (same convention as createSupabaseAdminClient)", () => {
    vi.stubEnv("ZERNIO_API_KEY", "");
    expect(createZernioPlatform()).toBeNull();
  });

  it("returns a real Platform implementation when ZERNIO_API_KEY is set", () => {
    expect(createZernioPlatform()).not.toBeNull();
  });
});

describe("createPost", () => {
  it("defaults to isDraft: true and never sends publishNow when no scheduledFor is given", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe("https://api.zernio.com/v1/posts");
      expect(init?.method).toBe("POST");
      const body = JSON.parse(init!.body as string);
      expect(body.isDraft).toBe(true);
      expect(body.publishNow).toBeUndefined();
      expect(body.scheduledFor).toBeUndefined();
      expect(body.platforms).toEqual([{ platform: "twitter", accountId: "acct-1" }]);
      expect(body.content).toBe("hello world");
      return jsonResponse({ post: { _id: "post-123", status: "draft" } }, 201);
    });
    vi.stubGlobal("fetch", fetchMock);

    const platform = createZernioPlatform()!;
    const result = await platform.createPost({ accountId: "acct-1", platform: "x", text: "hello world" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ platformPostId: "post-123", status: "scheduled" });
  });

  it("maps our platform slugs to Zernio's (x -> twitter, others identity)", async () => {
    const seen: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(init!.body as string);
        seen.push(body.platforms[0].platform);
        return jsonResponse({ post: { _id: "p", status: "draft" } }, 201);
      }),
    );
    const platform = createZernioPlatform()!;

    for (const p of ["instagram", "facebook", "linkedin", "x"] as const) {
      await platform.createPost({ accountId: "acct-1", platform: p, text: "t" });
    }

    expect(seen).toEqual(["instagram", "facebook", "linkedin", "twitter"]);
  });

  it("sends scheduledFor (not isDraft, not publishNow) when the caller provides one", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(init!.body as string);
      expect(body.scheduledFor).toBe("2026-10-01T12:00:00Z");
      expect(body.isDraft).toBeUndefined();
      expect(body.publishNow).toBeUndefined();
      return jsonResponse({ post: { _id: "post-456", status: "scheduled" } }, 201);
    });
    vi.stubGlobal("fetch", fetchMock);

    const platform = createZernioPlatform()!;
    const result = await platform.createPost({
      accountId: "acct-1",
      platform: "linkedin",
      text: "scheduled post",
      scheduledFor: "2026-10-01T12:00:00Z",
    });

    expect(result).toEqual({ platformPostId: "post-456", status: "scheduled" });
  });

  it("maps published/partial -> published and failed/cancelled -> failed", async () => {
    const platform = createZernioPlatform()!;

    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ post: { _id: "p1", status: "published" } }, 201)));
    expect((await platform.createPost({ accountId: "a", platform: "x", text: "t" })).status).toBe("published");

    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ post: { _id: "p2", status: "partial" } }, 207)));
    expect((await platform.createPost({ accountId: "a", platform: "x", text: "t" })).status).toBe("published");

    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ post: { _id: "p3", status: "failed" } }, 207)));
    expect((await platform.createPost({ accountId: "a", platform: "x", text: "t" })).status).toBe("failed");

    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ post: { _id: "p4", status: "cancelled" } }, 200)));
    expect((await platform.createPost({ accountId: "a", platform: "x", text: "t" })).status).toBe("failed");
  });

  it("throws when the response has no post._id", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ message: "weird" }, 201)));
    const platform = createZernioPlatform()!;
    await expect(platform.createPost({ accountId: "a", platform: "x", text: "t" })).rejects.toThrow(/post\._id/);
  });

  it("throws with status and body on a non-2xx response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: "bad request" }, 400)));
    const platform = createZernioPlatform()!;
    await expect(platform.createPost({ accountId: "a", platform: "x", text: "t" })).rejects.toThrow(/400/);
  });
});

describe("getAnalytics", () => {
  it("calls GET /v1/analytics?postId=... and maps clicks -> linkClicks", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe("https://api.zernio.com/v1/analytics?postId=post-123");
      expect(init?.method ?? "GET").toBe("GET");
      return jsonResponse({
        analytics: { impressions: 100, clicks: 5, likes: 10, comments: 2, shares: 1 },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const platform = createZernioPlatform()!;
    const analytics = await platform.getAnalytics("post-123");

    expect(analytics).toEqual({ impressions: 100, linkClicks: 5, likes: 10, comments: 2, shares: 1 });
  });

  it("returns an all-undefined Analytics object when the response has no analytics field", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({})));
    const platform = createZernioPlatform()!;
    const analytics = await platform.getAnalytics("post-x");
    expect(analytics).toEqual({
      impressions: undefined,
      linkClicks: undefined,
      likes: undefined,
      comments: undefined,
      shares: undefined,
    });
  });
});

describe("listInbox", () => {
  it("filters to platforms this project models and maps twitter -> x", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(url).toBe("https://api.zernio.com/v1/inbox/conversations?accountId=acct-1");
        return jsonResponse({
          data: [
            {
              id: "conv-1",
              platform: "instagram",
              accountId: "acct-1",
              participantName: "Jane",
              lastMessage: "hi there",
              updatedTime: "2026-09-01T00:00:00Z",
            },
            {
              id: "conv-2",
              platform: "twitter",
              accountId: "acct-1",
              participantId: "user-2",
              lastMessage: "hello",
              updatedTime: "2026-09-02T00:00:00Z",
            },
            {
              id: "conv-3",
              platform: "whatsapp",
              accountId: "acct-1",
              lastMessage: "not modeled",
              updatedTime: "2026-09-03T00:00:00Z",
            },
          ],
        });
      }),
    );

    const platform = createZernioPlatform()!;
    const items = await platform.listInbox("acct-1");

    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      id: "conv-1",
      accountId: "acct-1",
      platform: "instagram",
      fromHandle: "Jane",
      text: "hi there",
      receivedAt: "2026-09-01T00:00:00Z",
    });
    expect(items[1]).toEqual({
      id: "conv-2",
      accountId: "acct-1",
      platform: "x",
      fromHandle: "user-2",
      text: "hello",
      receivedAt: "2026-09-02T00:00:00Z",
    });
  });
});

describe("reply", () => {
  it("looks up the conversation's accountId from an unfiltered list, then sends the message", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push(url);
        if (url === "https://api.zernio.com/v1/inbox/conversations") {
          return jsonResponse({
            data: [{ id: "conv-1", accountId: "acct-1", platform: "instagram" }],
          });
        }
        if (url === "https://api.zernio.com/v1/inbox/conversations/conv-1/messages") {
          expect(init?.method).toBe("POST");
          const body = JSON.parse(init!.body as string);
          expect(body).toEqual({ accountId: "acct-1", message: "thanks!" });
          return jsonResponse({ message: "sent" });
        }
        throw new Error(`unexpected fetch to ${url}`);
      }),
    );

    const platform = createZernioPlatform()!;
    await platform.reply("conv-1", "thanks!");

    expect(calls).toEqual([
      "https://api.zernio.com/v1/inbox/conversations",
      "https://api.zernio.com/v1/inbox/conversations/conv-1/messages",
    ]);
  });

  it("throws when the conversation can't be found in the unfiltered list", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ data: [] })));
    const platform = createZernioPlatform()!;
    await expect(platform.reply("missing-conv", "hi")).rejects.toThrow(/could not resolve an accountId/);
  });
});
