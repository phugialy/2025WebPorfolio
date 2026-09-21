"use client";

import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { SessionProvider } from "@/components/auth/session-provider";
import { AdminGuard } from "@/components/auth/admin-guard";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Simple index for the social-agent admin surfaces -- three links, no
// landing-page content beyond that, per the task's explicit "don't
// over-build a landing page beyond that" instruction.
export default function AdminSocialIndexPage() {
  return (
    <>
      <Navigation />
      <SessionProvider>
        <AdminGuard>
          <main className="min-h-screen bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl">
              <p className="text-sm font-semibold uppercase text-primary">Admin Control Center</p>
              <h1 className="mt-2 font-display text-4xl font-bold">Social Agent</h1>
              <p className="mt-3 text-muted-foreground">
                Admin surfaces for the social media manager agent subsystem.
              </p>

              <div className="mt-8 grid gap-3">
                <Link href="/admin/social/queue">
                  <Card className="transition-colors hover:bg-accent">
                    <CardHeader>
                      <CardTitle className="text-base">Approval queue</CardTitle>
                      <CardDescription>Review, edit, approve, or reject agent-drafted posts.</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>

                <Link href="/admin/social/dashboard">
                  <Card className="transition-colors hover:bg-accent">
                    <CardHeader>
                      <CardTitle className="text-base">Dashboard</CardTitle>
                      <CardDescription>
                        Recent runs, guardrail config, brand profile, queue stats, and spend vs. cap.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>

                <Link href="/admin/social/settings">
                  <Card className="transition-colors hover:bg-accent">
                    <CardHeader>
                      <CardTitle className="text-base">Brand settings</CardTitle>
                      <CardDescription>Edit the brand voice, tone guidelines, banned topics, and disclosure template.</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              </div>
            </div>
          </main>
        </AdminGuard>
      </SessionProvider>
    </>
  );
}
