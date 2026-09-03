"use client";

import { Navigation } from "@/components/navigation";
import { SessionProvider } from "@/components/auth/session-provider";
import { AdminGuard } from "@/components/auth/admin-guard";
import { SeoBoard } from "./seo-board";

export default function AdminSeoPage() {
  return (
    <>
      <Navigation />
      <SessionProvider>
        <AdminGuard>
          <SeoBoard />
        </AdminGuard>
      </SessionProvider>
    </>
  );
}
