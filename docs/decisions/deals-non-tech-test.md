# Deals non-tech product test (Nov 12 2026 - Jan 3 2027)

Decided 2026-11-12. Temporary: it switches itself off after Jan 3, and `DEALS_TEST=off` stops it at once. Scope: the Deals shelves only.

## What it does

A daily job (`/api/cron/deals-test`, 04:30 UTC, half an hour before the shelves rotate) keeps a small rotating set of non-tech products ($80+, any type) on the Deals shelves, and measures them against the rest.

1. **Source.** The discovery engine already finds them: Canopy searches Amazon, every candidate gets `amazon.com/dp/<ASIN>?tag=<our tag>` (all 26 proposals so far carry the tag), and the model screens them. They wait inactive, flagged "market-scan proposal".
2. **Shelve.** The job activates eligible proposals in the test categories (Home & Kitchen, Personal Care, Travel, Wellness & Ergonomics): picture present, Associate tag present, not hidden, no older than 30 days. At most 3 a day, 12 on the shelves at once, 4 per category. The product's `created_at` restarts so the rotation's existing 14-day "new" boost starts on the day it goes up. Placement is automatic (holiday lists and category rows from `defaultTagsFor`).
3. **Measure.** Impressions and clicks since the day it went up, from the same Deals logs as the stats panel (bots excluded), against the click-through of everything else on the shelves.
4. **Cycle.** A product stays until it could have been seen about 30 times, set from our own traffic: `ceil(30 / average impressions per product per day)`, clamped to 7-21 days. At today's traffic (0.22 impressions per product per day) that is the 21-day maximum. When its life is over it **graduates** into the normal catalog if it had at least 30 impressions and clicked at least as often as the rest, otherwise it is **retired**. A product never shown in 7 days is retired early.
5. **Allocate.** Real-world demand decides which product type gets the next free slot, with diminishing returns (demand divided by 1 plus the slots that type already holds), so no type fills the shelf. With no demand signal the slots spread evenly.

Every change is a row in `deals_test_events` (migration 0026); the run summary is in `cron_runs` under `deals-test`.

## Real-world demand

Google Trends gives relative interest (0-100, whole points), not a search volume, and only within one request. So every request carries the anchor term "laptop" and each product type is reported as a multiple of it ("air fryer: 0.54x laptop interest"). A term far smaller than the biggest in its request is coarse (one live test: espresso machine 0.09, robot vacuum 0.04, electric toothbrush 0.03). There is no official self-serve Trends API (application-only alpha), so `lib/demand-signal.ts` reads SerpApi's `google_trends` engine (`SERPAPI_KEY`, set locally and in Vercel production). Without a key the job runs with an even split.

Two windows: the last 3 months (the level) and the last 7 days (is it heating up faster than laptops). The allocation uses the level, nudged by the week, capped to 0.75x-1.5x because whole-point rounding makes a week noisy.

### Search budget, day by day

The SerpApi free plan allows 250 searches a month. The job spends 3 a day (about 90 a month, about 160 across the 53 days to Jan 3), and keeps 40 a month in reserve, so roughly 120 a month of overhead remain for testing, retries and manual use.

| Search | Window | Terms |
|---|---|---|
| 1 | last 7 days | first group (espresso machine, air fryer, robot vacuum, electric toothbrush) |
| 2 | last 7 days | second group (carry on luggage, ergonomic office chair) |
| 3 | last 3 months | one group, the groups taking turns by day, so each baseline is refreshed every other day |

Each group also carries "laptop". Before spending, the job asks SerpApi for its real remaining balance (a free call) and skips the day's searches if that would dip into the reserve or if the balance cannot be read. Every successful search is a `demand` row in `deals_test_events`, so a slot that already ran today does not run twice. A dry run never spends a search.

Development used 1 SerpApi search (it verified the response parser: first live result matched the shape the code reads).

## The same signal steers the Canopy discovery engine

The engine picks 2 product types a day to search Amazon for, by a weighted shuffle of the plan's priority and live clicks on products we already carry (`orderTargets` in `lib/discovery-plan.ts`). Clicks cannot see demand for a type we do not carry yet, so the measured search interest now also weights the shuffle: each measured target's interest is compared with the median of the measured targets and turned into a factor of `sqrt(ratio / median)`, kept between 0.7x and 1.5x, so demand nudges the order and never decides it. It applies only when at least 3 targets were measured; with none it changes nothing. Every discovery target has a short Google term (`trendTerm`, for example "podcast microphone" for the Amazon search "usb podcast microphone"; "laptop" is the anchor). The 3-month baseline rotates through all 14 terms, one group a day, so each is refreshed about every fourth day; the 7-day window covers the 6 test-shelf terms. The factors used each day are in the `market-intelligence` cron summary as `demandFactors`. This changes only the order of searches within the plan's windows; the Canopy search budget is unchanged.

## What this test can and cannot tell us

- Our traffic is small: 346 non-bot Deals impressions in 14 days across the catalog (about 165 on a busy day). A product will see tens of impressions at most, so click-through per product is noisy and clicks are partly automated (Nov 11 logged 358 clicks on 163 impressions). Read it by group, weekly, as direction, not proof.
- No sales data is available, so "yield" here is interest (click-through), not revenue.
- None of the 363 articles covers these product types, so these products depend entirely on Deals-page exposure. Newsletter or social traffic to the Deals shelf would strengthen the read.

## Not done

- No admin board yet; read `deals_test_events` or the `cron_runs` summary.
- The database write path (activate, retire, graduate) is covered by unit tests of the plan only; check it end to end after migration 0026 is run and the first proposals exist.
- The cron runs at 22:30 Chicago time; "today" in the events is the Chicago date.
