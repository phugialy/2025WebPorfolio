import { headers } from "next/headers";
import { Navigation } from "@/components/navigation";
import { LiveHomeDashboard } from "@/components/home/live-home-dashboard";
import { getActivePartners, logAffiliateImpression } from "@/lib/affiliate";
import { getPostSummaries } from "@/lib/articles";
import { getAmbitPartner } from "@/lib/ambit";
import { isAmbitProduct } from "@/lib/ambit-brand";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const [posts, allPartners, ambit] = await Promise.all([
    getPostSummaries(),
    getActivePartners(),
    getAmbitPartner(),
  ]);
  // Ambit gets its own always-visible module with its required disclosures,
  // not a slot in the rotating carousel.
  const partners = allPartners.filter((partner) => !isAmbitProduct(partner));

  const requestUserAgent = (await headers()).get("user-agent");
  try {
    await Promise.all([
      ...partners.map((partner) =>
        logAffiliateImpression({
          productId: partner.id,
          articleSlug: "homepage-carousel",
          userAgent: requestUserAgent || undefined,
        })
      ),
      // Two distinct labels (info card vs. save-energy paragraph) so each
      // piece gets its own CTR instead of blending into one number.
      ...(ambit
        ? ["homepage-ambit-card", "homepage-ambit-save"].map((ref) =>
            logAffiliateImpression({
              productId: ambit.id,
              articleSlug: ref,
              userAgent: requestUserAgent || undefined,
            })
          )
        : []),
    ]);
  } catch (error) {
    console.error("Error logging homepage partner impressions:", error);
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen overflow-hidden bg-background text-foreground">
        <LiveHomeDashboard initialPosts={posts} partners={partners} ambit={ambit} />
      </main>
    </>
  );
}
