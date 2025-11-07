"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut } from "lucide-react";

export function LoginButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <Button variant="ghost" size="sm" disabled>
        Loading...
      </Button>
    );
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 text-sm">
          {session.user.image && (
            <img
              src={session.user.image}
              alt={session.user.name || "User"}
              className="w-6 h-6 rounded-full"
            />
          )}
          <span className="text-muted-foreground">
            {session.user.name || session.user.email}
          </span>
          {session.user.isAdmin && (
            <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">
              Admin
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            signOut({ callbackUrl: "/" });
          }}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="default"
      size="sm"
      onClick={() => {
        signIn("google", { callbackUrl: "/admin/projects" });
      }}
    >
      <LogIn className="w-4 h-4 mr-2" />
      Sign In with Google
    </Button>
  );
}
