"use client";

import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { User } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Profile = { display_name: string; email: string } | null;

export default function AccountPage() {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<Profile>(null);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        setProfile(data.profile);
        setNickname(data.profile?.display_name || "");
        setLoading(false);
      });
  }, [status]);

  const save = async () => {
    if (!nickname.trim()) return;
    setSubmitting(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: nickname }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update");
      }
      setProfile(data.profile);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-background px-4 py-16 text-foreground">
        <div className="mx-auto max-w-md">
          <div className="mb-8 flex items-center gap-3">
            <User className="h-8 w-8 text-primary" />
            <h1 className="font-display text-3xl font-bold">Your account</h1>
          </div>

          {loading || status === "loading" ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : status !== "authenticated" ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">Sign in to manage your account.</p>
              <Button onClick={() => signIn("google")}>Sign in with Google</Button>
            </div>
          ) : !profile ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Signed in as {session?.user?.email}, but you haven&apos;t registered a nickname
                yet.
              </p>
              <Link href="/signup">
                <Button>Finish signing up</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              <p className="text-sm text-muted-foreground">Signed in as {profile.email}</p>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Nickname</label>
                <Input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={30} />
                <p className="text-xs text-muted-foreground">
                  Shown on your Field Notes replies instead of your Google name.
                </p>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {saved && <p className="text-sm text-emerald-500">Saved.</p>}
              <Button onClick={save} disabled={submitting || !nickname.trim()} className="w-fit">
                {submitting ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" onClick={() => signOut({ callbackUrl: "/" })} className="w-fit">
                Sign out
              </Button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
