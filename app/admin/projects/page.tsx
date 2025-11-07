"use client";

import { Navigation } from "@/components/navigation";
import { ConvexClientProvider } from "@/lib/convex-provider";
import { AdminProjectsContent } from "./admin-projects-content";

export default function AdminProjectsPage() {
  return (
    <>
      <Navigation />
      <ConvexClientProvider>
        <AdminProjectsContent />
      </ConvexClientProvider>
    </>
  );
}
