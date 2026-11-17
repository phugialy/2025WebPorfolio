import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// A plain function (not a vi.fn) so a session that throws is just a rejected promise.
let session: () => Promise<unknown> = async () => null;
vi.mock("@/lib/auth", () => ({ auth: () => session() }));

import { middleware } from "../../middleware";

const request = (path: string) => new NextRequest(`https://www.phugialy.com${path}`);

describe("the admin-only /work pages", () => {
  beforeEach(() => {
    session = async () => null;
  });

  it("send a visitor who is not the admin to the homepage instead of a bare Not found", async () => {
    for (const path of ["/work", "/work/some-project"]) {
      const response = await middleware(request(path));
      expect(response.status, path).toBe(307);
      expect(new URL(response.headers.get("location") ?? "").pathname, path).toBe("/");
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
  });

  it("also redirect a signed-in user who is not an admin", async () => {
    session = async () => ({ user: { isAdmin: false } });
    expect((await middleware(request("/work"))).status).toBe(307);
  });

  it("redirect when the session cannot be read", async () => {
    session = async () => {
      throw new Error("session unavailable");
    };
    expect((await middleware(request("/work"))).status).toBe(307);
  });

  it("let the admin through", async () => {
    session = async () => ({ user: { isAdmin: true } });
    const response = await middleware(request("/work/some-project"));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("leave other paths that merely start with the same letters alone", async () => {
    const response = await middleware(request("/workshop"));
    expect(response.headers.get("location")).toBeNull();
  });
});
