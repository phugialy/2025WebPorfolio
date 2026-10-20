import { describe, expect, it } from "vitest";
import {
  CONFIRM_TTL_MS,
  RESEND_COOLDOWN_MS,
  buildConfirmationEmail,
  buildUnsubscribeHeaders,
  buildWelcomeEmail,
  canResendConfirmation,
  escapeHtml,
  isConfirmExpired,
  normalizeEmail,
  sanitizeSlug,
  sanitizeSource,
  sanitizeTag,
} from "./newsletter-core";

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Phu@Example.COM ")).toBe("phu@example.com");
  });
  it("accepts plus addressing and subdomains", () => {
    expect(normalizeEmail("a+b@mail.example.co.uk")).toBe("a+b@mail.example.co.uk");
  });
  it.each([
    "",
    "plain",
    "no-at.example.com",
    "two@@example.com",
    "space in@example.com",
    "a@b",
    "a@.com",
    "a@example..com",
    "a@example.com.",
    "<script>@example.com",
    "a,b@example.com",
    "x".repeat(65) + "@example.com",
    "a@" + "x".repeat(250) + ".com",
  ])("rejects %s", (value) => {
    expect(normalizeEmail(value)).toBeNull();
  });
  it("rejects non-strings", () => {
    expect(normalizeEmail(undefined)).toBeNull();
    expect(normalizeEmail(42)).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
  });
});

describe("sanitizers", () => {
  it("maps unknown sources to footer", () => {
    expect(sanitizeSource("bar")).toBe("bar");
    expect(sanitizeSource("end-of-article")).toBe("end-of-article");
    expect(sanitizeSource("evil")).toBe("footer");
    expect(sanitizeSource(undefined)).toBe("footer");
  });
  it("strips non-printable characters and caps length", () => {
    expect(sanitizeTag("spring\u0000​-sale")).toBe("spring-sale");
    expect(sanitizeTag("x".repeat(500))?.length).toBe(100);
    expect(sanitizeTag("   ")).toBeNull();
    expect(sanitizeTag(5)).toBeNull();
  });
  it("drops query strings and fragments from slugs", () => {
    expect(sanitizeSlug("/blog/some-article?utm_source=x#top")).toBe("/blog/some-article");
    expect(sanitizeSlug("")).toBeNull();
  });
});

describe("timing rules", () => {
  const now = Date.parse("2026-10-20T12:00:00Z");
  it("expires confirmation links after 7 days", () => {
    expect(isConfirmExpired(new Date(now - CONFIRM_TTL_MS + 1000).toISOString(), now)).toBe(false);
    expect(isConfirmExpired(new Date(now - CONFIRM_TTL_MS - 1000).toISOString(), now)).toBe(true);
    expect(isConfirmExpired(null, now)).toBe(false);
  });
  it("limits how often a confirmation is re-sent", () => {
    expect(canResendConfirmation(new Date(now - 60_000).toISOString(), now)).toBe(false);
    expect(canResendConfirmation(new Date(now - RESEND_COOLDOWN_MS).toISOString(), now)).toBe(true);
    expect(canResendConfirmation(null, now)).toBe(true);
  });
});

describe("emails", () => {
  it("builds the one-click unsubscribe headers", () => {
    const headers = buildUnsubscribeHeaders("https://www.phugialy.com/api/newsletter/unsubscribe?token=abc");
    expect(headers["List-Unsubscribe"]).toContain("<https://www.phugialy.com/api/newsletter/unsubscribe?token=abc>");
    expect(headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });
  it("confirmation email carries the confirm link, the privacy link, and an HTML and text body", () => {
    const mail = buildConfirmationEmail({
      confirmUrl: "https://www.phugialy.com/newsletter/confirm?token=t1",
      privacyUrl: "https://www.phugialy.com/privacy",
      address: "PO Box 1, Dallas, TX 75201",
    });
    expect(mail.subject).toMatch(/confirm/i);
    expect(mail.html).toContain("newsletter/confirm?token=t1");
    expect(mail.text).toContain("newsletter/confirm?token=t1");
    expect(mail.html).toContain("PO Box 1, Dallas, TX 75201");
    expect(mail.text).toContain("won't be subscribed");
  });
  it("welcome email has the unsubscribe link and escapes article titles", () => {
    const mail = buildWelcomeEmail({
      articles: [{ title: "<b>Hi</b> & friends", url: "https://www.phugialy.com/blog/a" }],
      unsubscribeUrl: "https://www.phugialy.com/newsletter/unsubscribe?token=u1",
      privacyUrl: "https://www.phugialy.com/privacy",
    });
    expect(mail.html).toContain("&lt;b&gt;Hi&lt;/b&gt; &amp; friends");
    expect(mail.html).not.toContain("<b>Hi</b>");
    expect(mail.html).toContain("newsletter/unsubscribe?token=u1");
    expect(mail.text).toContain("Unsubscribe: https://www.phugialy.com/newsletter/unsubscribe?token=u1");
  });
  it("welcome email works with no articles and no address", () => {
    const mail = buildWelcomeEmail({
      articles: [],
      unsubscribeUrl: "https://x.test/u",
      privacyUrl: "https://x.test/p",
    });
    expect(mail.html).not.toContain("a few of our recent notes");
    expect(mail.text).not.toContain("undefined");
  });
  it("escapes html specials", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });
});
