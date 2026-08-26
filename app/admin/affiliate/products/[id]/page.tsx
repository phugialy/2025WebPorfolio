import { Navigation } from "@/components/navigation";
import { ConvexClientProvider } from "@/lib/convex-provider";
import { SessionProvider } from "@/components/auth/session-provider";
import { AdminGuard } from "@/components/auth/admin-guard";
import { ProductDetailBoard } from "./product-detail-board";

export default async function AdminAffiliateProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <Navigation />
      <SessionProvider>
        <ConvexClientProvider>
          <AdminGuard>
            <ProductDetailBoard productId={id} />
          </AdminGuard>
        </ConvexClientProvider>
      </SessionProvider>
    </>
  );
}
