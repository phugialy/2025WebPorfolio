# Deals section audit: UI, UX and content (live site, 2026-11-10)

Scope: `/deals` and the five Top 10 pages (`/deals/thanksgiving-week`, `black-friday`, `cyber-monday`, `christmas-gifts`, `new-year-setup`), every component they use, desktop and a 375px phone, plus GA4, the product database and `docs/research/affiliate-market-outreach-2026-11-09.md`. Evidence labels: **(L)** seen on the live site, **(D)** database, **(G)** GA4, **(R)** the market research (secondary sources, not re-verified), **(I)** my inference.

## 0. What the pages are made of

Hub: masthead with holiday pills and countdowns, hero (H1, intro, disclosure), Top 10 series carousel (5 covers), Trending now (5 cards), Top products by category (size filter, search, five rails of up to 30 cards), Buying guides (1 guide), More offers (1 card), newsletter card, plus a sticky newsletter bar and the footer signup. Top 10 pages: masthead, breadcrumb, H1 and intro, disclosure, size legend, ten wide cards, "Before you buy", "Read next" (only when a guide exists), "More holiday lists", newsletter card.

## 1. Who is actually here (G, live host only, 28 days)

1,427 sessions: 1,250 direct (4% engaged), 113 organic social (31% engaged), 22 organic search (36% engaged). Phones are 47 sessions (3%), but engage far better (24 s per session against 5 s on desktop). Almost all users are new (1,400 of 1,402). Real Deals traffic is about 10 sessions in 14 days, nearly all from LinkedIn referrals. The earlier "spike" was local test traffic (fixed). Reading: today's audience is small and desktop-heavy; the channels being opened next (Facebook and Instagram via Hippo-Assist) are mobile-first, and the market is phone-first (R: phones were 56.4% of US online orders in 2025, 70% of Cyber Week orders in Salesforce's data).

## 2. Findings

Severity: **P1** fix before the next push of traffic, **P2** before Black Friday, **P3** when time allows. Effort: S under half a day, M about a day, L several days.

### Hub `/deals`

| # | Sev | Finding | Fix | Eff |
|---|---|---|---|---|
| H1 | P1 | The hero intro repeats itself (L): "The first picks are what readers open most; the rest rotate daily. The first picks are ranked by what readers opened in the last week." My wording change left both sentences in. | One sentence. | S |
| H2 | P1 | On a phone the first product is about 1,500 px down (L, measured): header, three rows of holiday pills, a four-line H1, a long intro, the disclosure, and a sticky bar covering about a quarter of the screen come first. On desktop the first row of series covers sits right at the fold. | Compact hero: one-line promise, pills as one horizontally scrolling row, disclosure as a single line under the first products' row (still near the links), series row right below. | M |
| H3 | P1 | Three newsletter asks on one shopping page (sticky bar, in-page card, footer), all worded "top AI stories" (L). A shopper came for gifts. | On `/deals*` hide the sticky bar and word the one in-page card for the reader: reminders for Black Friday and Cyber Monday, a price-check checklist. Copy needs the existing newsletter compliance wording (`docs/decisions/newsletter-compliance-copy.md`). | S |
| H4 | P1 | Repetition: 138 cards for about 60 products on one page (L); the same top products appear in Trending and in the Thanksgiving and Technology rails. The page is 5,700 px on desktop and 7,900 px on a phone. | Show each product once per page (de-duplicate across rails), 8 to 12 per rail, drop or merge the weakest rail ("AI" has 11). Target about 3,500 px. | M |
| H5 | P1 | The ranking pushes cheap items to the top (D, L): a $-class power bank is #2 and blue-light glasses are #3 on three of the five Top 10 lists, and the power bank is #2 in Trending. That contradicts the $100+ strategy and "tech and gear picks". | With size labels now available, rank holiday lists among mid and big items and keep small add-ons for their own list ("stocking stuffers"). | M |
| H6 | P2 | "Trending now" is a claim the data cannot support: it is 7-day click counts on a tiny audience (G, D). #2 has no photo (L, Amazon placeholder). | Call it "Popular with readers"; require a real photo and a minimum activity. | S |
| H7 | P2 | The one guide card: no hero image (document icon), a "How-to-AI" badge that is the wrong lane, the internal tag `holiday-guide` shown to readers, and the date is the creation date (Nov 6) not the publish date (L). | A Deals-specific guide card: hero, "Buying guide" badge, hide internal tags, publish date. Needs the engine to supply hero images and hooks (brief sent). | M |
| H8 | P2 | "More offers" is one card ("Amazon holiday deals"). No retailer sales calendar although Best Buy and Walmart run their own windows (R: Walmart Nov 12 to 15, Best Buy Nov 19 to 28). | A dated "when the big sales start" block, each date sourced and re-checked before showing. | M |
| H9 | P3 | Accessibility: rail headings read as "Thanksgiving30" (the count is inside the heading, no separator) (L). 15 images have empty alt (decorative covers, acceptable). Tap targets are 36 px (above the 24 px minimum, under the 44 px comfort size). | Separate the count with visually hidden text; raise pills to 40 px. | S |
| H10 | P3 | Performance is fine at first load (L): 273 KB transferred, 144 of 146 images lazy, load in 0.9 s here. Largest risk is DOM size (138 cards), which H4 reduces. | none beyond H4 | none |

### Top 10 pages

| # | Sev | Finding | Fix | Eff |
|---|---|---|---|---|
| P1 | P1 | The five pages are about three pages (L, D): **Cyber Monday and Christmas are the same ten products in the same order**; Thanksgiving shares 8 of 10 with them; all five intros share one sentence. Search engines will treat them as near-duplicates, and a reader sees the same list under five titles. | Give each page its own job and its own selection: Thanksgiving "early deals worth watching", Black Friday "the big-ticket buys", Cyber Monday "desk and homelab", Christmas "gifts by person and by size", New Year "home office reset". Use sections and the size label to differentiate. | M |
| P2 | P1 | Copy promises what is not there (L): Christmas meta says "books, desk gear, gadgets and computing hardware", intro says "books, desk upgrades and small gadgets", New Year lists a books section. Books are excluded from Deals by owner decision. The Christmas list holds a graphics card, a dock and blue-light glasses, which is not gift-shaped. | Rewrite copy to match; build the Christmas page as gifts: by recipient (developer, remote worker, creator) and by size (stocking stuffers = Small add-ons). | M |
| P3 | P1 | Cards say almost nothing (L): Black Friday 0 of 10 have any description, the others 8 to 9 of 10 none. The facts table now exists but is empty. | Load the engine's facts, and aim them at the products that actually show: only 16 unique products fill all five pages (K15, IT15, EVO-X1, RTX 5070, Alienware, LG 34WN80C and 34WR55QK, Dell dock, R98 keyboard, MX Vertical, AOC portable monitor, Versadesk, Brio 101, OMOTON stand, INIU power bank, livho glasses). The engine's 16 drafts overlap that set only slightly (headphones and webcams rarely reach the top). I told it earlier to cover the whole catalog; the data says to start with these 16. | M |
| P4 | P2 | Two of the top three slots on three pages show a grey placeholder tile instead of a photo (L). | Fix the two catalog images, and have the ranking skip photo-less products for the top slots. | S |
| P5 | P2 | The pages do not change with the calendar (I): after Cyber Monday the Black Friday and Cyber Monday pages still read "ahead of". | A state per event: before, during, after ("still worth buying", "what to expect next year"), switched by date. | M |
| P6 | P3 | "Read next" appears only when a guide features a listed product, so most pages show none today (L). | Fills itself as guides publish; keep. | none |

## 3. Content against the market and the events

| Event or need (evidence) | What the Deals section does | Gap | Recommendation |
|---|---|---|---|
| Dates: Thanksgiving 26 Nov, Black Friday 27 Nov, Cyber Monday 30 Nov; Cyber Week is 17.3% of season spend (R) | Countdown pills, five pages | No "when sales start" content; pages do not switch after the event | H8 and P5 |
| Headphones +1,700% on Black Friday, smartwatches +1,500% (R) | 5 headphones in the catalog, none on a Top 10; no smartwatches | The categories shoppers move on most are missing from the lists | Headphones guide and list this week; smartwatches via the discovery plan |
| Electronics $63.3B this season, computers' peak discount about 23% (R) | Mini PCs and monitors lead | No laptops, the biggest tickets | Discovery plan targets laptops from now; needs owner activation |
| Affordability: 56% say the economy shapes spending (R, NRF) | Size labels and filter | No "worth it vs skip", no cheaper option beside a big one | Card facts (skip-if, the catch), a "cheaper alternative" pointer per big item |
| Memory and SSD prices rising through 2026 (R) | Nothing | "Buy before prices rise" is a real reason to act now for mini PCs and SSDs | A short, dated note on those items, only with a current source |
| Gifting: 64% shop Thanksgiving weekend (R); gift lists need people and budgets | One Christmas list that is not gift-shaped | No recipient or budget framing | P2: gifts by person and by size |
| Phones carry 56% to 70% of orders (R); our channels are becoming mobile (Facebook, Instagram) | Desktop-first layout | First product 1,500 px down on a phone | H2 |
| Gen-AI referrals to retail up 693% (R) | Item-list structured data on the hub and each Top 10 | No `llms.txt`; cards carry no facts yet | Facts per card (P3), `llms.txt` (small, already raised with Hippo-Assist) |

## 4. Order of work

1. **Now (about a day):** H1, H3, H9, H6, P4 and the copy part of P2 (all small and visible).
2. **Before 19 Nov:** H5 (size-aware ranking), H4 (one appearance per product), P1 (distinct lists), H2 (compact mobile hero), load facts for the 16 products that show (P3).
3. **Before 23 Nov:** H8 (sales calendar, sourced and dated), headphones list and guide, H7 (guide card with hero), "buy before prices rise" notes.
4. **Before 1 Dec:** P5 (after-event states), Christmas gifts by person and by size, stocking-stuffer list.

## 5. Not verified

Core Web Vitals (no field data; only a load time measured here); real mobile behavior of today's visitors (only 47 phone sessions); the retailer dates and market figures above are from the earlier research and are secondary sources, so re-check each before putting it on the page; Amazon's exact wording on price display (still unread from the primary source).
