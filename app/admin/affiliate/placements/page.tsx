"use client";

import { Suspense } from "react";
import { Navigation } from "@/components/navigation";
import { ConvexClientProvider } from "@/lib/convex-provider";
import { SessionProvider } from "@/components/auth/session-provider";
import { AdminGuard } from "@/components/auth/admin-guard";
import { PlacementsBoard } from "./placements-board";

export default function AdminAffiliatePlacementsPage() {
  return (
    <>
      <Navigation />
      <SessionProvider>
        <ConvexClientProvider>
          <AdminGuard>
            <Suspense fallback={<p className="p-12 text-muted-foreground">Loading...</p>}>
              <PlacementsBoard />
            </Suspense>
          </AdminGuard>
        </ConvexClientProvider>
      </SessionProvider>
    </>
  );
}
