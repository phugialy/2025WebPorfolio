"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useRef, useCallback } from "react";

/**
 * Generate a session ID for this user session
 */
function getSessionId(): string {
  if (typeof window === "undefined") return "";
  
  let sessionId = sessionStorage.getItem("blog_session_id");
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem("blog_session_id", sessionId);
  }
  return sessionId;
}

/**
 * Hook for tracking blog interactions
 */
export function useBlogTracking() {
  const trackInteraction = useMutation(api.blogInteractions.trackInteraction);
  const sessionId = getSessionId();

  const track = useCallback(
    async (
      postSlug: string,
      interactionType: string,
      value?: number,
      metadata?: {
        tag?: string;
        searchQuery?: string;
        filterType?: string;
        filterValue?: string;
      }
    ) => {
      try {
        await trackInteraction({
          postSlug,
          interactionType,
          value,
          metadata: {
            ...metadata,
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
            referrer: typeof document !== "undefined" ? document.referrer : undefined,
          },
          sessionId,
        });
      } catch (error) {
        // Silently fail - tracking should not break the app
        console.error("Failed to track interaction:", error);
      }
    },
    [trackInteraction, sessionId]
  );

  return { track };
}

/**
 * Hook for tracking scroll depth on a blog post page
 */
export function useScrollTracking(postSlug: string, enabled: boolean = true) {
  const { track } = useBlogTracking();
  const maxScrollDepth = useRef(0);
  const trackedDepths = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const scrollDepth = Math.round(
        ((scrollTop + windowHeight) / documentHeight) * 100
      );

      if (scrollDepth > maxScrollDepth.current) {
        maxScrollDepth.current = scrollDepth;

        // Track milestone depths (25%, 50%, 75%, 100%)
        const milestones = [25, 50, 75, 100];
        milestones.forEach((milestone) => {
          if (
            scrollDepth >= milestone &&
            !trackedDepths.current.has(milestone)
          ) {
            trackedDepths.current.add(milestone);
            track(postSlug, "scroll", milestone);
          }
        });
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [postSlug, enabled, track]);
}

/**
 * Hook for tracking time spent on a blog post
 */
export function useTimeTracking(postSlug: string, enabled: boolean = true) {
  const { track } = useBlogTracking();
  const startTime = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    startTime.current = Date.now();

    // Track every 30 seconds
    intervalRef.current = setInterval(() => {
      if (startTime.current) {
        const timeSpent = Math.floor((Date.now() - startTime.current) / 1000);
        track(postSlug, "time_spent", timeSpent);
      }
    }, 30000);

    // Track total time when component unmounts or page is hidden
    const handleVisibilityChange = () => {
      if (document.hidden && startTime.current) {
        const timeSpent = Math.floor((Date.now() - startTime.current) / 1000);
        track(postSlug, "time_spent", timeSpent);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (startTime.current) {
        const timeSpent = Math.floor((Date.now() - startTime.current) / 1000);
        track(postSlug, "time_spent", timeSpent);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [postSlug, enabled, track]);
}

/**
 * Track a post click
 */
export function trackPostClick(postSlug: string, trackFn: ReturnType<typeof useBlogTracking>["track"]) {
  trackFn(postSlug, "click");
}

/**
 * Track a tag click
 */
export function trackTagClick(postSlug: string, tag: string, trackFn: ReturnType<typeof useBlogTracking>["track"]) {
  trackFn(postSlug, "tag_click", undefined, { tag });
}

/**
 * Track a search query
 */
export function trackSearch(postSlug: string, query: string, trackFn: ReturnType<typeof useBlogTracking>["track"]) {
  trackFn(postSlug, "search", undefined, { searchQuery: query });
}

/**
 * Track a filter usage
 */
export function trackFilter(
  postSlug: string,
  filterType: string,
  filterValue: string,
  trackFn: ReturnType<typeof useBlogTracking>["track"]
) {
  trackFn(postSlug, "filter", undefined, { filterType, filterValue });
}

