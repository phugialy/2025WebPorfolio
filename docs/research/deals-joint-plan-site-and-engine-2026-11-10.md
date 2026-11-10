# Deals: joint plan for the website session and the holiday guide engine

2026-11-10. Companion to `deals-page-audit-2026-11-10.md` (what is wrong) and `holiday-engine-alignment-brief-2026-11-10.md` (the first brief). The two sessions touch different things, so the work is split by who owns the artifact. **Nothing the owner has not approved goes live or into the database.**

## What each side owns

| Website session | Holiday guide engine |
| --- | --- |
| Page code, layout, ranking, labels, tracking, deploys | Evidence, facts, guides, list editorial, sourced dates |
| Loads and validates what the engine delivers; the owner approves the write | Delivers files in the agreed shapes; never writes to the live database or site on its own |

## Shared contracts (so neither side guesses)

1. **Card facts**: the `deals_product_facts` shape (see the rubric). Delivered as JSON, validated by the site's limits (the validator already exists and passed the first 16).
2. **Guide publication fields**: `hero_image_url`, a reader hook of at most 160 characters (who it is for plus the pick), lane, and whether to pin (`deals-pinned`, at most three at a time).
3. **List editorial**, one object per Top 10 page: `{ slug, angle (one sentence, how this list differs from the others), intro (two sentences, no prices), productIds (ordered, 10 to 14), whyThisList (one line per product, 90 characters) }`. The site turns approved objects into code.
4. **Dated facts** (retailer sale windows, price-pressure notes): `{ claim, source_url, source_publisher, source_date, checked_at }`. A claim older than 7 days or without a source is not shown.

## Order of work, by date

### Done now on the website (branch, not yet deployed)
Duplicate hero sentence removed; the sticky "top AI stories" bar no longer covers the Deals pages; rail headings read correctly to screen readers; "Trending now" renamed "Popular with readers" and limited to products with a real picture; the first places no longer go to products showing a placeholder tile (this also moves the power bank and the glasses off the top three); Christmas copy no longer mentions books.

### By 13 Nov
- **Engine**: facts for the 16 products that actually fill the five lists (K15, IT15, EVO-X1, RTX 5070, Alienware AW3425DWM, LG 34WN80C, LG 34WR55QK, Dell WD25, RK R98, Logitech MX Vertical, AOC 15.6" portable, Versadesk PowerPro, Logitech Brio 101, OMOTON C2, INIU power bank, livho glasses); its existing 16 drafts keep their value for the guides. Say plainly which of the 16 have no evidence. Hero image and hook proposals for each guide.
- **Website**: a loader script that reads the engine's JSON, validates it, and prints a diff for the owner; the Deals guide card (hero, "Buying guide" badge, publish date, no internal tags); compact phone header.

### By 19 Nov
- **Engine**: list editorial for all five pages (contract 3), including Christmas by recipient (developer, remote worker, creator) and a stocking-stuffer list drawn from the Small add-ons; the headphones list and guide.
- **Website**: distinct selection per page from the approved editorial; size-aware ranking so big-ticket picks lead Black Friday and small add-ons get their own list; load approved facts.

### By 23 Nov
- **Engine**: a sourced "when the big sales start" set (contract 4) and "buy before prices rise" notes for memory and storage items, each with a source and a check date; refresh daily to 1 Dec.
- **Website**: the dated sales block and the notes on cards; hide any claim past its freshness window.

### By 1 Dec
- **Both**: after-event states ("still worth buying", "what to expect"), switched by date; the Christmas gift pages live.

## Needs the owner (neither session can decide)
Deploy approvals; running any loader against the database; the price label policy (the size labels are live, the relative `$` class stays off); whether laptops and smartwatches get added (discovery proposes, the owner activates, and the 21 hidden products still await a pick); a deals-specific email promise only if a deals email will actually be sent (the newsletter today is a daily AI-news email, so the site does not promise reminders it cannot send).

## How we will know it worked
Measure on the live host only (the GA tag now ignores local and preview traffic): engaged sessions on `/deals*`, card clicks per card view by size (`deals_product_click` carries `size`), the share of phone sessions that scroll past the first row, and clicks from LinkedIn and Facebook referrals. Baseline today: about 10 real Deals sessions in 14 days, so judge direction over two weeks, not single days.

## Working rules
Small steps, each tested and checked on its own URL before going live; every number cites its date and source; the site shows nothing it cannot support; the engine states "no evidence" instead of filling a gap.
