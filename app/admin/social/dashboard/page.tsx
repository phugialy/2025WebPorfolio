"use client";

import { Navigation } from "@/components/navigation";
import { SessionProvider } from "@/components/auth/session-provider";
import { AdminGuard } from "@/components/auth/admin-guard";
import { DashboardBoard } from "./dashboard-board";

export default function AdminSocialDashboardPage() {
  return (
    <>
      <Navigation />
      <SessionProvider>
        <AdminGuard>
          <DashboardBoard />
        </AdminGuard>
      </SessionProvider>
    </>
  );
}
