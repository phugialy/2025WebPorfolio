import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealsProductCard } from "./deals-product-card";

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
