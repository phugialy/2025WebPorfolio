"use client";

import { Navigation } from "@/components/navigation";
import { SessionProvider } from "@/components/auth/session-provider";
import { AdminGuard } from "@/components/auth/admin-guard";
import { DealsManager } from "./deals-manager";

export default function AdminDealsPage() {
  return (
    <>
      <Navigation />
      <SessionProvider>
        <AdminGuard>
          <DealsManager />
        </AdminGuard>
      </SessionProvider>
    </>
  );
}
