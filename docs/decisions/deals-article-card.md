# Deals picks card on article pages (experiment, Nov 15 2026 - Jan 3 2027)

Decided 2026-11-14. Temporary: the card only renders while the Deals season is on (`isDealsActive`), and disappears by itself after Jan 3.

## Why

Search will not bring readers to the Deals pages this season (see the SEO assessment: low authority, 13 days to Black Friday, page 1 held by large publishers), and the newsletter has one pending subscriber. The audience the site really has is the readers of its articles: about 800 to 2,000 affiliate-card impressions a day on article pages, against 0 to 170 on the Deals pages. The cheapest honest test is to put products in front of them.

## What it is

At the end of an article (just above the subscribe card), three products from the holiday that is on now: **one tech pick and two non-tech picks**, so every view compares them on the same readers. The set rotates by article (a stable hash of the slug), so different articles show different products and more of the list is measured. It is not shown on the holiday buying guides themselves.

- Links go through the existing tracked redirect with the label `deals-catalog-from-article`; impressions use the existing Deals impression tracker (a card counts once per tab session when half on screen). Clicks and impressions therefore show in the Deals stats panel as "Article pages: holiday picks card" with no new data plumbing.
- The card carries the standard earnings disclosure and a link to the full disclosure; links are `sponsored`; no price or percent off is stated.
- It reads the Deals data the Deals pages already cache, so it adds no database read per view, and renders nothing when the list is empty or the read fails.
- Products with no real picture are skipped. Non-tech means the test categories in `lib/deals-test.ts` (Home & Kitchen, Personal Care, Travel, Wellness & Ergonomics).

## What we are testing

| Question | Measure | Read it as |
|---|---|---|
| Do article readers click holiday picks at all? | clicks / impressions on the label | the baseline for this audience |
| Do they click non-tech products as much as tech? | the same ratio, split by the product's category | tech vs non-tech on the same card, same readers |
| Does it beat the old surfaces? | compare with the Picks rail on article pages and the `/resources` page | where the next product slot should go |

## How to read it

- Count a click only when it is not automated: drop browsers that open 8 or more different products in one day (the rule the ranking already uses). About 55% of Deals clicks in the first week were sweeps.
- Wait for at least 30 impressions per group (tech, non-tech) before comparing; at present article traffic that is about a week.
- Read by group, not by product. Single products will not collect enough impressions to judge.
- No sales data exists, so this measures interest (click-through), not revenue.

## Decision rule

- Non-tech click-through at least about 70% of tech after a week: widen the non-tech share of the card and of the article Picks rail.
- Well below: keep the non-tech test on the Deals pages only and put the card's slots back to tech.
- Either way, if the card beats the `/resources` page click-through, move more product slots onto article pages.

## Not done

- No per-product pages and no evergreen URL, so none of this builds search value (separate decision).
- The ElevenLabs card for voice, audio and video articles, and a "listen to this article" player, are the next candidates once this one has a week of data.
