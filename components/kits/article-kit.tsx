import Link from "next/link";
import { DealsClickTracker } from "@/components/deals/deals-click-tracker";
import { DealsProductCard } from "@/components/deals/deals-product-card";
import { DEALS_DISCLOSURE_SENTENCE } from "@/lib/deals-core";
import { kitForArticle, kitRefSlug, kitIsReady, type Kit } from "@/lib/kits-core";
import { getKitProducts, type KitProduct } from "@/lib/kits";

// The kit's products at the end of its article: every product in the kit, so the
// article and the /kits page tell the same story. Plain markup so it can be tested.
export function ArticleKitView({ kit, products }: { kit: Kit; products: KitProduct[] }) {
  return (
    <section aria-labelledby="article-kit-heading" data-article-kit={kit.slug} className="my-10 rounded-2xl border border-border bg-card p-5 md:p-6">
      <DealsClickTracker />
      <p className="text-xs font-semibold tracking-wide text-muted-foreground">The kit</p>
      <h2 id="article-kit-heading" className="mt-1 font-display text-xl font-bold">
        {kit.h1}
      </h2>
      <ul className="mt-5 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product, index) => (
          <li key={product.id}>
            <DealsProductCard
              product={product}
              refSlug={kitRefSlug(kit)}
              layout="stack"
              compact
              rank={index + 1}
              headingLevel={3}
              idPrefix="article-kit"
              note={product.role}
            />
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        {DEALS_DISCLOSURE_SENTENCE}{" "}
        <Link href="/disclosure" className="underline underline-offset-2 hover:text-foreground">
          Disclosure
        </Link>
        .{" "}
        <Link href={`/kits/${kit.slug}`} className="font-semibold text-foreground underline underline-offset-2">
          See the full kit
        </Link>
      </p>
    </section>
  );
}

// Shown only on the article a kit is tied to, and only once the kit has products.
export async function ArticleKit({ slug }: { slug: string }) {
  const kit = kitForArticle(slug);
  if (!kit) return null;
  try {
    const products = await getKitProducts(kit.slug);
    if (!kitIsReady(products.length)) return null;
    return <ArticleKitView kit={kit} products={products} />;
  } catch (error) {
    console.error("Article kit skipped:", error);
    return null;
  }
}
