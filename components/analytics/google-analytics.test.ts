import { describe, expect, it } from "vitest";
import { LIVE_HOSTS, analyticsSnippet } from "./google-analytics";

// Runs the real inline script against a fake browser, for a given hostname.
function run(hostname: string) {
  const appended: { src?: string }[] = [];
  const win: Record<string, unknown> = { location: { hostname } };
  const doc = {
    createElement: () => ({}) as { src?: string },
    head: { appendChild: (el: { src?: string }) => appended.push(el) },
  };
  new Function("window", "document", analyticsSnippet("G-TEST123"))(win, doc);
  return { win, appended };
}

describe("Google Analytics only runs on the live site", () => {
  it("does nothing on localhost: no tag, no gtag, no data layer", () => {
    const { win, appended } = run("localhost");
    expect(appended).toHaveLength(0);
    expect(win.gtag).toBeUndefined();
    expect(win.dataLayer).toBeUndefined();
  });

  it("does nothing on a preview deployment", () => {
    const { win, appended } = run("2025-web-porfolio-abc123-phulys-projects.vercel.app");
    expect(appended).toHaveLength(0);
    expect(win.gtag).toBeUndefined();
  });

  it("does nothing on a look-alike host", () => {
    expect(run("phugialy.com.evil.example").appended).toHaveLength(0);
    expect(run("notphugialy.com").appended).toHaveLength(0);
  });

  it.each(LIVE_HOSTS)("loads the tag and configures the property on %s", (host) => {
    const { win, appended } = run(host);
    expect(appended).toHaveLength(1);
    expect(appended[0].src).toBe("https://www.googletagmanager.com/gtag/js?id=G-TEST123");
    expect(typeof win.gtag).toBe("function");
    const layer = win.dataLayer as ArrayLike<unknown>[];
    expect(Array.from(layer[0])[0]).toBe("js");
    expect(Array.from(layer[1])).toEqual(["config", "G-TEST123"]);
  });
});
