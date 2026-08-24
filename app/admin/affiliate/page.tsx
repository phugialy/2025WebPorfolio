"use client";

import { Navigation } from "@/components/navigation";
import { ConvexClientProvider } from "@/lib/convex-provider";
import { SessionProvider } from "@/components/auth/session-provider";
import { AdminGuard } from "@/components/auth/admin-guard";
import { AdminAffiliateBoard } from "./admin-affiliate-board";

export default function AdminAffiliatePage() {
  return (
    <>
      <Navigation />
      <SessionProvider>
        <ConvexClientProvider>
          <AdminGuard>
            <AdminAffiliateBoard />
          </AdminGuard>
        </ConvexClientProvider>
      </SessionProvider>
    </>
  );
}
