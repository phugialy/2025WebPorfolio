"use client";

import { Navigation } from "@/components/navigation";
import { SessionProvider } from "@/components/auth/session-provider";
import { AdminGuard } from "@/components/auth/admin-guard";
import { QueueBoard } from "./queue-board";

export default function AdminSocialQueuePage() {
  return (
    <>
      <Navigation />
      <SessionProvider>
        <AdminGuard>
          <QueueBoard />
        </AdminGuard>
      </SessionProvider>
    </>
  );
}
