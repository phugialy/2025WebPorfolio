import { describe, expect, it } from "vitest";
import { InMemoryStore } from "../pipeline/test-support";
import { getBrandProfile, updateBrandProfile } from "./brand-profile";

describe("getBrandProfile", () => {
  it("returns null when no row exists for the account", async () => {
    const store = new InMemoryStore();
    expect(await getBrandProfile(store, "acct-1")).toBeNull();
  });

  it("returns the account's row when one exists", async () => {
    const store = new InMemoryStore();
    store.seed("social_brand_profile", [
      { id: "bp-1", accountId: "acct-1", voice: "warm, direct", toneRules: ["no jargon"] },
    ]);

    const profile = await getBrandProfile(store, "acct-1");
    expect(profile?.voice).toBe("warm, direct");
  });

  it("does not return another account's row", async () => {
    const store = new InMemoryStore();
    store.seed("social_brand_profile", [{ id: "bp-1", accountId: "acct-OTHER", voice: "x" }]);
    expect(await getBrandProfile(store, "acct-1")).toBeNull();
  });
});

describe("updateBrandProfile", () => {
  it("inserts a new row when none exists yet, using only the given fields", async () => {
    const store = new InMemoryStore();
    const result = await updateBrandProfile(
      store,
      "acct-1",
      { voice: "playful", disclosureTemplate: "#ad" },
      () => "generated-id"
    );

    expect(result).toMatchObject({
      id: "generated-id",
      accountId: "acct-1",
      voice: "playful",
      disclosureTemplate: "#ad",
    });
    expect(store.dump("social_brand_profile")).toHaveLength(1);
  });

  it("updates an existing row in place rather than inserting a duplicate", async () => {
    const store = new InMemoryStore();
    store.seed("social_brand_profile", [
      { id: "bp-1", accountId: "acct-1", voice: "old voice", toneRules: ["rule a"] },
    ]);

    const result = await updateBrandProfile(store, "acct-1", { voice: "new voice" });

    expect(result.id).toBe("bp-1");
    expect(result.voice).toBe("new voice");
    expect(result.toneRules).toEqual(["rule a"]); // untouched field survives a partial patch
    expect(store.dump("social_brand_profile")).toHaveLength(1);
  });

  it("only writes the fields passed in the patch, leaving the rest of an existing row alone", async () => {
    const store = new InMemoryStore();
    store.seed("social_brand_profile", [
      {
        id: "bp-1",
        accountId: "acct-1",
        voice: "voice",
        toneRules: ["a"],
        bannedTopics: ["politics"],
        disclosureTemplate: "#ad",
      },
    ]);

    const result = await updateBrandProfile(store, "acct-1", { bannedTopics: ["politics", "religion"] });

    expect(result.bannedTopics).toEqual(["politics", "religion"]);
    expect(result.voice).toBe("voice");
    expect(result.disclosureTemplate).toBe("#ad");
  });
});
