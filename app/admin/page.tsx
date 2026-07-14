"use client";

import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { ConvexClientProvider } from "@/lib/convex-provider";
import { SessionProvider } from "@/components/auth/session-provider";
import { AdminGuard } from "@/components/auth/admin-guard";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Github, Newspaper } from "lucide-react";

function AdminHub() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <p className="text-sm font-semibold uppercase text-primary">Admin Control Center</p>
          <h1 className="mt-2 font-display text-4xl font-bold">Choose a control surface.</h1>
          <p className="mt-3 text-muted-foreground">
            Blog operations and GitHub/project operations are separated so each workflow stays clear.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Newspaper className="h-5 w-5" />
              </div>
              <CardTitle>Blog Control</CardTitle>
              <CardDescription>
                Review article candidates, approve drafts, publish papers, and monitor content stages.
              </CardDescription>
              <Link href="/admin/blog" className="pt-4">
                <Button>Open Blog Board</Button>
              </Link>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Github className="h-5 w-5" />
              </div>
              <CardTitle>GitHub Control</CardTitle>
              <CardDescription>
                Manage project visibility, GitHub sync, repository access, and featured work.
              </CardDescription>
              <Link href="/admin/github" className="pt-4">
                <Button variant="outline">Open GitHub Board</Button>
              </Link>
            </CardHeader>
          </Card>
        </div>
      </section>
    </main>
  );
}

export default function AdminPage() {
  return (
    <>
      <Navigation />
      <SessionProvider>
        <ConvexClientProvider>
          <AdminGuard>
            <AdminHub />
          </AdminGuard>
        </ConvexClientProvider>
      </SessionProvider>
    </>
  );
}
