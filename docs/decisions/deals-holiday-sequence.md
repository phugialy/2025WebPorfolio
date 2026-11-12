# Deals holiday sequence

Decided 2026-11-11. Scope: the Deals pages only (`/deals`, `/deals/<holiday>`) and the discovery engine that feeds them. Nothing on the rest of the site changes.

## What it does

The five holidays run as one sequence, each with its own dates, color and product focus, and the Deals pages follow the calendar.

| Holiday | On now | Day itself | Color | Focus (categories listed first) |
|---|---|---|---|---|
| Thanksgiving | Nov 1 - 26 | Nov 26 | amber `#B45309` | Home & Kitchen, Travel, Laptops, Personal Care |
| Black Friday | Nov 27 - 29 | Nov 27 | red `#DC2626` | Laptops, Monitors, Audio, Smartwatches, Phones, Home & Kitchen, AI Hardware |
| Cyber Monday | Nov 30 - Dec 1 | Nov 30 | blue `#2563EB` | Keyboards, Input Devices, Webcams, Docking & Hubs, Storage, Desk Setup, Creative Tools, Cables & Chargers |
| Christmas | Dec 2 - 25 | Dec 25 | green `#15803D` | Audio, Smartwatches, Personal Care, Home & Kitchen, Everyday Carry, Creative Tools, Cables & Chargers |
| New Year | Dec 26 - Jan 3 | Jan 1 | violet `#6D28D9` | Monitors, Desk Setup, Wellness & Ergonomics, Webcams, Personal Care, Home & Kitchen, Keyboards |

The windows follow each other with no gap, so exactly one holiday is "on now" from Nov 1 to Jan 3 (`lib/deals-core.ts`, `HOLIDAYS` and `holidayStatuses`). A day turns over at midnight in America/Chicago.

## Where it shows

- **Masthead** (every Deals page): colored chip per holiday with its state (Now, 16d, Ended); the masthead takes the color of the holiday being viewed or on now.
- **Hub banner** (`DealsNowBanner`): the holiday on now, its one-line intent, the categories actually in its list, a button to its Top 10, and the next holiday with its start.
- **Timeline** (`DealsTimeline`): the five stops in calendar order on the hub and at the foot of each holiday page.
- **Top 10 series row**: the holiday on now first, coming ones in date order, ended ones last; each card has its color and status.
- **Holiday page**: a banner in its color with status, heading, intent, intro and "In this list". An ended holiday says so and links to the one on now.

## Rules that keep it honest

- The "In this list" chips and the banner read the real list, so a page never promises a kind of product it does not have. Until home, travel and personal-care products are approved in `/admin`, Thanksgiving and Christmas are mostly tech and gear, with the focus products placed first as they arrive.
- The three most-opened products keep the first places on every list (the page says so). The focus applies after them; whatever is left fills the list, so no list is thin.
- Copy says nothing about prices, discounts or books (tests in `lib/deals-copy.test.ts` and `lib/deals-calendar.test.ts`).
- Every accent color clears 4.5:1 against white text (tested).

## Discovery lead time

`PLAN_WINDOWS` in `lib/discovery-plan.ts` search one to two weeks ahead of the list they will feed, leading with the next holiday's focus: Thanksgiving's focus and Black Friday's first (Nov 9 - 20), Black Friday and Cyber Monday (Nov 20 - 26), gifts for Christmas (Dec 1 - 13), and a home-office and fresh-start set for New Year (Dec 13 on, with standing desks and office chairs added as targets). The $80 floor and the any-product-type screening are unchanged, and a human still activates every proposal.

## Not done

- No migration. Holiday definitions are in code, as before.
- The page copy for the holiday lists was rewritten away from "tech and gear" and "AI builders". Article pages and the rest of the site are untouched.
- Hub and Top 10 pages are built at most hourly (`revalidate = 3600`), so a holiday can turn over up to an hour after midnight Chicago time.
