import type { ReactNode } from "react";

// /work renders live data through a client-side Convex useQuery -- it can't
// be statically prerendered in any environment without NEXT_PUBLIC_CONVEX_URL
// (confirmed: broke the CI build). Same fix as app/admin/layout.tsx.
export const dynamic = "force-dynamic";

export default function WorkLayout({ children }: { children: ReactNode }) {
  return children;
}
