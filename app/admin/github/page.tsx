"use client";

import { Navigation } from "@/components/navigation";
import { SessionProvider } from "@/components/auth/session-provider";
import { AdminGuard } from "@/components/auth/admin-guard";
import { AdminProjectsContent } from "../projects/admin-projects-content";

export default function AdminGithubPage() {
  return (
    <>
      <Navigation />
      <SessionProvider>
          <AdminGuard>
            <AdminProjectsContent />
          </AdminGuard>
      </SessionProvider>
    </>
  );
}
