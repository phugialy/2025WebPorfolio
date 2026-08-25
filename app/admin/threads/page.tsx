"use client";

import { Navigation } from "@/components/navigation";
import { ConvexClientProvider } from "@/lib/convex-provider";
import { SessionProvider } from "@/components/auth/session-provider";
import { AdminGuard } from "@/components/auth/admin-guard";
import { AdminThreadsBoard } from "./admin-threads-board";

export default function AdminThreadsPage() {
  return (
    <>
      <Navigation />
      <SessionProvider>
        <ConvexClientProvider>
          <AdminGuard>
            <AdminThreadsBoard />
          </AdminGuard>
        </ConvexClientProvider>
      </SessionProvider>
    </>
  );
}
