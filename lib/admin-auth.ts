import { auth } from "@/lib/auth";

export async function requireAdminSession() {
  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const userEmail = session?.user?.email?.toLowerCase();

  if (!session?.user || !userEmail) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }

  if (session.user.isAdmin || (adminEmail && userEmail === adminEmail)) {
    return { ok: true as const, session };
  }

  return { ok: false as const, status: 403, error: "Forbidden" };
}
