"use client";

import { useSession, signOut } from "next-auth/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminGuardProps {
  children: ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAdmin = useQuery(
    api.users.isAdmin,
    session?.user?.email ? { email: session.user.email } : "skip"
  );

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent("/admin/projects")}`);
    }
  }, [status, router]);

  // Loading state
  if (status === "loading" || isAdmin === undefined) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - will redirect via useEffect
  if (!session || !session.user) {
    return null;
  }

  // Authenticated but not admin
  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="flex justify-center">
            <Lock className="w-16 h-16 text-destructive" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-2">
              You are signed in as <strong>{session.user.email}</strong>
            </p>
            <p className="text-muted-foreground mb-6">
              This page is restricted to administrators only.
            </p>
            <Button
              onClick={() => signOut({ callbackUrl: "/" })}
              variant="outline"
              size="lg"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated and admin - render children
  return <>{children}</>;
}

