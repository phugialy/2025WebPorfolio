import Link from "next/link";
import { DealsClickTracker } from "@/components/deals/deals-click-tracker";
import { DealsProductCard } from "@/components/deals/deals-product-card";
import { getDealsData } from "@/lib/deals";
import { ARTICLE_PROMO_MIN, ARTICLE_PROMO_REF, pickArticlePromo } from "@/lib/deals-promo";
import { DEALS_DISCLOSURE_SENTENCE, currentHoliday, isDealsActive, type Holiday } from "@/lib/deals-core";

type PromoProduct = React.ComponentProps<typeof DealsProductCard>["product"];

// What the end-of-article card looks like, with the products already chosen. Plain
// markup so it can be tested without a database.
export function ArticleDealsCardView({ holiday, products }: { holiday: Holiday; products: PromoProduct[] }) {
  return (
    <section aria-labelledby="article-deals-heading" data-article-deals={holiday.slug} className="my-10 rounded-2xl border border-border bg-card p-5 md:p-6">
      <DealsClickTracker />
      <p className="text-xs font-semibold tracking-wide text-muted-foreground">Holiday picks</p>
      <h2 id="article-deals-heading" className="mt-1 font-display text-xl font-bold">
        {holiday.name}: {holiday.niche.toLowerCase()}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{holiday.intent}</p>
      <ul className="mt-5 grid list-none gap-4 p-0 sm:grid-cols-3">
        {products.map((product) => (
          <li key={product.id}>
            <DealsProductCard product={product} refSlug={ARTICLE_PROMO_REF} layout="stack" compact showRank={false} headingLevel={3} idPrefix="article-promo" />
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        {DEALS_DISCLOSURE_SENTENCE}{" "}
        <Link href="/disclosure" className="underline underline-offset-2 hover:text-foreground">
          Disclosure
        </Link>
        .{" "}
        <Link href={`/deals/${holiday.slug}`} className="font-semibold text-foreground underline underline-offset-2">
          See all {holiday.name} picks
        </Link>
      </p>
    </section>
  );
}

// Shown at the end of an article during the holiday season: a few products from the
// holiday that is on now, so the readers the site already has can find them. Reads the
// Deals data the Deals pages already cache, so it adds no database read per view, and it
// renders nothing outside the season or when the list is empty.
export async function ArticleDealsCard({ seed }: { seed: string }) {
  if (!isDealsActive()) return null;
  const now = currentHoliday();
  if (!now) return null;
  try {
    const data = await getDealsData();
    const products = pickArticlePromo(data.holidays[now.holiday.slug] ?? [], seed);
    if (products.length < ARTICLE_PROMO_MIN) return null;
    return <ArticleDealsCardView holiday={now.holiday} products={products} />;
  } catch (error) {
    console.error("Article deals card skipped:", error);
    return null;
  }
}
