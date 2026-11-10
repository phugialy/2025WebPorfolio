# Brief for the holiday guide engine: align with the Deals tab

From the website session, 2026-11-10, at the owner's request. **Proposal only:** change nothing live, write nothing to the database, and come back with a revised workflow and a per-guide fix list for the owner. Anything the owner has not approved stays unreleased. Companion to `holiday-top10-shopper-rubric.md`.

## 1. What each Deals page needs, and what the engine supplies today

| Page | What it needs | Today |
| --- | --- | --- |
| `/deals` series row | Guide article tagged `holiday-guide` **and** `deals-pinned`, with `hero_image_url` and a short blurb (reader hook or `ai_summary`) | All 5 guides lack `deals-pinned`, a hero image and a summary; `portfolio_lane` is null. No guide is in the series row; the Buying guides row shows text-only cards with an empty blurb |
| `/deals/<holiday>` Top 10 | Card facts per product (what it is, best for, strengths, the catch, specs, verdict, evidence) | 15 loadable rows cover about a quarter of the ~60 Deals-eligible products; the highest-priced picks have none, so their cards show a name and photo |
| `/blog/<guide>` | Tables render, correct date, picks that are the guide's own products | Pipe tables render raw (no remark-gfm); visible date is `created_at`; picks come from the site's auto-matcher. A fix for held-back products is on branch `guide-design` (not deployed) |
| Price ("is it in my budget?") | Cannot show prices or ratings (Amazon allows them only from its API); `price_class` hidden until the owner decides | Unanswered everywhere. Do not answer it with figures or guessed tiers |

## 2. What is not attracting the audience (data, 10 Nov)

- The Deals tab: about 66 human impressions and 17 clicks in 30 days (tracking is recent; traffic is tiny). The one live guide (published 9 Nov 14:00): 3 views, 9 impressions, 0 clicks.
- Guides are tagged `holiday-guide`, so they are kept out of the blog index, home, topics and RSS. Inbound routes: the Deals nav, per-card "Read the guide" links, the new "Read next" block, and social posts Hippo-Assist publishes to Facebook and Instagram with UTM links.
- Plan coverage: the plan's eight target categories are laptops, smartwatches, headphones, earbuds, creator mics, mini PCs, monitors, phones. The five guides cover three (headphones, mini PCs, monitors) plus two off-plan (keyboards, webcams). The catalog has no laptops, smartwatches, phones, earbuds or mics, so nothing can be written for them yet.
- Timing: one guide live, two scheduled (11 and 13 Nov), two blocked. Thanksgiving 26 Nov, Black Friday 27 Nov, Cyber Monday 30 Nov. At this cadence at most five guides are live by the peak, two of them off-plan.
- Evidence age: 8 of 16 card rows rest on sources older than 18 months (low confidence).
- Caveat: article-surface click counts are high (13.9% click rate), so bots are probably not fully filtered. Treat all click numbers as soft.

## 3. Section work requested

a. For each of the 5 guides, list what is missing for the Deals tab (hero image, reader hook of at most 160 characters naming who it is for and the pick, `deals-pinned` or not, lane) and propose values. Do not apply them. Pin at most 3 guides at a time, nearest to their window.
b. Extend card facts to every product on a holiday Top 10 list with usable evidence. Rank by category price class and how often the product appears. Say plainly which products have no evidence.
c. Re-sequence by plan window, not readiness: what must be live before 23 Nov, before 27 Nov, before 30 Nov.
d. Give each guide a social hook of at most 120 characters (no price, no "deal") for Hippo-Assist. The engine does not post.

## 4. Core workflow review (propose, do not implement)

Check the pipeline end to end against these failure modes:

1. Topic choice not tied to the plan windows, catalog coverage, demand evidence or past engagement.
2. Three outputs (guide, card facts, social hook) should come from one evidence pass.
3. The engine's own pre-publish projection finds site-side problems (tables, wrong picks, date, hero) but still lets the guide schedule. Make a failing projection block scheduling.
4. Source freshness: prefer the newest sources; re-check before 1 Dec.
5. No post-publish loop: read views, impressions and clicks per guide 24 and 72 hours after release (`affiliate_impressions` and `affiliate_clicks`, `article_slug` equal to the guide slug) and decide keep, re-draft or retire.
6. When a plan category has no catalog products, hand the owner a category request (which products, why) instead of waiting. The discovery cron proposes inactive products; the owner activates them.

Reply with a short revised workflow and the per-guide fix list.
