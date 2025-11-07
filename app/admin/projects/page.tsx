"use client";

import { Navigation } from "@/components/navigation";
import { ConvexClientProvider } from "@/lib/convex-provider";
import { SessionProvider } from "@/components/auth/session-provider";
import { AdminGuard } from "@/components/auth/admin-guard";
import { AdminProjectsContent } from "./admin-projects-content";

export default function AdminProjectsPage() {
  return (
    <>
      <Navigation />
      <SessionProvider>
        <ConvexClientProvider>
          <AdminGuard>
            <AdminProjectsContent />
          </AdminGuard>
        </ConvexClientProvider>
      </SessionProvider>
    </>
  );
}
