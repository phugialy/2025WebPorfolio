import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BrandSpotlight } from "./brand-spotlight";

describe("BrandSpotlight", () => {
  it("links /deals to the Insta360 brand page", () => {
    const html = renderToStaticMarkup(<BrandSpotlight />);
    expect(html).toContain('href="/deals/insta360"');
    expect(html).toContain("Is Insta360 worth it?");
  });
});
