import { beforeEach, describe, expect, it } from "vitest";
import {
  createNewsletterService,
  type NewSubscriber,
  type OutgoingEmail,
  type Subscriber,
  type SubscriberStore,
} from "./newsletter-service";

class MemoryStore implements SubscriberStore {
  rows: (Subscriber & { source?: string; source_slug?: string | null; utm_campaign?: string | null; created: number })[] = [];
  private n = 0;
  clock: () => number;
  constructor(clock: () => number) {
    this.clock = clock;
  }
  async findByEmail(email: string) {
    return this.rows.find((r) => r.email === email) ?? null;
  }
  async findByConfirmToken(token: string) {
    return this.rows.find((r) => r.confirm_token === token) ?? null;
  }
  async findByUnsubscribeToken(token: string) {
    return this.rows.find((r) => r.unsubscribe_token === token) ?? null;
  }
  async insert(row: NewSubscriber) {
    if (this.rows.some((r) => r.email === row.email)) {
      throw Object.assign(new Error("dup"), { code: "duplicate" });
    }
    this.n += 1;
    const hex = (c: string) => c.repeat(64);
    const created = {
      id: `id-${this.n}`,
      email: row.email,
      status: "pending" as const,
      confirm_token: hex(String(this.n % 10)),
      unsubscribe_token: hex("abcdef"[this.n % 6]),
      confirm_sent_at: null,
      source: row.source,
      source_slug: row.source_slug,
      utm_campaign: row.utm_campaign,
      created: this.clock(),
    };
    this.rows.push(created);
    return created;
  }
  async update(id: string, patch: Record<string, unknown>) {
    const row = this.rows.find((r) => r.id === id);
    if (!row) throw new Error("missing");
    Object.assign(row, patch);
  }
  async countPendingSince(iso: string) {
    const since = Date.parse(iso);
    return this.rows.filter((r) => r.status === "pending" && r.created >= since).length;
  }
}

let time = Date.parse("2026-10-20T12:00:00Z");
let sent: OutgoingEmail[];
let store: MemoryStore;
let failSend = false;
let svc: ReturnType<typeof createNewsletterService>;

function build(extra: Partial<Parameters<typeof createNewsletterService>[0]> = {}) {
  svc = createNewsletterService({
    store,
    siteUrl: "https://www.phugialy.com/",
    mailingAddress: "PO Box 1, Dallas, TX 75201",
    now: () => time,
    log: () => {},
    send: async (mail) => {
      if (failSend) throw new Error("resend down");
      sent.push(mail);
    },
    recentArticles: async () => [
      { title: "A", url: "https://www.phugialy.com/blog/a" },
      { title: "B", url: "https://www.phugialy.com/blog/b" },
      { title: "C", url: "https://www.phugialy.com/blog/c" },
      { title: "D", url: "https://www.phugialy.com/blog/d" },
    ],
    ...extra,
  });
}

beforeEach(() => {
  time = Date.parse("2026-10-20T12:00:00Z");
  sent = [];
  failSend = false;
  store = new MemoryStore(() => time);
  build();
});

describe("subscribe", () => {
  it("rejects an invalid email without touching the store or sending", async () => {
    expect(await svc.subscribe({ email: "nope" })).toBe("invalid_email");
    expect(store.rows).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it("stores a pending row with attribution and sends one confirmation", async () => {
    expect(
      await svc.subscribe({ email: " Reader@Example.com ", source: "bar", slug: "/blog/x?utm=1", utmCampaign: "fall-ad" })
    ).toBe("ok");
    expect(store.rows).toHaveLength(1);
    const row = store.rows[0];
    expect(row).toMatchObject({ email: "reader@example.com", status: "pending", source: "bar", source_slug: "/blog/x", utm_campaign: "fall-ad" });
    expect(row.confirm_sent_at).not.toBeNull();
    expect(sent).toHaveLength(1);
    expect(sent[0].from).toContain("phu@phugialy.com");
    expect(sent[0].to).toBe("reader@example.com");
    expect(sent[0].html).toContain(`newsletter/confirm?token=${row.confirm_token}`);
    expect(sent[0].html).toContain("PO Box 1");
  });

  it("does not re-send inside the cooldown, and re-sends the same link after it", async () => {
    await svc.subscribe({ email: "r@example.com" });
    await svc.subscribe({ email: "r@example.com" });
    expect(sent).toHaveLength(1);
    time += 11 * 60 * 1000;
    await svc.subscribe({ email: "r@example.com" });
    expect(sent).toHaveLength(2);
    expect(sent[1].html).toContain(store.rows[0].confirm_token);
    expect(store.rows).toHaveLength(1);
  });

  it("answers an already-active address the same way, with no email", async () => {
    await svc.subscribe({ email: "a@example.com" });
    await svc.confirm(store.rows[0].confirm_token);
    sent = [];
    expect(await svc.subscribe({ email: "a@example.com" })).toBe("ok");
    expect(sent).toHaveLength(0);
  });

  it("sends nothing to a bounced address", async () => {
    await svc.subscribe({ email: "b@example.com" });
    store.rows[0].status = "bounced";
    sent = [];
    expect(await svc.subscribe({ email: "b@example.com" })).toBe("ok");
    expect(sent).toHaveLength(0);
  });

  it("lets an unsubscribed address re-subscribe with fresh tokens", async () => {
    await svc.subscribe({ email: "u@example.com" });
    const oldConfirm = store.rows[0].confirm_token;
    const oldUnsub = store.rows[0].unsubscribe_token;
    await svc.confirm(oldConfirm);
    await svc.unsubscribe(oldUnsub);
    sent = [];
    expect(await svc.subscribe({ email: "u@example.com" })).toBe("ok");
    const row = store.rows[0];
    expect(row.status).toBe("pending");
    expect(row.confirm_token).not.toBe(oldConfirm);
    expect(row.unsubscribe_token).not.toBe(oldUnsub);
    expect(sent).toHaveLength(1);
    expect(await svc.confirm(oldConfirm)).toBe("invalid");
  });

  it("reports send_failed when the mailer is down, and does not mark the confirmation as sent", async () => {
    failSend = true;
    expect(await svc.subscribe({ email: "f@example.com" })).toBe("send_failed");
    expect(store.rows[0].confirm_sent_at).toBeNull();
    failSend = false;
    expect(await svc.subscribe({ email: "f@example.com" })).toBe("ok");
    expect(sent).toHaveLength(1);
  });

  it("stops sending confirmations once 50 unconfirmed signups arrive within an hour", async () => {
    for (let i = 0; i < 50; i++) {
      await svc.subscribe({ email: `bulk${i}@example.com` });
    }
    expect(sent).toHaveLength(50);
    expect(await svc.subscribe({ email: "late@example.com" })).toBe("ok");
    expect(sent).toHaveLength(50);
    expect(store.rows.find((r) => r.email === "late@example.com")).toBeUndefined();
  });

  it("treats a lost insert race as success", async () => {
    const racing: SubscriberStore = {
      ...store,
      findByEmail: async () => null,
      findByConfirmToken: store.findByConfirmToken.bind(store),
      findByUnsubscribeToken: store.findByUnsubscribeToken.bind(store),
      insert: async () => {
        throw Object.assign(new Error("dup"), { code: "duplicate" });
      },
      update: store.update.bind(store),
      countPendingSince: async () => 0,
    };
    build({ store: racing });
    expect(await svc.subscribe({ email: "race@example.com" })).toBe("ok");
    expect(sent).toHaveLength(0);
  });
});

describe("confirm", () => {
  it("activates a pending subscriber and sends exactly one welcome email with unsubscribe headers", async () => {
    await svc.subscribe({ email: "c@example.com" });
    sent = [];
    expect(await svc.confirm(store.rows[0].confirm_token)).toBe("confirmed");
    expect(store.rows[0].status).toBe("active");
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toMatch(/you're in/i);
    expect(sent[0].headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(sent[0].html).toContain("newsletter/unsubscribe?token=");
    // only three articles are listed even though four were available
    expect(sent[0].html.match(/blog\/[a-d]"/g)).toHaveLength(3);
  });

  it("is harmless to click twice: second click says already and sends nothing", async () => {
    await svc.subscribe({ email: "c@example.com" });
    const token = store.rows[0].confirm_token;
    await svc.confirm(token);
    sent = [];
    expect(await svc.confirm(token)).toBe("already");
    expect(sent).toHaveLength(0);
  });

  it("rejects malformed and unknown tokens", async () => {
    expect(await svc.confirm("short")).toBe("invalid");
    expect(await svc.confirm(undefined)).toBe("invalid");
    expect(await svc.confirm("f".repeat(64))).toBe("invalid");
  });

  it("rejects an expired link and leaves the subscriber pending", async () => {
    await svc.subscribe({ email: "e@example.com" });
    time += 8 * 24 * 60 * 60 * 1000;
    expect(await svc.confirm(store.rows[0].confirm_token)).toBe("expired");
    expect(store.rows[0].status).toBe("pending");
  });

  it("still confirms when the welcome email fails", async () => {
    await svc.subscribe({ email: "w@example.com" });
    failSend = true;
    expect(await svc.confirm(store.rows[0].confirm_token)).toBe("confirmed");
    expect(store.rows[0].status).toBe("active");
  });
});

describe("unsubscribe", () => {
  it("unsubscribes, and repeating is harmless", async () => {
    await svc.subscribe({ email: "x@example.com" });
    await svc.confirm(store.rows[0].confirm_token);
    const token = store.rows[0].unsubscribe_token;
    expect(await svc.unsubscribe(token)).toBe("unsubscribed");
    expect(store.rows[0].status).toBe("unsubscribed");
    expect(await svc.unsubscribe(token)).toBe("unsubscribed");
  });

  it("an unconfirmed subscriber can also opt out", async () => {
    await svc.subscribe({ email: "p@example.com" });
    expect(await svc.unsubscribe(store.rows[0].unsubscribe_token)).toBe("unsubscribed");
  });

  it("a bad token changes nothing", async () => {
    await svc.subscribe({ email: "keep@example.com" });
    expect(await svc.unsubscribe("nope")).toBe("invalid");
    expect(await svc.unsubscribe("e".repeat(64))).toBe("invalid");
    expect(store.rows[0].status).toBe("pending");
  });
});
