# Discovery engine: holiday plan and the path to the Deals pages

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

## Kept as is, on purpose

- Every proposal still starts `inactive`. Nothing is public until an admin activates it.
- No prices are stored or shown. The price is used for the floor and the model's judgment only.
- The standing rotation and its prompt are unchanged outside the season.

## Not solved here

- There is still no true "trending in the last 24 hours" signal. Google's trends feed is not category-scoped. The dated plan stands in for it; first-party click data would be the next signal.
- The 21 already-active proposals stay hidden until their flag is cleared (SQL in the hand-off, run by the owner).
- Canopy usage is about 90 searches a month against a 100 free-tier limit. Watch it.
