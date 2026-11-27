# Insta360 brand page (/deals/insta360), Nov 27 2026

Asked for by the owner after joining Insta360's affiliate program: a page under Deals dedicated to Insta360 that draws people in with what we found in the market and helps them decide whether it is a good buy.

## What it is

- `/deals/insta360`: a dark hero with four market numbers, a three-line verdict, nine picks in four groups (360 cameras, pocket vlogging, action and hands-free, phone and desk), a five-year search-interest chart, and how we checked.
- Each pick has what it is (from the store page), "Good buy if", "Skip if", and what independent reviewers say with links. Where we found no independent review, the card says so. No prices or discounts.
- Linked from `/deals` (a spotlight card under the season timeline) and listed in the sitemap all year; the holiday redirect to `/kits` after Jan 3 does not touch it.

## Links and tracking

- Nine `affiliate_products` rows: `network: "other"`, `brand: "Insta360"`, `category: "Insta360"`, tags `insta360` plus the product kind, link `https://store.insta360.com/product/<path>?utm_term=<affiliate code>` (the program's own link format).
- Clicks go through `/api/affiliate/go/<id>` and impressions through `/api/deals/track`, both labelled `deals-brand-insta360` ("Brand page: insta360" in the stats panel).
- Program terms seen on Nov 27: 5% on cameras (10% on the Pro 2), 2% on accessories, no commission on refurbished products.

## Kept apart from the Amazon lists

`isEligible` now leaves out rows whose network is not Amazon, because the Deals and kit cards say "View on Amazon". The rows can still be matched to articles, where the card shows the brand name.

## Market numbers

Computed in `lib/brands/insta360.ts` from Google Trends (US, weekly, pulled through SerpApi on Nov 27, averaged by month in `lib/brands/insta360-trends.ts`):

- Holiday lift (Nov and Dec against the year): Insta360 1.19x in 2023 and 2024, 1.43x in 2025; DJI Osmo 1.46x; GoPro 1.00x. December 2025 was Insta360's busiest month.
- Insta360 against GoPro, September to November: 20% (2023), 31% (2024), 55% (2025), 63% (2026).
- Spring 2026 was launch season (GoPro MISSION 1 in April, Insta360 Luna in June) and every brand spiked; this fall Insta360 is a little below last fall and DJI Osmo is slightly above Insta360. The page says this rather than quoting a year-on-year rise that the spike inflates.
- Also cited: 67% of global consumer 360-camera sales in 2023 (Frost & Sullivan, via 36Kr), the June 2025 Shanghai listing (SCMP), the Feb 2026 ITC ruling (PetaPixel, TechNode).

## Not done

- Accessories (2%) and older models (X3, X4, ONE RS, GO 3S) are left out.
- Read-out: clicks and impressions by card, same rule as the other Deals placements (sweepers removed, at least 30 impressions before reading anything).
- Refresh the trend file and the "checked" date when a new model launches.
