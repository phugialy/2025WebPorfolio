import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ revalidateTag: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag: h.revalidateTag, unstable_cache: <T>(fn: T) => fn }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseReadClient: () => null, createSupabaseAdminClient: () => null }));

import { POST } from "@/app/api/revalidate/route";
import { isAuthorizedRevalidate } from "@/lib/revalidate-auth";

const request = (headers: Record<string, string> = {}) => new Request("http://localhost/api/revalidate", { method: "POST", headers });

beforeEach(() => {
  h.revalidateTag.mockClear();
  vi.stubEnv("BLOG_INGEST_API_KEY", "ingest-key");
  vi.stubEnv("CRON_SECRET", "cron-secret");
});

describe("POST /api/revalidate", () => {
  it("refuses a request with no key or the wrong one, and clears nothing", async () => {
    expect((await POST(request() as never)).status).toBe(401);
    expect((await POST(request({ "x-api-key": "nope" }) as never)).status).toBe(401);
    expect((await POST(request({ authorization: "Bearer nope" }) as never)).status).toBe(401);
    expect(h.revalidateTag).not.toHaveBeenCalled();
  });

  it("clears the article caches for either key, in either header", async () => {
    expect((await POST(request({ "x-api-key": "ingest-key" }) as never)).status).toBe(200);
    expect((await POST(request({ authorization: "Bearer cron-secret" }) as never)).status).toBe(200);
    expect(h.revalidateTag).toHaveBeenCalledTimes(2);
    expect(h.revalidateTag).toHaveBeenCalledWith("articles");
  });

  it("refuses everything when no key is configured at all", () => {
    expect(isAuthorizedRevalidate(request({ "x-api-key": "" }), {} as NodeJS.ProcessEnv)).toBe(false);
    expect(isAuthorizedRevalidate(request({ "x-api-key": "undefined" }), {} as NodeJS.ProcessEnv)).toBe(false);
  });
});
