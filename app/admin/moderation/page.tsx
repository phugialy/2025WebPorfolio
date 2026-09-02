"use client";

import { Navigation } from "@/components/navigation";
import { SessionProvider } from "@/components/auth/session-provider";
import { AdminGuard } from "@/components/auth/admin-guard";
import { ModerationBoard } from "./moderation-board";

export default function AdminModerationPage() {
  return (
    <>
      <Navigation />
      <SessionProvider>
        <AdminGuard>
          <ModerationBoard />
        </AdminGuard>
      </SessionProvider>
    </>
  );
}
