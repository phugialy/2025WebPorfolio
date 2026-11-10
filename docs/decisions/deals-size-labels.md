# Size-of-purchase labels on the Deals pages

Decided 2026-11-10 (owner picked price labels for the UX of `/deals`; this is the version that stays inside Amazon's price rules).

## Context

Readers ask "is this in my budget?" and the pages could not answer: no dollar amount may appear (Amazon allows prices and review ratings only from its own API with a timestamp, and the site has no such feed). The earlier idea, a "$ / $$ / $$$" class, still reads as a price claim and would have been derived from a price we may not display.

## Decision

Each product can carry a **size of purchase** label: **Small add-on**, **Mid-size buy**, **Big purchase** (one, two or three filled dots plus the words). It describes the kind of product, never today's price, and the pages say so ("Size labels describe the kind of product, not today's price. Prices change daily, so check the current price on Amazon.").

- Where it shows: every product card (standard, compact, detailed), the legend on `/deals` and each Top 10 page, and a "Shop by size" filter on the hub catalog (Everything / Small add-ons / Mid-size buys / Big purchases, each with its count). A size choice swaps the category rows for one list, like search. Clicks carry `data-deals-size` and a `size` field on the `deals_product_click` event; the filter sends `deals_size_filter`.
- Data: `PURCHASE_SIZE_BY_PRODUCT` in `lib/deals-size.ts`, keyed by `affiliate_products.id`, hand-assigned per product (a webcam can cost $40 or $200, so a category-wide label would mislead). Drafted from general product knowledge, **not from live prices**; the owner reviews it. A few homogeneous categories (Laptops, Phones, Smartwatches, Cables & Chargers, Cleaning & Care) label new products automatically. Anything else with no entry shows **no label**, never a guess. The 21 products held back as market-scan proposals have no label until they are released and added.
- Bands, for reviewers only (never shown): small is the kind of thing added to an order without much thought; mid is a considered purchase compared against a few options; big is a major purchase (computers, graphics cards, large monitors, premium headphones, electric desks).
- The relative price class (`price_class` in `deals_product_facts`, shown as `$`) stays **hidden** (`SHOW_PRICE_CLASS = false`).

## Rejected

- `$ / $$ / $$$`: reads as a price claim, and we cannot source a price we may show.
- A category-wide size: the categories mix cheap and expensive items.
- Letting the engine or a scraper derive a size from a stored price: the catalog holds no prices on purpose, and Canopy lookups are rationed.

## Reviewing the labels

Open `lib/deals-size.ts`; each line has the product name after the id. To correct a label, change the size on that line. To label a new product, add a line. Run `vitest` (the data test checks ids and sizes).
