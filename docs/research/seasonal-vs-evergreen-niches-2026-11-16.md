# Seasonal holiday deals vs evergreen niches (PC setup, office, travel gear, winter fashion)

Researched 2026-11-16. Read-only: no code changed. Sources: Google Trends via SerpApi (US, 2025-11-16 to 2026-11-14, 12 searches, 219 left this month), our own affiliate click history (150 days), and Amazon's fixed commission table as reported by a third-party article (Lasso, checked 14 Oct 2026; not Amazon's own page, so verify in the Associates dashboard).

## 1. Demand shape over a year (interest vs "webcam", a flat all-year term)

"Level" = average interest as a multiple of webcam's. "Peak" = the strongest month vs the term's own average. "Floor" = the weakest month vs average (1.0 = perfectly flat; 0 = dead). "Nov-Dec share" = share of the year's interest in those two months (an even spread would be 17%).

| Group | Term | Level | Peak | Floor | Nov-Dec share |
|---|---|---|---|---|---|
| Holiday deals | black friday deals | 0.81 | 11.4x (Nov) | 0.13 | 68% |
| | cyber monday deals | 0.08 | 17.3x (Nov) | 0 | 100% |
| | gift ideas | 0.89 | 3.0x (Dec) | 0.45 | 41% |
| | christmas gifts | 0.41 | 5.3x (Dec) | 0 | 66% |
| PC setup | desk setup | 0.04 | 1.3x | 0.85 | 14% |
| | gaming setup | 0.05 | 1.3x | 0.70 | 20% |
| | monitor arm | 0.13 | 2.2x | 0.55 | 10% |
| | desk mat | 0.11 | 3.2x | 0.46 | 9% |
| Office | office chair | 0.64 | 2.2x | 0.49 | 10% |
| | standing desk | 0.36 | 2.4x | 0.51 | 10% |
| | laptop stand | 0.19 | 2.5x | 0.29 | 6% |
| | desk lamp | 0.16 | 3.5x | 0.43 | 8% |
| Travel gear | carry on luggage | 0.27 | 1.6x | 0.73 | 16% |
| | travel backpack | 0.31 | 3.1x | 0.32 | 10% |
| | packing cubes | 0.08 | 2.1x | 0.36 | 12% |
| | travel adapter | 0.15 | 3.0x | 0.10 | 7% |
| Winter fashion | puffer jacket | 0.41 | 2.7x (Nov) | 0.26 | 38% |
| | snow boots | 0.25 | 3.0x (Nov) | 0.19 | 41% |
| | winter coat | 0.18 | 3.0x (Nov) | 0.32 | 35% |

Reading it:
- **Holiday-deal terms are the biggest and the shortest**: 66-100% of a year's interest in two months, dead the rest (floor 0 to 0.13).
- **PC setup and office are flat**: the weakest month is 0.4-0.85 of average, and Nov-Dec is the *weakest* part of the year for most of them (6-14%). Office chair is the biggest niche term (0.64 of webcam).
- **Travel gear is counter-seasonal**: it peaks in spring and early summer and is quiet in Nov-Dec. It is the natural slot for after Jan 3, not for this season.
- **Winter fashion peaks in November** and runs October to January (floor 0.19-0.32).
- Many terms peak in April 2026, including unrelated ones (laptop, keyboards, luggage). That looks partly like a Trends data quirk, so lean on floor and Nov-Dec share, not on the April peak.
- This is search interest, not sales. Google rounds small terms to whole points, which is why the yardstick had to be webcam, not laptop.

## 2. What our own readers click (human clicks, with browsers opening 8+ products a day removed)

16,636 human-flagged clicks in 150 days; 8,067 after removing sweepers. Clicks per day, October vs November so far (15.5 days):

| Category | Oct per day | Nov per day | Change |
|---|---|---|---|
| Webcams | 0.7 | 4.6 | 6.5x |
| Audio | 0.8 | 4.5 | 5.8x |
| Monitors | 3.8 | 13.6 | 3.6x |
| Wellness & Ergonomics | 1.7 | 3.7 | 2.3x |
| Keyboards | 3.3 | 7.2 | 2.2x |
| Desk Setup | 2.5 | 3.9 | 1.6x |
| Everyday Carry | 1.5 | 2.4 | 1.6x |
| Cables & Chargers | 3.7 | 5.0 | 1.4x |
| AI Hardware | 54.1 | 39.6 | 0.7x |
| AI Engineering | 40.5 | 34.4 | 0.85x |
| Books | 2.8 | 1.3 | 0.5x |

- Our readers' core is AI: AI Hardware plus AI Engineering are 67% of human clicks over 150 days. They do not rise in November.
- Desk, peripheral and audio categories rise 1.4x to 6.5x per day as the season starts: PC setup is where the holiday lift shows on *this* audience.
- There is no fashion or travel product in the catalog (apart from the new test items), so we have no evidence for those from our own readers. Only the Trends data speaks for them.
- Of the 8,067 clicks: 6,752 came from article pages, 567 from /resources, 474 from Deals.

## 3. Commission (Amazon fixed rates, third-party source)

| Category | Rate |
|---|---|
| Luggage | 4% |
| Fashion (apparel, shoes, accessories, watches) | 4% |
| Headphones | 3% |
| Furniture, Home, Business & Industrial | 3% |
| Computers, PC components | 2.5% |
| Televisions | 2% |
| All other categories | 4% |

An illustration, not data: a $300 monitor at 2.5% earns about $7.50 a sale; a $150 carry-on at 4% about $6; a $250 office chair at 3% about $7.50; a $100 puffer jacket at 4% about $4. Rates per sale are close, so volume and conversion decide. Apparel returns are common, and a returned item voids its commission (a general Amazon rule; no figure here).

## 4. What to do with it

| Option | Window | Audience fit | Verdict |
|---|---|---|---|
| Holiday deals (Thanksgiving to New Year) | Nov to Jan 3 only | Medium: tech categories rise, AI categories do not | Keep: it is built and costs nothing to run. It ends Jan 3 and redirects to /resources. |
| PC setup and office (monitors, desks, chairs, arms, mats, lamps, stands, webcams) | All year, no dead month | High: where our November lift is, and the site's tech readers | **Make this the evergreen core.** Needs an always-on home after Jan 3 (the Deals pages go away) and evergreen URLs. |
| Travel gear | Spring and summer (Mar-Jul), quiet now | Unknown: nothing in the catalog | Prepare for February to March. Not worth building for this season. |
| Winter fashion | Oct to Jan | Low: no evidence, off-topic for an AI and tech site, returns | Skip, or at most 1-2 test items beside the non-tech test. |

Next steps, each small:
1. Add discovery targets for the evergreen PC setup and office gaps: monitor arms, desk mats, desk lamps, laptop stands (standing desks and office chairs already exist).
2. Decide where the evergreen niche lives after Jan 3 (the `/resources` page, or a permanent "setup" page), so the season's traffic and links keep a home.
3. Revisit travel gear in February with a short season study (4 searches).

Method notes: Trends gives interest, not volume. The click table is one site over 5 months. Both point the same way: the season lifts our desk and peripheral categories now, and the flat niches keep working when the season ends.

## 5. Groups inside each niche, and where they go (added 2026-11-17)

Asked for by the owner: decide from the market which groups of products to create inside a niche, where they live, and how last year's practice informs it. Three kinds of evidence.

### How it was done last year (publishers and the market, 2025)
- What sold: Adobe's Black Friday 2025 ranking was electronics, video game consoles and home appliances. Salesforce's Thanksgiving data had home furniture up 27%, active apparel up 12% and toys up 10%. Both support the desk and home-office products as holiday sellers; apparel moved but was not the lead.
- How guides were grouped: by recipient or interest ("gifts for someone who works from home", "for dad"), by budget and by use. For home office, the chair is treated as the key item, then desk upgrades (monitor arm, desk mat, KVM, laptop stand).
- How pages were structured: an evergreen hub URL that stays up all year, with the seasonal page linked from it and refreshed afterwards ("post-holiday deals") to keep rankings; link to category pages rather than single products, which go out of stock after Christmas; "gift ideas for [recipient]" wording so the page stays relevant year-round.
- Not found: any hard data on how bundles or recipient pages convert against other formats. Sources are practitioner blogs and vendor guides, so this is direction, not proof.
- We have no Deals history of our own from last year (the section started in November 2026).

### How people search for each niche (Google Trends related queries, US, 12 months; 4 searches, 211 left)
- **desk setup**: monitor (83 against the head term's 100), gaming setup, office desk, pc setup, standing desk. A desk is described by its screen first.
- **home office setup**: office desk, home office monitor setup (30), ergonomic home office setup (18), dual monitor setup, standing desk. Display and ergonomics are the two sub-groups.
- **travel essentials**: men's, women's, kids', baby, "kit", "amazon travel essentials". Travel is searched by *who it is for*, not by product.
- **winter outfit**: by who (women, men), then boots and dresses; the rising queries are the Feb 2026 Winter Olympics, which is noise.

### What our readers click together (human clicks, 150 days, 1,313 visitor-days with 2 to 7 products)
- Readers who open an AI Hardware product also open Monitors (337 visitor-days), Keyboards (275), Cables & Chargers (140), Desk Setup (117), Webcams (93), Audio (77), Wellness & Ergonomics (76). That is a desk being built around a mini PC.
- Caveat: the strongest pairs (an AI Engineering book with the GMKtec K15 mini PC, 458) come from the article Picks rail that shows them side by side, so part of the pattern is page layout, not buying intent. Treat the cross-category pairs as the useful signal.

### Groups the evidence supports

| Group | Niche | Products in it | Evidence | Status |
|---|---|---|---|---|
| AI workstation desk | PC setup | mini PC, monitor, keyboard, webcam, cables and hub | readers of AI Hardware also click monitors, keyboards, cables, desk, webcam | most of it is in the catalog today |
| Monitors and displays | PC setup, office | curved gaming and ultrawide, 4K | "desk setup" top related query is monitor; curved niche spikes 4.5x at Black Friday | curved niche just added |
| Ergonomic desk | Office | standing desk, chair, monitor arm, laptop stand, desk mat, lamp | "ergonomic home office setup", "standing desk setup"; the chair is the key item in last year's guides | chair, desk and ergonomics exist; arm, mat, lamp, stand are gaps |
| Calls and focus | Office | webcam, headset, microphone | webcam and audio clicks rose 6x this month | in the catalog |
| Carry-on kit, by recipient | Travel | carry-on, packing cubes, adapter, travel backpack | "travel essentials" is searched by who; floor 0.73 and a spring peak | one product today; revisit in February |
| Winter basics, by recipient | Winter fashion | boots, puffer, base layers | peaks in November; no reader evidence | skip, or 1 to 2 test items |

### Where they go
1. **End of every article** (6,752 of 8,067 clicks start on article pages): the card we already ship shows the holiday picks in season. Extend it to show the group that matches the article's topic (an AI hardware article shows the workstation desk), and after Jan 3 it keeps working with the evergreen group instead of disappearing.
2. **An evergreen hub URL** for each niche that has a group (`/setup` for PC setup and office first, `/travel` in February), with the groups as sections. The holiday pages link to it and, after Jan 3, `/deals` should point at it instead of `/resources`, so the season's links land on a page that stays.
3. **The Deals lists keep pulling from the groups** through the fit score, so the holiday ordering and the groups share one catalog.

### Not decided
- Whether the hub is `/setup` or part of `/resources`.
- Whether to define groups in code (like the holiday categories; no migration) or in a table the admin can edit.
- No bundle conversion data exists anywhere we looked, so the first groups are a test; read them the way the article card is read (click-through per group, sweepers removed, 30 impressions per group).
