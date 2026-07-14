"use client";

import { Navigation } from "@/components/navigation";
import { ConvexClientProvider } from "@/lib/convex-provider";
import { SessionProvider } from "@/components/auth/session-provider";
import { AdminGuard } from "@/components/auth/admin-guard";
import { AdminArticleBoard } from "../admin-article-board";

export default function AdminBlogPage() {
  return (
    <>
      <Navigation />
      <SessionProvider>
        <ConvexClientProvider>
          <AdminGuard>
            <AdminArticleBoard />
          </AdminGuard>
        </ConvexClientProvider>
      </SessionProvider>
    </>
  );
}
