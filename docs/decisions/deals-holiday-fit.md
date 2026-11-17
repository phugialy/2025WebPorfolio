# Holiday fit: which products lead each holiday's list (Nov 15 2026)

## Problem

A product reached a holiday's list by its category (the holiday's `sections`) and was ordered by the holiday's hand-written `focus` categories after the three most-opened products. Nothing measured whether a product type is actually wanted in that holiday, or whether it is heating up.

## What it is now

After the three most-opened products (unchanged), a holiday's list is ordered by a **fit score** per product:

`fit = seasonal lift × demand nudge × focus boost`

| Part | Source | Range |
|---|---|---|
| Seasonal lift | Last year's Google Trends: interest for the product type inside the holiday's window ÷ its own Sep-Oct level (`SEASON_STUDY` in `lib/holiday-fit.ts`, 5 searches, measured 2026-11-15) | 0.8 to 3 |
| Demand nudge | This year's blended demand (3-month level nudged by the last 7 days, so a type heating up this week is lifted: this is the trend part) against the median type we measure | 0.7 to 1.5 |
| Focus boost | The holiday's hand-picked categories (the part search charts cannot know, mainly "is it a gift") | 1.6 |

- Fit is rounded to quarter steps. Products in the same step keep rotating daily, so lists stay varied; a clearly better fit leads.
- A product maps to a measured product type by category, and by name inside shared categories (earbuds vs headphones, espresso vs robot vacuum). A product with no measured type scores on focus alone.
- Terms Google rounds away next to laptops (level 0.02-0.05) have their lift trusted only halfway; two terms (podcast microphone, ergonomic office chair) were pure noise and are left out.
- Kill switch: `DEALS_FIT=off` restores the plain focus order. With no demand rows (no key, table unreadable) the seasonal lift still applies.
- No migration. The demand rows are the ones the daily job already stores.

## What the study found (last season, US)

- **Black Friday is the peak for almost every type**, 2x to 4x the autumn baseline: robot vacuums 4.2x, earbuds 4.7x, 4K monitors 3.3x, espresso 3.3x, phones 3.0x, gaming mice 2.9x.
- **Keyboards and external SSDs only lift on Black Friday and Cyber Monday** (about 2x) and are flat at Thanksgiving and Christmas: that supports keeping them on the Cyber Monday list.
- **Christmas lifts less than Black Friday for every type.** People research in November and gift in December, so search interest understates Christmas; its list leans on the focus boost.
- **New Year**: espresso (2.1x), gaming mice (2.0x), webcams (1.65x, peaking Dec 25) and smartwatches hold up; laptops, SSDs and keyboards fade to flat.
- Air fryers and headphones are the biggest absolute demand after laptops (0.58x and 0.43x of laptop interest) but lift least: steady all year.

## Limits

- Search interest is not sales. It says when people research a type, not what they buy or gift.
- Only five holiday windows of one past season. One year of data is a prior, not a law; the demand nudge and the clicks the pages collect adjust it.
- Whole-point rounding makes small types coarse, hence the halfway trust and the caps.
- Off-theme products can still earn a place when a type spiked hard (an espresso machine near the top of Cyber Monday). If that reads wrong, cap off-focus products at 2 of the first 6 places.

## Refreshing

`SERPAPI_KEY=... node scripts/season-study.mjs` (5 searches) re-measures the table; run it once a year in September. Mid-season, the daily demand job and `blendDemand` supply the trend.

## Read-out

The Deals stats panel already shows clicks and impressions per product and per list. After about a week, compare click-through of the first six places on each list against the same list before this change (the old order is in git history and `DEALS_FIT=off`). No sales data exists, so this reads interest.

## Niche: curved gaming monitors, 31-34 in, 160-240 Hz (added Nov 15 2026)

Asked for by the owner. Measured against "4k monitor" because Google rounds the niche to zero next to laptops (2 searches):

| Term | Interest vs "4k monitor" | Black Friday lift | Cyber Monday | Christmas | New Year |
|---|---|---|---|---|---|
| curved gaming monitor | 0.25x | 4.55x | 3.22x | 2.26x | 2.06x |
| 240hz monitor | 0.24x | 4.99x | 3.45x | 2.30x | 2.47x |
| ultrawide monitor | 0.35x | 3.43x | 2.77x | 1.49x | 1.70x |
| gaming monitor | 1.78x | 4.15x | 2.98x | 2.08x | 2.14x |

Small (a quarter of "4k monitor", which is itself about 2% of laptop interest) but it peaks harder at Black Friday than monitors overall (3.3x). A small, high-intent audience.

- Discovery target `curved-monitors` (Canopy search "34 inch curved gaming monitor 165hz"). A candidate must say **curved**, a size of **31-34.9 inches** and a refresh rate of **160-240 Hz** in its Amazon title (`lib/product-specs.ts`); anything that does not never reaches the model, and the model is told the same requirement. Proposals still wait for an admin to activate them.
- On the plan: 5th in the Nov 9-20 window, 3rd in Nov 20-26, and in the Cyber Monday and New Year windows.
- Fit: a curved, ultrawide or 160-249 Hz monitor takes the niche term's lift, so it leads a plain monitor on every list (the Alienware 34 curved and the LG ultrawides already in the catalog get it today).
- Amazon pays low commission on computer monitors, so the value is the Black Friday spike and the lack of competition for these titles, not the rate per sale. Check the rate in the Associates table.
