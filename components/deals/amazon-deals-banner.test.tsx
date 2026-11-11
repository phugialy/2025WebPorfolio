import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AmazonDealsBanner } from "./amazon-deals-banner";
import type { Deal } from "@/lib/deals-core";

const deal: Deal = {
  id: "amazon-deals",
  merchant: "Amazon",
  title: "Amazon holiday deals",
  description: "Amazon's own deals page.",
  url: "https://www.amazon.com/deals?tag=phugialy-20",
  featured: true,
};

describe("AmazonDealsBanner", () => {
  it("links to the tagged Amazon deals page as a sponsored link in a new tab, with the deal id for tracking", () => {
    const html = renderToStaticMarkup(<AmazonDealsBanner deal={deal} />);
    expect(html).toContain('href="https://www.amazon.com/deals?tag=phugialy-20"');
    expect(html).toContain('rel="sponsored noopener noreferrer"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('data-deals-deal="amazon-deals"');
    expect(html).toContain("See today&#x27;s Amazon deals");
    expect(html).toContain("(opens in a new tab)");
  });

  it("states no price, percentage or savings claim, and says the prices are Amazon's", () => {
    const html = renderToStaticMarkup(<AmazonDealsBanner deal={deal} />);
    const text = html.replace(/<[^>]+>/g, " ");
    expect(text).not.toMatch(/\$\s?\d|\d\s?%|\bsave\b|\boff\b|\blowest\b|\bfree shipping\b/i);
    expect(text).toMatch(/Prices and stock are Amazon/);
    expect(text).toMatch(/commission/i);
  });

  it("shows product photos only when given, and hides them from screen readers", () => {
    expect(renderToStaticMarkup(<AmazonDealsBanner deal={deal} />)).not.toContain("<img");
    const withPhotos = renderToStaticMarkup(
      <AmazonDealsBanner deal={deal} images={[1, 2, 3, 4].map((n) => ({ src: `https://m.media-amazon.com/images/I/${n}.jpg`, alt: `p${n}` }))} />
    );
    expect((withPhotos.match(/<img/g) ?? []).length).toBe(3);
    expect(withPhotos).toContain('aria-hidden="true"');
    expect(withPhotos).toContain('alt=""');
  });
});
