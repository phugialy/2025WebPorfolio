import { Navigation } from "@/components/navigation";
import { SessionProvider } from "@/components/auth/session-provider";
import { AdminGuard } from "@/components/auth/admin-guard";
import { ArticlesBoard } from "./articles-board";

export default function AdminAffiliateArticlesPage() {
  return (
    <>
      <Navigation />
      <SessionProvider>
          <AdminGuard>
            <ArticlesBoard />
          </AdminGuard>
      </SessionProvider>
    </>
  );
}
