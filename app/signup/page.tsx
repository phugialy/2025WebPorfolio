"use client";

import { Suspense, useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, UserPlus } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Profile = { display_name: string } | null;

function SignupContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [profile, setProfile] = useState<Profile>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [nickname, setNickname] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") {
      setCheckingProfile(false);
      return;
    }
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        setProfile(data.profile);
        setCheckingProfile(false);
      });
  }, [status]);

  const submit = async () => {
    if (!nickname.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: nickname }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to register");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navigation />
      <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="w-full max-w-md space-y-6 py-16 text-center">
          <div className="flex justify-center">
            <UserPlus className="h-12 w-12 text-primary" />
          </div>

          {status === "loading" || checkingProfile ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : status !== "authenticated" ? (
            <>
              <div>
                <h1 className="text-2xl font-bold">Sign up to join the discussion</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Sign in with Google first, then pick a nickname -- that&apos;s the whole
                  process.
                </p>
              </div>
              <Button
                size="lg"
                className="w-full"
                onClick={() => signIn("google", { callbackUrl: `/signup?next=${encodeURIComponent(next)}` })}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Sign in with Google
              </Button>
            </>
          ) : profile || done ? (
            <>
              <div>
                <h1 className="text-2xl font-bold">You&apos;re registered</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {profile ? `Signed in as ${profile.display_name}.` : "Nickname saved."} You can
                  reply on any Field Note that has discussion open.
                </p>
              </div>
              <Button onClick={() => router.push(next)} className="w-full">
                Continue
              </Button>
            </>
          ) : (
            <>
              <div>
                <h1 className="text-2xl font-bold">Pick a nickname</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  This is what other readers will see on your replies -- not your Google name.
                </p>
              </div>
              <div className="grid gap-2 text-left">
                <Input
                  placeholder="Nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={30}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button onClick={submit} disabled={submitting || !nickname.trim()}>
                  {submitting ? "Registering..." : "Finish signing up"}
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupContent />
    </Suspense>
  );
}
