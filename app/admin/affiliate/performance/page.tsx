import { Navigation } from "@/components/navigation";
import { ConvexClientProvider } from "@/lib/convex-provider";
import { SessionProvider } from "@/components/auth/session-provider";
import { AdminGuard } from "@/components/auth/admin-guard";
import { PerformanceBoard } from "./performance-board";

export default function AdminAffiliatePerformancePage() {
  return (
    <>
      <Navigation />
      <SessionProvider>
        <ConvexClientProvider>
          <AdminGuard>
            <PerformanceBoard />
          </AdminGuard>
        </ConvexClientProvider>
      </SessionProvider>
    </>
  );
}
