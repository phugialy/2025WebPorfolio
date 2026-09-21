"use client";

import { Navigation } from "@/components/navigation";
import { SessionProvider } from "@/components/auth/session-provider";
import { AdminGuard } from "@/components/auth/admin-guard";
import { SettingsBoard } from "./settings-board";

export default function AdminSocialSettingsPage() {
  return (
    <>
      <Navigation />
      <SessionProvider>
        <AdminGuard>
          <SettingsBoard />
        </AdminGuard>
      </SessionProvider>
    </>
  );
}
