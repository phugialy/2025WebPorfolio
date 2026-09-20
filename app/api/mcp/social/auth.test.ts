import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isAuthorizedSocialMcpRequest } from "./auth";

function requestWithHeaders(headers: Record<string, string>): Request {
  return new Request("https://example.com/api/mcp/social", { headers });
}

beforeEach(() => {
  vi.stubEnv("SOCIAL_MCP_API_KEY", "");
  vi.stubEnv("NODE_ENV", "test");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isAuthorizedSocialMcpRequest", () => {
  it("fails open outside production when SOCIAL_MCP_API_KEY isn't set, same convention as isAuthorizedCronRequest", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isAuthorizedSocialMcpRequest(requestWithHeaders({}))).toBe(true);
  });

  it("fails closed in production when SOCIAL_MCP_API_KEY isn't set", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isAuthorizedSocialMcpRequest(requestWithHeaders({}))).toBe(false);
  });

  it("accepts a matching Authorization: Bearer header once the key is configured", () => {
    vi.stubEnv("SOCIAL_MCP_API_KEY", "real-secret");
    vi.stubEnv("NODE_ENV", "production");
    expect(isAuthorizedSocialMcpRequest(requestWithHeaders({ authorization: "Bearer real-secret" }))).toBe(true);
  });

  it("accepts a matching x-api-key header once the key is configured", () => {
    vi.stubEnv("SOCIAL_MCP_API_KEY", "real-secret");
    vi.stubEnv("NODE_ENV", "production");
    expect(isAuthorizedSocialMcpRequest(requestWithHeaders({ "x-api-key": "real-secret" }))).toBe(true);
  });

  it("rejects a wrong or missing credential once the key is configured", () => {
    vi.stubEnv("SOCIAL_MCP_API_KEY", "real-secret");
    vi.stubEnv("NODE_ENV", "production");
    expect(isAuthorizedSocialMcpRequest(requestWithHeaders({ authorization: "Bearer wrong" }))).toBe(false);
    expect(isAuthorizedSocialMcpRequest(requestWithHeaders({}))).toBe(false);
  });

  it("never authorizes off of CRON_SECRET -- this is a distinct secret", () => {
    vi.stubEnv("SOCIAL_MCP_API_KEY", "real-secret");
    vi.stubEnv("CRON_SECRET", "real-secret");
    vi.stubEnv("NODE_ENV", "production");
    // Even though CRON_SECRET happens to equal the real secret in this test,
    // this function must never read CRON_SECRET at all -- proven by clearing
    // SOCIAL_MCP_API_KEY specifically and confirming auth then fails even
    // though a bearer token matching the (irrelevant) CRON_SECRET is sent.
    vi.stubEnv("SOCIAL_MCP_API_KEY", "");
    expect(isAuthorizedSocialMcpRequest(requestWithHeaders({ authorization: "Bearer real-secret" }))).toBe(false);
  });
});
