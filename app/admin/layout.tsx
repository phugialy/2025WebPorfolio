import type { ReactNode } from "react";

// Every /admin page needs a live session and, for most, a Convex client that
// isn't configured in every environment (confirmed: CI has no
// NEXT_PUBLIC_CONVEX_URL, which crashed static prerendering of these pages
// one at a time across several builds before this was centralized here).
// None of this should ever be statically generated at build time anyway --
// it's all auth-gated, always-fresh-per-request content.
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
