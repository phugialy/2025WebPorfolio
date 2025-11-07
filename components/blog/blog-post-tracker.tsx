"use client";

import { useScrollTracking, useTimeTracking } from "@/lib/blog-tracking";

interface BlogPostTrackerProps {
  postSlug: string;
  children: React.ReactNode;
}

export function BlogPostTracker({ postSlug, children }: BlogPostTrackerProps) {
  useScrollTracking(postSlug, true);
  useTimeTracking(postSlug, true);

  return <>{children}</>;
}

