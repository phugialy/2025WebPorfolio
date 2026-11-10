# Holiday Top 10 pages: what shoppers need, and the rubric for the guide engine

Prepared 2026-11-10. Research only plus the schema that carries the answer. Companion to `lib/deals-core.ts` (`ProductFacts`) and `supabase/migrations/0024_deals_product_facts.sql`.

Evidence labels: **(P)** primary source read, **(S)** secondary or vendor commentary, **(O)** our own data.

## 1. What is wrong today

(O) Of the 88 live, unflagged products, **7 (8%)** carry any `buy_if` / `skip_if` text. The big-ticket picks carry none: the mini PCs, the GPU and the monitors that sit at the top of the Thanksgiving list show a name and a photo and nothing else. The Top 10 series row had no picture at all, only a gradient and a "10".

The thin feeling is a data problem first. The holiday guide engine already reads reviews for each guide it writes (verdict, what reviewers liked, what they did not, who it suits, how many sources, how recent), but that knowledge stays inside the guide article and only about five products have a guide. The Top 10 page cannot show what the engine knows because there is nowhere to store it per product.

## 2. What a shopper asks, stage by stage

| Stage | The question in their head | What answers it on our page |
| --- | --- | --- |
| Arrive from search or social | "Is this list for me?" | Title names the buyer and the occasion; the series cover shows real products and how many picks |
| Scan the ten | "What is this? Is it for me? Can I trust it?" | Photo, plain one-line description, "best for", one proof point |
| Shortlist two or three | "What do I give up? Which specs matter?" | Strengths, **the catch**, three or four key specs |
| Decide | "Is the price fair today? Will it fit what I own? Is it safe to buy?" | Live price is on Amazon (we say so); "before you buy" checks; how sure we are |
| After | "What else do I need? What if this sells out?" | Guide link, next-best pick, the next list |

## 3. How much data is enough

- (S) Baymard's product-list research: shoppers select and reject products from the list item itself, so the item must carry enough to judge without opening the product page. Universal info plus category-specific attributes. Their detailed attribute list is paywalled; the confirmed points are price, variations, contents and enough thumbnails ([Baymard list-item info](https://baymard.com/blog/product-listing-information)).
- (S) Choice-overload meta-analyses show no reliable effect from the number of options alone; what matters is how hard each option is to evaluate ([Scheibehenne et al. 2010 meta-analysis](https://econpapers.repec.org/RePEc:oup:jconrs:v:37:y:2010:i:3:p:409-425); [Kellogg summary](https://insight.kellogg.northwestern.edu/article/what-predicts-consumer-choice-overload)). So ten picks is fine if each card is easy to read. Budget per card: about 35 to 45 words in the scan layer.
- (S) Practitioner guidance converges on: use-case labels beat vague badges ("best for small desks", not "premium pick"); six to eight comparison rows beat an exhaustive table; a flaws section builds trust. Wirecutter's guide anatomy names who it is for, the picks, and "flaws but not dealbreakers" ([Wirecutter, mirrored](https://sonicgame.netlify.app/host-https-www.nytimes.com/wirecutter/blog/anatomy-of-a-guide)). Vendor stats on conversion lift are unverified and not used here.
- (S) Readers are skeptical of generic "top 10" affiliate lists. An honest "catch" and a visible evidence line are the counterweight ([summary of buyer-guide sources](https://ecommercefastlane.com/buying-guides-top-of-funnel-considered-purchases/)).

Rule of thumb adopted: **a reader should be able to choose between two cards in about a minute without opening anything**, and open the guide only for depth.

## 4. Price and buying power

**What we may show.** (S, not yet checked against Amazon's own text) Amazon allows displaying prices only when the data comes from its API (Creators API, which replaced the Product Advertising API) with a date and time stamp beside it, and customer ratings and review counts likewise need the API ([Conduct Atlas policy record](https://conductatlas.com/platform/amazon-associates/amazon-associates-program-policies/price-display-via-data-feeds-requires-timestamp-disclosure/); [GetChatAds summary](https://www.getchatads.com/blog/amazon-associates-operating-agreement-ai-apps/)). Secondary sources disagree on freshness (one hour versus 24 hours) and say API access needs recent qualifying sales. The site has no API feed and no revenue yet, so:

- **No dollar amounts, no "% off", no star ratings or review counts anywhere.** This matches the standing rule in `docs/decisions/affiliate-display-and-yield.md`.
- The card says plainly that the price is Amazon's and changes daily, and the button leads there. That is the honest answer to "how much is it?".
- **Price class** (`value` / `mainstream` / `premium`, drawn as $, $$, $$$) is stored but **hidden** (`SHOW_PRICE_CLASS = false`). It answers "is this in my budget?" without a number, but it is derived from a price we are not allowed to display, so it needs the owner's deliberate yes. If on, it must be relative to the product type ("premium for a monitor"), never an absolute claim.

**Buying power.** (S) NRF's 2026 survey (Prosper Insights, 8,094 adults, 1 to 7 October 2026): 56% say economic conditions will shape their spending; 43% start before November; 64% say they will wait for Thanksgiving weekend to do most of their shopping ([NRF](https://nrf.com/blog/2026-holiday-shopping-trends-what-consumers-are-planning)). No 2026 electronics-specific budget figure was found; the 2025 survey had electronics at 22% of wished-for gifts. Implication for copy and ordering: lead with "worth it" and "what to skip", be explicit when a cheaper option does the job, and put the catch next to every recommendation. Expensive items (mini PCs, GPUs, monitors) are where a wrong choice costs most, so they need the most evidence, not the least.

## 5. Card facts (what the engine writes per product)

Stored in `deals_product_facts`, one row per product. All text is plain, no HTML, no dollar signs.

| Field | Limit | Rule |
| --- | --- | --- |
| `what_it_is` | 140 chars | One plain line: type, size or class, main use. No marketing words. |
| `best_for` | 80 chars | The reader, not the product: "Gamers who also work on it". |
| `buy_if` / `skip_if` | 200 chars each | Concrete situations. `skip_if` is required whenever a verdict is given. |
| `strengths` | up to 3, 90 chars each | What independent reviewers praised, specific ("Strong contrast"), not "great quality". |
| `caveats` | up to 2, 90 chars each | What reviewers criticised. **At least one for every recommended product.** |
| `key_specs` | up to 4, 40 chars each | Facts that decide the choice ("34-inch 3440x1440", "180 Hz"). No prices. |
| `verdict` | enum | `recommended`, `recommended_with_caveats`, `not_enough_evidence` |
| `confidence` | enum | `high`, `medium`, `low` |
| `evidence_count` / `evidence_newest` | int / date | Independent sources read, and the newest one's date. |
| `price_class` | enum or null | Optional, hidden until the owner turns it on. |
| `guide_slug` | text | The guide that goes deeper, if one exists. |
| `verified_at` | timestamp | When the engine last checked this card. |

## 6. Rubric (pass or fail; every line must pass before a card ships)

**Blockers (any one fails the card):**
1. No dollar amount, discount, "deal", "lowest price" or "was/now" language.
2. No star rating or review count (ours or Amazon's).
3. A recommendation with no caveat, or a verdict with no `skip_if`.
4. A claim with no independent source behind it. `strengths` and `caveats` must each trace to a named review or spec sheet; if only one source was read, the verdict is `not_enough_evidence` and confidence is `low`.
5. Specs not confirmed for the **exact model** (same name, different version is common). If the match is uncertain, drop the spec or mark the verdict `not_enough_evidence`.
6. Wording claims we tested the product. We have not. "Reviewers say", never "we found".

**Quality (score one point each; ship at 6 of 8 or better):**
1. `what_it_is` could be read aloud to a friend and they would know what the thing is.
2. `best_for` names a person or situation, not a quality.
3. Each strength is specific and different from the others.
4. The caveat is the one that would actually change a buying decision.
5. Key specs are the ones that separate this product from its neighbours in the same list.
6. Newest source is no older than 18 months (older: lower the confidence one step).
7. Within one list, no two cards say the same thing; the list covers different buyers, not ten versions of one.
8. Reading only the card, a shopper could say who it is for and who should skip it.

**Freshness:** re-check `verified_at` older than 30 days before December 1 and every 14 days after. Anything past that window falls back to the product's plain text, not an old verdict.

**List-level (the Top 10 page as a whole):** states who the list is for and what is inside; mixes at least three buyer types or budgets; orders by evidence and reader interest, not by commission; ends with "before you buy" checks and the next step (guide, next list).

## 7. What was built from this (phase A)

- Series covers: three real product photos from the list, the pick count, and an "Inside: ..." category line.
- A detailed card for the Top 10 pages that shows the facts above and falls back to today's text when a product has none.
- The facts table (migration 0024, not yet run) and a loader that tolerates the table being missing.
- "Before you buy" and "Read next" blocks under each list.

## 8. Decisions for the owner

1. Run migration 0024 so the engine has somewhere to write.
2. Price class on or off. Recommendation: stay off until Amazon's current wording on derived price information is read from the primary source.
3. Order of work for the engine: the products on the first Top 10 lists first (Thanksgiving week, then Black Friday), starting with the highest-priced items.

## 9. What was not verified

Amazon's primary Operating Agreement and Program Policies text on price display and the freshness window; Baymard's paywalled attribute list; a 2026 electronics budget figure; any conversion lift from richer cards on this site (there is no baseline yet, so measure card-level clicks per impression before and after).
