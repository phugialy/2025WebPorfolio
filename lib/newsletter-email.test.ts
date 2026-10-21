import { describe, expect, it } from "vitest";
import {
  buildConfirmationEmail,
  buildDigestEmail,
  buildDigestSubject,
  buildWelcomeEmail,
  truncate,
} from "./newsletter-core";

const urls = { unsubscribeUrl: "https://x.test/u?token=1", privacyUrl: "https://x.test/privacy" };

describe("truncate", () => {
  it("leaves short text alone", () => {
    expect(truncate("short text", 50)).toBe("short text");
  });
  it("cuts at a word boundary with an ellipsis", () => {
    const cut = truncate("alpha beta gamma delta epsilon zeta eta theta iota kappa", 30);
    expect(cut.length).toBeLessThanOrEqual(30);
    expect(cut.endsWith("…")).toBe(true);
    expect(cut).not.toMatch(/\s…$/);
  });
});

describe("email design rules", () => {
  it("every email has a hidden preheader, a plain-text twin, dark-mode support and a 600px column", () => {
    const mails = [
      buildConfirmationEmail({ confirmUrl: "https://x.test/c?token=1", privacyUrl: urls.privacyUrl }),
      buildWelcomeEmail({ articles: [{ title: "A", url: "https://x.test/a" }], ...urls }),
      buildDigestEmail({ dateLabel: "Tue, Oct 20", items: [{ title: "A", url: "https://x.test/a" }], ...urls }),
    ];
    for (const mail of mails) {
      expect(mail.html).toContain("display:none;max-height:0");
      expect(mail.html).toContain("prefers-color-scheme: dark");
      expect(mail.html).toContain("max-width:600px");
      expect(mail.html).toContain('lang="en"');
      expect(mail.text.length).toBeGreaterThan(40);
      expect(mail.text).not.toContain("undefined");
      expect(mail.html).not.toContain("undefined");
      expect(mail.text).not.toMatch(/<[a-z]+[^>]*>/i);
    }
  });

  it("the confirmation shows its link as text too, and says it lasts 7 days", () => {
    const mail = buildConfirmationEmail({ confirmUrl: "https://x.test/c?token=abc", privacyUrl: urls.privacyUrl });
    expect(mail.html.match(/https:\/\/x\.test\/c\?token=abc/g)!.length).toBeGreaterThanOrEqual(2);
    expect(mail.html).toContain("7 days");
    expect(mail.text).toContain("7 days");
    expect(mail.html).toContain("Yes, send me the daily email");
  });

  it("the welcome email caps at three notes, shows summaries, and has an unsubscribe link", () => {
    const mail = buildWelcomeEmail({
      articles: [1, 2, 3, 4].map((n) => ({ title: "Note " + n, url: "https://x.test/n" + n, summary: "Summary " + n })),
      ...urls,
    });
    expect(mail.html).toContain("Summary 1");
    expect(mail.html).not.toContain("Note 4");
    expect(mail.text).toContain("Unsubscribe: https://x.test/u?token=1");
    expect(mail.text).toContain("phu@phugialy.com");
  });
});

describe("digest", () => {
  const base = { dateLabel: "Tue, Oct 20, 2026", ...urls };
  const items = Array.from({ length: 7 }, (_, i) => ({
    title: "Story " + (i + 1),
    url: "https://x.test/s" + (i + 1),
    summary: "About story " + (i + 1),
  }));

  it("subject leads with the top story and counts the rest", () => {
    expect(buildDigestSubject(items.slice(0, 1))).toBe("Story 1");
    expect(buildDigestSubject(items.slice(0, 3))).toBe("Story 1 (+2 more)");
    expect(buildDigestSubject([])).toBe("Phugialy daily");
  });

  it("keeps a long subject short enough for inbox previews", () => {
    expect(buildDigestSubject([{ title: "x".repeat(200), url: "u" }]).length).toBeLessThanOrEqual(60);
  });

  it("shows at most five stories: one top story and the rest under Also today", () => {
    const mail = buildDigestEmail({ ...base, items });
    expect(mail.html).toContain("Top story");
    expect(mail.html).toContain("Also today");
    expect(mail.html).toContain("Story 5");
    expect(mail.html).not.toContain("Story 6");
    expect(mail.text.indexOf("TOP STORY")).toBeLessThan(mail.text.indexOf("ALSO TODAY"));
  });

  it("uses the top story's summary as the inbox preview", () => {
    expect(buildDigestEmail({ ...base, items }).html).toContain("About story 1");
  });

  it("carries the unsubscribe link and address, and escapes titles", () => {
    const mail = buildDigestEmail({
      ...base,
      address: "PO Box 1, Dallas, TX 75201",
      items: [{ title: "<img src=x> & more", url: "https://x.test/a" }],
    });
    expect(mail.html).not.toContain("<img src=x>");
    expect(mail.html).toContain("&lt;img src=x&gt; &amp; more");
    expect(mail.html).toContain("PO Box 1, Dallas, TX 75201");
    expect(mail.text).toContain("Unsubscribe: https://x.test/u?token=1");
  });

  it("handles an empty list without crashing", () => {
    const mail = buildDigestEmail({ ...base, items: [] });
    expect(mail.subject).toBe("Phugialy daily");
    expect(mail.html).not.toContain("Top story");
  });
});
