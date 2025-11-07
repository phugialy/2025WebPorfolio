"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { LogIn, Lock } from "lucide-react";

function LoginContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin/projects";

  // Redirect if already logged in
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      router.push(callbackUrl);
    }
  }, [session, status, callbackUrl, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "authenticated") {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Lock className="w-16 h-16 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Access</h1>
            <p className="text-muted-foreground">
              Sign in with your Google account to access the admin panel
            </p>
          </div>
        </div>
        
        <Button
          onClick={() => signIn("google", { callbackUrl })}
          size="lg"
          className="w-full"
        >
          <LogIn className="w-4 h-4 mr-2" />
          Sign In with Google
        </Button>
        
        <p className="text-xs text-center text-muted-foreground">
          Only authorized administrators can access this area
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

