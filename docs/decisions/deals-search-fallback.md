# Deals search fallback (first consumer of the stream radar's output)

Status: built on branch `guide-design`, not deployed. Needs migration `0025_deals_search_terms.sql`.

## Problem

The Deals search was an exact-word match across name, category and the "buy if" line. A shopper who typed
"earbuds" (we stock headphones) or "gift" or "refrigerator" got "Nothing matches that search" and nothing else.
The words they typed went to Google Analytics only, so the site itself never learned what it was missing.

## What it does now

Three outcomes, in `lib/deals-search.ts`:

| Tier | When | What the shopper sees |
|---|---|---|
| exact | every word is in the name, category, tags or reason | the matches |
| close | words match through related words (earbuds -> headphone), or most words match | "No exact match for ... Closest to what you are after", then the matches |
| none | nothing relevant | "We do not carry ... yet", and six products worth a look |

Matching is from the start of a word, so "ai" finds AI products and not "training". Related words live in
`SYNONYM_GROUPS`, built from what the catalog stocks; add a group when the log shows a repeated miss.

## Pull: what makes a product attractive enough to click

Ordering inside a tier is relevance first, then **pull**, a 0 to 1 score built only from things the shopper can see:

| Part | Weight | Meaning |
|---|---|---|
| photo | 0.25 | a real product picture (Amazon's logo does not count) |
| reason | 0.20 | one line on who it is for |
| activity | 0.25 | other shoppers opened it recently (flattened, so one hot product cannot bury the rest) |
| label | 0.10 | Trending or New, which are earned |
| size | 0.10 | a purchase size label, so the cost of acting is clear |
| guide | 0.10 | a guide page backs it up |

The six products offered on a miss are the highest pull across the catalog, at most two per section and three
per size. These weights are a starting point. The three search outcomes are tracked under their own labels
(`deals-catalog-search`, `-close`, `-fallback`), so the admin Deals results show whether the offered products
actually get opened, and the weights should be tuned from that.

## Learning from it

Each settled search is written to `deals_search_terms` (term, outcome, result count, bot flag, time). No visitor
identifier is stored, and terms that look like an email, a link or a phone number are refused. The admin Deals page
shows "What shoppers search for and cannot find", the ranked list of terms we could not answer. The stream radar
reads the same table as one of its demand sources.

## Not done

- No server-side ledger yet; matching runs in the browser over the catalog that arrives with the page.
- The related-word list is hand-made.
- Pull has no price term on purpose: price class stays off until the owner decides (`SHOW_PRICE_CLASS`).
