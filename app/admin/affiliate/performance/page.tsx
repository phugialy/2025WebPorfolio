import { Navigation } from "@/components/navigation";
import { SessionProvider } from "@/components/auth/session-provider";
import { AdminGuard } from "@/components/auth/admin-guard";
import { PerformanceBoard } from "./performance-board";

export default function AdminAffiliatePerformancePage() {
  return (
    <>
      <Navigation />
      <SessionProvider>
          <AdminGuard>
            <PerformanceBoard />
          </AdminGuard>
      </SessionProvider>
    </>
  );
}
