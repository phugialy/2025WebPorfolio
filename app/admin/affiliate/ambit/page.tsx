import { Navigation } from "@/components/navigation";
import { SessionProvider } from "@/components/auth/session-provider";
import { AdminGuard } from "@/components/auth/admin-guard";
import { AmbitBoard } from "./ambit-board";

export default function AdminAmbitPage() {
  return (
    <>
      <Navigation />
      <SessionProvider>
        <AdminGuard>
          <AmbitBoard />
        </AdminGuard>
      </SessionProvider>
    </>
  );
}
