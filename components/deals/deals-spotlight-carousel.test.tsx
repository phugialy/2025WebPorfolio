import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealsSpotlightCarousel, type SpotlightSlide } from "./deals-spotlight-carousel";
import { describeDealsRef, isDealsRef, type ExplorerItem } from "@/lib/deals-core";

const pic = "https://m.media-amazon.com/images/I/71abc.jpg";
const item = (id: string, name: string, category: string): ExplorerItem => ({
  id,
  name,
  category,
  section: "monitors",
  image_url: pic,
  buy_if: null,
  score: 0,
  rising: false,
  tags: [],
  pinned: null,
});
const slide = (slug: string, label: string, n = 5): SpotlightSlide => ({
  slug,
  label,
  blurb: `${label} picks.`,
  total: n + 3,
  items: Array.from({ length: n }, (_, i) => item(`${slug}-${i}`, `${label} product ${i}`, label)),
});

describe("DealsSpotlightCarousel", () => {
  const html = renderToStaticMarkup(
    <DealsSpotlightCarousel slides={[slide("ai-hardware", "Mini PCs"), slide("monitors", "Monitors"), slide("audio", "Headphones")]} />
  );

  it("is a labelled carousel with one tab and one slide per product type, in order", () => {
    expect(html).toContain('aria-roledescription="carousel"');
    expect(html).toContain('aria-label="Featured picks by product type"');
    expect((html.match(/role="tab"/g) ?? []).length).toBe(3);
    expect((html.match(/aria-roledescription="slide"/g) ?? []).length).toBe(3);
    expect(html).toContain('aria-label="1 of 3: Mini PCs"');
    expect(html).toContain('aria-label="3 of 3: Headphones"');
    expect(html.indexOf("Mini PCs")).toBeLessThan(html.indexOf("Headphones"));
  });

  it("marks the first tab selected, and keeps the other slides from being tabbed into or tapped", () => {
    expect(html).toMatch(/role="tab"[^>]*aria-selected="true"[^>]*>Mini PCs</);
    expect((html.match(/inert=""/g) ?? []).length).toBe(2);
  });

  it("shows a lead card and four more per type, each linking out with its own tracking label", () => {
    expect((html.match(/<article/g) ?? []).length).toBe(15); // 3 slides x 5 products
    expect(html).toContain("ref=deals-spotlight-monitors");
    expect(html).toContain("ref=deals-spotlight-ai-hardware");
    // Position inside a type is not a popularity rank, so no #1 badge is drawn.
    expect(html).not.toMatch(/>#1</);
    expect(html).toContain('data-deals-rank="1"');
  });

  it("links each slide to its full row below, by the row's anchor", () => {
    expect(html).toContain('href="#category-monitors"');
    expect(html).toMatch(/See all 8/);
  });

  it("draws nothing for no slides, and has no autoplay", () => {
    expect(renderToStaticMarkup(<DealsSpotlightCarousel slides={[]} />)).toBe("");
    expect(html).not.toMatch(/autoplay|setInterval/i);
  });
});

describe("tracking labels for the carousel", () => {
  it("accepts a spotlight label for a product type and names it readably", () => {
    expect(isDealsRef("deals-spotlight-ai-hardware")).toBe(true);
    expect(isDealsRef("deals-spotlight-")).toBe(false);
    expect(isDealsRef("deals-spotlight-Bad Label")).toBe(false);
    expect(describeDealsRef("deals-spotlight-ai-hardware")).toBe("Featured by type: ai hardware");
  });
});
