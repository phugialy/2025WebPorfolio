import { headers } from "next/headers";
import { Navigation } from "@/components/navigation";
import { LiveHomeDashboard } from "@/components/home/live-home-dashboard";
import { getActivePartners, logAffiliateImpression } from "@/lib/affiliate";
import { getPostSummaries } from "@/lib/articles";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const [posts, partners] = await Promise.all([getPostSummaries(), getActivePartners()]);

  const requestUserAgent = (await headers()).get("user-agent");
  try {
    await Promise.all(
      partners.map((partner) =>
        logAffiliateImpression({
          productId: partner.id,
          articleSlug: "homepage-carousel",
          userAgent: requestUserAgent || undefined,
        })
      )
    );
  } catch (error) {
    console.error("Error logging homepage partner impressions:", error);
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen overflow-hidden bg-background text-foreground">
        <LiveHomeDashboard initialPosts={posts} partners={partners} />
      </main>
    </>
  );
}
