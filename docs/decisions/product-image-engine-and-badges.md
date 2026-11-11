# Product picture engine, and rarer labels on Deals cards

2026-11-10. Triggered by the owner: six products showed Amazon's logo instead of their picture, the fix should be automatic (not hand-run SQL), and "Trending now / New this week" labels were on too many cards.

## Picture engine

**Context.** Pictures decide most purchases. Six active products had Amazon's placeholder logo stored as their picture, because the page fetch that fills in a new product was challenged that day and the logo is what a challenged page hands back.

**Decision.** A daily job, `/api/cron/product-images` (06:20 UTC, `lib/image-engine.ts`):
1. Finds active, non-partner products whose picture is missing or the placeholder.
2. Reads the product's own page with the same fetch the admin "paste a link" tool uses; takes the preview image, or, if that is the logo, the product's main picture from the same page (`lib/product-images.ts`).
3. Verifies the picture is a real image (HTTPS, an image content type, at least 4,000 bytes; 1x1 and placeholder files are smaller) and only then saves it.
4. Never replaces a good picture. A manually set picture stays.
5. Each run also spot-checks one weekday's share of the existing pictures (every product about weekly) and repairs any that no longer load.
6. Goes slowly (8 page fetches a run, 1.5 s apart) and stops after two challenged pages in a row.
7. Logs a `cron_runs` row (`product-images`); a run where pictures are missing and none could be repaired is logged as failed so it shows. A repair clears the Deals data cache so new pictures appear now. `?dryRun=1` does the real fetches and checks and changes nothing.

The same fix is in the admin fetch, so a new product no longer saves the logo. The article Picks widget, the resource pages and the feed card show a neutral tile, never the logo.

**Dry run against the live catalog (2026-11-10):** 108 products scanned, the 6 affected ones found and each repaired to a verified picture, 11 existing pictures spot-checked with none broken, no blocks.

**Open question for the owner.** Pictures are hot-linked from Amazon's image host and read from the product page, as the site already does. Amazon's rules say pictures should come from its own tools (SiteStripe or the Creators API). This is a gray area that predates this change and is unchanged by it; a verified Creators API feed would be the cleaner source if the account qualifies.

**Rejected.** A hand-run SQL file (does not scale, repeats the next time a fetch is challenged). Spending Canopy lookups on pictures (the monthly allowance is needed for discovery).

## Labels on cards

**Context.** "Trending now" showed on about seven of nine cards. It was set from clicks by distinct browser-days, which one person revisiting satisfies. The click log also holds automated visitors: of 197 Deals clicks in a week, 148 came from one browser string that opened every row in turn.

**Decision.**
- **Trending:** only with at least 5 different browsers opening it **from a Deals page** in the last week, more than 30% above the week before, a real picture, and at most 3 products. Clicks arriving through article pages are not counted for this label (that traffic includes many automated visitors).
- **New this week:** added in the last 7 days, a real picture, not already trending, at most 2 products.
- **Crawlers:** a browser that opens 8 or more different products in one day is ignored when ranking and when labeling.
- Most days most cards carry nothing. On the real data today: one product on the hub, none on the Top 10 pages.

**Consequence.** The ranking uses the same filtered clicks, so a crawler no longer moves the Top 10 (checked: the Black Friday order barely changed, the lead pick stays the same).
