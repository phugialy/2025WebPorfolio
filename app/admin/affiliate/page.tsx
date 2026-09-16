"use client";

import { Navigation } from "@/components/navigation";
import { SessionProvider } from "@/components/auth/session-provider";
import { AdminGuard } from "@/components/auth/admin-guard";
import { AssetsBoard } from "./assets-board";

export default function AdminAffiliatePage() {
  return (
    <>
      <Navigation />
      <SessionProvider>
          <AdminGuard>
            <AssetsBoard />
          </AdminGuard>
      </SessionProvider>
    </>
  );
}
