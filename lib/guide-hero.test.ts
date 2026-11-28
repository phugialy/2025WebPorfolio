import { describe, expect, it } from "vitest";
import { GUIDE_HERO_VERSION, guideHeroKind, guideHeroPath, heroWithGuideCover } from "./guide-hero";

describe("guide covers", () => {
  it("draws the product kind of each live guide", () => {
    expect(guideHeroKind(["holiday-guide", "monitors", "curved-monitors"])).toBe("monitor");
    expect(guideHeroKind(["holiday-guide", "local-ai", "mini-pc"])).toBe("mini-pc");
    expect(guideHeroKind(["holiday-guide", "keyboards", "split-layout"])).toBe("keyboard");
    expect(guideHeroKind(["holiday-guide", "headphones", "noise-cancelling"])).toBe("headphones");
    expect(guideHeroKind(["holiday-guide", "webcams", "4k-webcams"])).toBe("webcam");
    expect(guideHeroKind(["holiday-guide", "Cameras"])).toBe("camera");
    expect(guideHeroKind(["holiday-guide", "buying-guide"])).toBe("generic");
  });

  it("gives a guide without a picture its cover, and keeps a real picture", () => {
    expect(heroWithGuideCover(null, "my-guide", ["holiday-guide"])).toEqual({ url: guideHeroPath("my-guide"), isCover: true });
    expect(heroWithGuideCover("https://x/y.jpg", "my-guide", ["holiday-guide"])).toEqual({ url: "https://x/y.jpg", isCover: false });
    expect(heroWithGuideCover(null, "an-article", ["ai"])).toEqual({ url: undefined, isCover: false });
    expect(heroWithGuideCover(undefined, "an-article", null)).toEqual({ url: undefined, isCover: false });
  });

  it("versions the cover path so a redraw reaches cached readers", () => {
    expect(guideHeroPath("a b")).toBe(`/api/guide-hero/a%20b?v=${GUIDE_HERO_VERSION}`);
  });
});

describe("guide mark", () => {
  it("is the cover path with the mark switch", async () => {
    const { guideMarkPath } = await import("./guide-hero");
    expect(guideMarkPath("x")).toBe(`/api/guide-hero/x?v=${GUIDE_HERO_VERSION}&mark=1`);
  });
});
