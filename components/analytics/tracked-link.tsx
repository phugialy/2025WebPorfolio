"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes } from "react";
import { trackNavigationEvent, type NavigationEventName } from "@/lib/analytics";

type TrackedLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    eventName: NavigationEventName;
    eventParams: Record<string, string>;
  };

/**
 * A next/link that also fires a GA4 navigation event on click, for the
 * Phase 4 Article->Article / Article->Hub / Article->Resource funnel.
 * Never blocks navigation on the tracking call.
 */
export function TrackedLink({ eventName, eventParams, onClick, ...linkProps }: TrackedLinkProps) {
  return (
    <Link
      {...linkProps}
      onClick={(event) => {
        trackNavigationEvent(eventName, eventParams);
        onClick?.(event);
      }}
    />
  );
}
