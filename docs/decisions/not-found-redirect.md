# Missing pages go to the homepage (Nov 15 2026)

## What visitors get

Any page that does not exist now shows a short "That page isn't here" screen, records the dead address and where the visitor came from, and sends them to the homepage after about 1.5 seconds. Before, a bare Next.js 404 screen with no navigation.

## Why the status stays 404

The server still answers **404** to anything that asks. A blanket server-side redirect to `/` would make every dead address look like a working page ("soft 404"): search engines keep the dead URL, trust the site less, and we could never see broken links. People are redirected by the page itself, crawlers read the 404.

## Finding what sends people there

The page sends a GA4 event `page_not_found` with `path` and `referrer` (live site only). In GA4 add `path` and `referrer` as custom dimensions, or look in Realtime / DebugView, to see the top dead paths and who links to them.

## Causes found and fixed the same day

- `/work` and `/work/*` returned a bare plain-text "Not found" to everyone except the admin (middleware). Old portfolio links (resume, profiles) land there. They now redirect (307, never cached) to `/`.
- `/guestbook` was listed in `sitemap.xml` but the page does not exist: removed from the sitemap.
- Probed all 522 sitemap and RSS URLs on production: 520 fine, `/guestbook` (404) and the FableCut article (500, known `<path-to>` MDX bug).

Not covered: a removed article slug or product still gets the 404 screen and then the homepage (an article-list redirect would be more helpful; say if you want it).
