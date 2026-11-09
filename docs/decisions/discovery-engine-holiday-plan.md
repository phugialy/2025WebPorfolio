# Discovery engine: holiday plan, the path to the Deals pages, and the scheduled rotation

Status: built on branch `discovery-merge`, not deployed. Date: 2026-11-09.
Input: `docs/research/affiliate-market-outreach-2026-11-09.md` (section 9).

## What was wrong (inspected, not assumed)

1. **It searched the wrong things.** `market-intelligence` rotated through 6 AI and desk categories. The research says the season is carried by laptops, smartwatches, premium audio, microphones, mini PCs and monitors, at $100+.
2. **It judged with a prompt written for a different job.** The fit prompt asked for an "impulse-friendly purchase" and told the model it had no price. Canopy's search results do include a price (`price.value`, USD); the old comment saying otherwise was wrong. Live logs, Nov 1 to 8: nearly every proposal was rejected as "generic commodity", and the ones accepted were $20 to $80 peripherals.
3. **What it found never reached the Deals pages.** Proposals carry `flag_reason = 'market-scan proposal'`. The Deals pages and `/api/deals/ranking` skip any product with a `flag_reason`. Activating a product in admin did not clear it. Result on 2026-11-09: 21 active products, none visible on Deals or to the guide engine.
4. **A new category would have been invisible anyway.** `defaultTagsFor` returns no tags for a category that is not in `SECTIONS`, so a Laptops product would have landed only in "More to browse" and on no holiday list.
5. **The two discovery jobs shared one Canopy budget badly.** `discover-resources` re-picked the same few books and one dev board daily (logged as "Discovered" even when it already existed).

## What changed

- `lib/discovery-plan.ts` (new, pure, tested): dated holiday windows from the research timetable, 8 product targets, the $100 floor, the holiday fit prompt, and the activation rule.
- `lib/market-intelligence.ts`: holiday windows run 2 targets a day with the price floor and the holiday prompt (real price and the category's existing catalog passed to the model). Outside Nov 9 to Jan 2 the original rotation and prompt run unchanged. Dedupes by ASIN instead of the full URL.
- `lib/affiliate.ts`: activating an engine proposal now clears its `market-scan proposal` flag. Other flags (underperforming, Ambit compliance) are left alone.
- `lib/deals-core.ts`: new "Laptops, watches and phones" section, added to the Thanksgiving, Black Friday, Cyber Monday and Christmas lists.
- `lib/resource-discovery.ts`: spends 1 search a day (not 2) during the holiday windows. Total stays at 3 a day. Log says "Re-matched existing" when the product already existed.

## Rotation: what readers see changes on a schedule (owner requirement, 2026-11-09)

The Deals pages used to order everything by 7-day clicks with ties alphabetical: already-popular products stayed on top and a product with no clicks (every new one) was never shown. Now:

- **Daily rotation** at 05:00 UTC. Each list keeps anchors (the most-opened products: 2 overall, 3 per holiday Top 10, 1 per section, 2 per browse row) and fills the rest from a weighted shuffle that holds still for the day and changes at the boundary. Searches are not shuffled. `lib/deals-rotation.ts`, `lib/rotation-core.ts`.
- **Hybrid weight** = the product's own momentum (1 + sqrt of recent clicks) x live category performance (0.7x-1.5x, from real clicks vs catalog share) x freshness (up to 2x for a product added in the last 14 days, fading) x plan (1.5x for a category the holiday plan prioritizes today).
- **Re-evaluated on a schedule.** The rotate-deals cron (daily, 05:00 UTC) clears the cache so the new lineup is built at the boundary, re-reads live clicks for the display, and every 48 hours rebuilds a strategy snapshot (per-category performance) that it saves in `cron_runs`. On the off day it carries the snapshot forward so the discovery engine's order for the period does not shift under it.
- **The discovery engine reads that snapshot.** Inside the 48-hour period, its targets are drawn by a weighted shuffle of plan priority x live factor, so a category readers favor is searched sooner and a cold one later, and every target keeps a chance. A snapshot older than 72 hours is ignored and the plan runs on its own priorities.
- **Honesty guards.** Below 30 recent clicks in total no factor is applied (too little data). On-page and SEO wording that said lists were "ranked by what readers opened most" now says the first picks are, and the rest rotate daily.
- **Off switch.** `DEALS_ROTATION=off` in Vercel restores the plain order by activity.
- **Log.** Each run records the lineup, how many products are new since the last run, and whether it re-evaluated.

## Kept as is, on purpose

- Every proposal still starts `inactive`. Nothing is public until an admin activates it.
- No prices are stored or shown. The price is used for the floor and the model's judgment only.
- The standing rotation and its prompt are unchanged outside the season.

## Not solved here

- Click data is the only live ranking signal; revenue is still unmeasured (no Commercial Ledger yet), so the factors reward attention, not earnings.
- There is still no true "trending in the last 24 hours" signal. Google's trends feed is not category-scoped. The dated plan stands in for it; first-party click data would be the next signal.
- The 21 already-active proposals stay hidden until their flag is cleared (SQL in the hand-off, run by the owner).
- Canopy usage is about 90 searches a month against a 100 free-tier limit. Watch it.
