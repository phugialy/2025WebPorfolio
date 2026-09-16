"use client";

import { Suspense } from "react";
import { Navigation } from "@/components/navigation";
import { SessionProvider } from "@/components/auth/session-provider";
import { AdminGuard } from "@/components/auth/admin-guard";
import { PlacementsBoard } from "./placements-board";

export default function AdminAffiliatePlacementsPage() {
  return (
    <>
      <Navigation />
      <SessionProvider>
          <AdminGuard>
            <Suspense fallback={<p className="p-12 text-muted-foreground">Loading...</p>}>
              <PlacementsBoard />
            </Suspense>
          </AdminGuard>
      </SessionProvider>
    </>
  );
}
