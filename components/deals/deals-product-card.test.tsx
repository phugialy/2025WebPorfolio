import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealsProductCard } from "./deals-product-card";
import type { ProductFacts } from "@/lib/deals-core";

const product = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Test Monitor",
  category: "Monitors",
  image_url: null,
  buy_if: null,
  rising: false,
};

describe("DealsProductCard guide link", () => {
  it("links to the guide that features the product, labelled for tracking", () => {
    const html = renderToStaticMarkup(
      <DealsProductCard product={product} refSlug="trending" guide={{ slug: "curved-monitors", title: "Curved monitors" }} />
    );
    expect(html).toContain('href="/blog/curved-monitors"');
    expect(html).toContain('data-deals-guide="curved-monitors"');
    expect(html).toContain('data-deals-ref="deals-trending"');
    expect(html).toContain("Read the guide");
    expect(html).toContain("Curved monitors");
    // The Amazon link is untouched.
    expect(html).toContain("View on Amazon");
  });

  it("shows no guide link when no guide features the product", () => {
    const html = renderToStaticMarkup(<DealsProductCard product={product} refSlug="trending" />);
    expect(html).not.toContain("Read the guide");
    expect(html).not.toContain("data-deals-guide");
  });
});

const facts: ProductFacts = {
  whatItIs: "34-inch curved ultrawide for work and games",
  bestFor: "Gamers who also work on it",
  buyIf: "You want one wide screen for games and spreadsheets",
  skipIf: "You need USB-C for a one-cable laptop setup",
  strengths: ["Strong contrast", "Fast 180 Hz refresh"],
  caveats: ["Dark smearing in fast games"],
  keySpecs: ["34-inch 3440x1440", "180 Hz"],
  priceClass: "premium",
  verdict: "recommended_with_caveats",
  confidence: "medium",
  evidenceCount: 2,
  evidenceNewest: "2025-12-15",
  verifiedAt: null,
  guideSlug: null,
};

describe("DealsProductCard size label", () => {
  const sized = { ...product, id: "aede1291-e3e7-427b-9b7e-6e7b484d224b", category: "AI Hardware" };

  it("shows the size of purchase in words, on every card shape, with no price", () => {
    for (const props of [{}, { compact: true }, { detailed: true }]) {
      const html = renderToStaticMarkup(<DealsProductCard product={sized} refSlug="trending" {...props} />);
      expect(html).toContain("Big purchase");
      expect(html).toContain('data-deals-size-label="big"');
      expect(html).toContain('data-deals-size="big"');
      expect(html).not.toMatch(/\$/);
    }
  });

  it("shows no label for a product with no size, and no size attribute", () => {
    const html = renderToStaticMarkup(<DealsProductCard product={product} refSlug="trending" />);
    expect(html).not.toContain("data-deals-size");
    expect(html).not.toContain("purchase");
  });
});

describe("DealsProductCard detailed", () => {
  it("shows what it is, who it is for, the catch and how sure we are", () => {
    const html = renderToStaticMarkup(<DealsProductCard product={{ ...product, facts }} refSlug="black-friday" rank={1} detailed />);
    expect(html).toContain("34-inch curved ultrawide for work and games");
    expect(html).toContain("Gamers who also work on it");
    expect(html).toContain("Strong contrast");
    expect(html).toContain("Dark smearing in fast games");
    expect(html).toContain("34-inch 3440x1440");
    expect(html).toContain("Buy if:");
    expect(html).toContain("Skip if:");
    expect(html).toContain("Recommended, with caveats");
    expect(html).toContain("medium confidence");
    expect(html).toContain("Based on 2 independent reviews, newest Dec 2025.");
    // The live price is Amazon's: the card says so and never shows a number.
    expect(html).toContain("Check today&#x27;s price on Amazon");
    expect(html).not.toMatch(/\$\s?\d/);
    expect(html).toContain("View on Amazon");
  });

  it("keeps the price class hidden while the owner has it switched off", () => {
    const html = renderToStaticMarkup(<DealsProductCard product={{ ...product, facts }} refSlug="black-friday" detailed />);
    expect(html).not.toContain("Premium for its type");
    expect(html).not.toContain("$$$");
  });

  it("falls back to the product's own buy-if and skip-if when it has no facts", () => {
    const html = renderToStaticMarkup(
      <DealsProductCard product={{ ...product, buy_if: "You code all day", skip_if: "You game on a laptop" }} refSlug="black-friday" detailed />
    );
    expect(html).toContain("Buy if:");
    expect(html).toContain("You code all day");
    expect(html).toContain("Skip if:");
    expect(html).toContain("You game on a laptop");
    expect(html).not.toContain("independent review");
  });

  it("says plainly when a verdict rests on no reviews", () => {
    const html = renderToStaticMarkup(
      <DealsProductCard product={{ ...product, facts: { ...facts, verdict: "not_enough_evidence", confidence: "low", evidenceCount: 0, evidenceNewest: null } }} refSlug="black-friday" detailed />
    );
    expect(html).toContain("Not enough evidence yet");
    expect(html).toContain("No independent reviews read yet.");
  });

  it("uses the one-line description on the standard card too", () => {
    const html = renderToStaticMarkup(<DealsProductCard product={{ ...product, facts }} refSlug="trending" />);
    expect(html).toContain("34-inch curved ultrawide for work and games");
    expect(html).not.toContain("Skip if:");
  });
});

describe("DealsProductCard size hierarchy", () => {
  const pic = "https://m.media-amazon.com/images/I/71UKiaeIN0L._AC_SL1500_.jpg";
  const withPic = { ...product, image_url: pic };

  it("the hero layout gives the picture half the card and a large title", () => {
    const html = renderToStaticMarkup(<DealsProductCard product={withPic} refSlug="black-friday" rank={1} layout="hero" />);
    expect(html).toContain("md:grid-cols-[1.1fr_1fr]");
    expect(html).toContain("md:text-3xl");
    expect(html).toContain("md:min-h-[26rem]");
    expect(html).toContain("View on Amazon");
  });

  it("the dense stack is a picture-left row on a phone and holds its long details back", () => {
    const html = renderToStaticMarkup(<DealsProductCard product={{ ...withPic, facts }} refSlug="black-friday" rank={5} layout="stack" dense />);
    expect(html).toContain("flex-row");
    expect(html).toContain("sm:flex-col");
    expect(html).toContain("w-28");
    expect(html).toContain("hidden sm:block"); // strengths, buy-if and verdict wait for wider screens
    // The small row picture does not carry the trending badge on a phone.
    const rising = renderToStaticMarkup(<DealsProductCard product={{ ...withPic, badge: "trending" }} refSlug="x" rank={5} layout="stack" dense />);
    expect(rising).toContain("hidden sm:inline-flex");
  });

  it("a large stack card shows all key specs, a standard one does not", () => {
    const large = renderToStaticMarkup(<DealsProductCard product={{ ...withPic, facts }} refSlug="x" rank={2} layout="stack" large />);
    const small = renderToStaticMarkup(<DealsProductCard product={{ ...withPic, facts }} refSlug="x" rank={6} layout="stack" />);
    expect(large).toContain("Key specs");
    expect(small).not.toContain("Key specs");
  });

  it("the top three picks without any facts say why they lead, honestly; others and rails do not", () => {
    const note = "Among the picks readers opened most in the last week.";
    expect(renderToStaticMarkup(<DealsProductCard product={withPic} refSlug="x" rank={1} layout="hero" />)).toContain(note);
    expect(renderToStaticMarkup(<DealsProductCard product={withPic} refSlug="x" rank={3} layout="stack" large />)).toContain(note);
    expect(renderToStaticMarkup(<DealsProductCard product={withPic} refSlug="x" rank={7} layout="stack" dense />)).not.toContain(note);
    expect(renderToStaticMarkup(<DealsProductCard product={withPic} refSlug="x" layout="stack" large />)).not.toContain(note);
    expect(renderToStaticMarkup(<DealsProductCard product={{ ...withPic, buy_if: "You code all day" }} refSlug="x" rank={1} layout="hero" />)).not.toContain(note);
  });

  it("never draws Amazon's placeholder logo as a picture", () => {
    const logo = "https://m.media-amazon.com/images/G/01/share-icons/previewdoh/amazon.png";
    for (const layout of ["default", "compact", "wide", "hero", "stack"] as const) {
      const html = renderToStaticMarkup(<DealsProductCard product={{ ...product, image_url: logo }} refSlug="x" rank={1} layout={layout} />);
      expect(html, layout).not.toContain("previewdoh");
      expect(html, layout).not.toContain("<img");
    }
  });

  it("the older detailed prop still means the wide layout", () => {
    const html = renderToStaticMarkup(<DealsProductCard product={withPic} refSlug="x" detailed />);
    expect(html).toContain("sm:flex-row");
  });
});

describe("DealsProductCard labels", () => {
  it("shows Trending or New only when the product has that badge, never from the old rising flag", () => {
    const trending = renderToStaticMarkup(<DealsProductCard product={{ ...product, badge: "trending" }} refSlug="x" />);
    const fresh = renderToStaticMarkup(<DealsProductCard product={{ ...product, badge: "new" }} refSlug="x" />);
    const old = renderToStaticMarkup(<DealsProductCard product={{ ...product, rising: true }} refSlug="x" />);
    expect(trending).toContain("Trending");
    expect(trending).toContain("data-deals-badge=\"trending\"");
    expect(fresh).toContain("New");
    expect(fresh).toContain("this week");
    expect(fresh).toContain("data-deals-badge=\"new\"");
    expect(old).not.toContain("data-deals-badge");
    expect(old).not.toContain("Trending");
  });
});
