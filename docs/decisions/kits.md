# Kits: ten products that belong together, and that stay up (Nov 20 2026)

Asked for by the owner: a 10-product niche around the DJI Osmo, plus GTA 6 (consoles included), a Home AI Lab, and a travel kit, each with an article, built so they last past the holidays. Placement left to us.

## What it is

- `/kits` lists them, `/kits/<slug>` is one kit's page: a lead product, then the other nine, with the standard earnings disclosure and no price or discount claims. Four kits: `osmo-pocket-3-creator-kit`, `gta-6-kit`, `home-ai-lab-kit`, `travel-kit`.
- Kits are defined in code (`lib/kits-core.ts`): ten role slots each, filled by Amazon listing ID. The page shows the catalog products behind those IDs that are active and not held back; a slot with no active product is left out. No migration.
- Clicks and impressions are tracked as `deals-catalog-kit-<slug>` and show in the Deals stats panel as "Kit: ...".
- A kit appears on the hub, the sitemap and the Deals pages once 5 of its products are active (`KIT_MIN_PRODUCTS`); before that its page says it is being put together and is `noindex`.

## Where they go

- **During the season:** a "Build a kit" row on `/deals` and on every holiday list, beside the holiday lists, which are unchanged.
- **After Jan 3:** `/deals` and the holiday pages redirect to `/kits` (before: `/resources`), so the kits take over and keep the season's links.
- **On the article:** an article can be tied to a kit by setting `articleSlug` in the kit; that article then shows all ten products at its end (and not the holiday picks card), and the kit page links back to it.

## Why these products (alignment check, Nov 20)

- Osmo: the owner chose the holiday engine's list over the first one drawn here (Nov 20), because its article is written to that list. The hero is the Pocket 3 (the Pocket 4 is not sold in the US), then a wireless mic, memory card, battery handle, ND filters, desk tripod, wide-angle lens, extendable tripod, footage backup, and the Canon PowerShot V1 as an honest alternative. Listing IDs came from Amazon search results, not the catalog API (Canopy was out of credits). DJI's own ND filter set and mini tripod have no Amazon listing found yet, so those two slots are empty and the page shows eight. The six earlier Osmo rows (Mic Mini, SanDisk card, case, 80-inch tripod, Neewer ND set, magnetic mount) stay inactive.
- GTA 6: PS5 and Xbox Series X|S only (no PC announced). Storage is the concrete prep item, so each console gets a storage slot. Reports say it runs at 30 fps at launch, so the kit asks for a 4K TV and does not lean on 120 Hz.
- Home AI Lab: guides say the graphics card's memory is the limit, and unified-memory mini PCs or an OCuLink GPU dock are the alternative; the GMKtec K15 already in the catalog has OCuLink. 64 GB DDR5 kits and 2 TB SSDs were priced at $750 to $1,300 on the day, so memory was left out and storage is a 2 TB drive plus an external one.
- Travel: carry-on, packing cubes, power, adapter, headphones, neck pillow, backpack, tracker, charger, and the Osmo to film it.

## Catalog

30 products were added as inactive "market-scan proposal" rows and, on Nov 20, activated (flag cleared) apart from six earlier Osmo rows; five Osmo Pocket 3 rows were added active. Rows carry the engine's tags (`osmo-pocket-3`, `vlogging`, `creator-kit`) and the gaming headset is tagged Gaming, not Audio, so the headphones guide does not pick it up. Six kit products were already in the catalog. Consoles pay about 1% commission on Amazon and most electronics 2 to 4%, so the point of the gaming kit is traffic from a launch week, not margin.

## Not done

- The four articles (the holiday guide engine writes them) and the facts rows for each product. The Osmo kit has `articleSlug` set; the kit page links to the article only once that post exists, and the end-of-article block appears when it is published.
- Tracking of kit read-outs; same rule as the article card: group by kit, sweepers removed, at least 30 impressions.
