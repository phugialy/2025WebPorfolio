# Drawn covers for holiday guides, Nov 28 2026

The holiday buying guides arrive without a picture, so their pages, the Deals guide list and every shared link fell back to the generic site card.

## What it does

- `/api/guide-hero/<slug>` draws a 1200x675 cover for a guide: the brand's dark ground and gold bar, the title in Newsreader, and a line drawing of the product kind (monitor, mini PC, keyboard, headphones, webcam, camera, or a gift box when no tag matches). `?mark=1` draws only the drawing, 4:3, for the narrow thumbnail on the Deals guide list, where the titled cover would be cut through its title.
- Only articles tagged `holiday-guide` get one, so the route cannot stamp arbitrary text on the brand. A real `hero_image_url` always wins.
- Used as the article hero (no caption under it), the link-preview image and the structured-data image. The pinned-guide tiles in the Deals carousel keep their own art, since they already print the title.
- Nothing is stored: the image is drawn on request and cached for a year. `GUIDE_HERO_VERSION` in `lib/guide-hero.ts` busts that cache when the drawing changes. A retitled guide keeps its old cover until the version is bumped.

## Why drawn, not product photos

Amazon's terms do not allow copying, cropping or re-hosting their product images, which a photo collage would need. An AI image would cost money per guide and could show a product that does not exist. The drawn cover is free, ours, and consistent.

## Also fixed

Article cards (blog and the Deals guide list) showed the draft date; they now show the publish date, like the article page.
