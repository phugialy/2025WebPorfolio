import { isAuthorizedCronRequest } from "@/lib/article-automation";
import type { AuthGate } from "@/social-agent/ports";

// Wraps the existing isAuthorizedCronRequest (lib/article-automation.ts) --
// reuses CRON_SECRET for the new social-agent cron routes instead of
// minting a separate secret, per the research doc's Deployment plan
// ("reuse the existing CRON_SECRET for the new cron routes rather than
// minting another one").
export function createCronAuthGate(): AuthGate {
  return {
    isAuthorized(request: Request): boolean {
      return isAuthorizedCronRequest(request);
    },
  };
}
