"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Editable brand-profile settings form. Field set and "just enough, no
// endless forms" minimalism modeled on the UX shape of
// RodGutierrezBasualto/social-studio-agent's src/routes/marca.tsx (read for
// its layout philosophy only -- different stack, Vite/TanStack, not
// portable as components; see this feature's build report for exactly what
// was and wasn't carried over). Component primitives (Card/Input/Label-as-
// <label>/Textarea/Button) are this repo's own components/ui/*, the same
// ones app/admin/social/queue/queue-board.tsx already uses.
//
// Deliberately does NOT expose guardrail numeric thresholds
// (MAX_REVISION_PASSES, DAILY_OPENROUTER_SPEND_CAP_USD,
// MIN_SIGNAL_SCORE_TO_DRAFT) -- see app/api/admin/social/settings/route.ts's
// header comment for the code-level reason this isn't just a UI omission.

type BrandProfileResponse = {
  found: boolean;
  account_id?: string;
  voice_description?: string;
  tone_guidelines?: string[];
  banned_topics?: string[];
  disclosure_template?: string;
  accountError?: string;
  migrationPending?: boolean;
  error?: string;
};

/** A simple repeatable list of short strings -- add via an input + button, remove via an inline "x". Deliberately not a rich/sortable array editor, per the task's explicit minimalism instruction. */
function StringListField({
  label,
  helperText,
  items,
  onChange,
}: {
  label: string;
  helperText?: string;
  items: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const value = draft.trim();
    if (!value) return;
    onChange([...items, value]);
    setDraft("");
  };

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium">{label}</p>
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <li
              key={`${item}-${i}`}
              className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
            >
              {item}
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove ${item}`}
                className="text-muted-foreground hover:text-destructive"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add an item and press Enter"
          className="max-w-sm"
        />
        <Button type="button" size="sm" variant="outline" onClick={add}>
          Add
        </Button>
      </div>
    </div>
  );
}

export function SettingsBoard() {
  const [voice, setVoice] = useState("");
  const [toneGuidelines, setToneGuidelines] = useState<string[]>([]);
  const [bannedTopics, setBannedTopics] = useState<string[]>([]);
  const [disclosureTemplate, setDisclosureTemplate] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [migrationPending, setMigrationPending] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/social/settings");
      const data: BrandProfileResponse = await res.json();
      if (!res.ok && data.error) {
        setLoadError(data.error);
      } else {
        setVoice(data.voice_description ?? "");
        setToneGuidelines(data.tone_guidelines ?? []);
        setBannedTopics(data.banned_topics ?? []);
        setDisclosureTemplate(data.disclosure_template ?? "");
        setAccountError(data.accountError ?? null);
        setMigrationPending(Boolean(data.migrationPending));
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load brand profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/social/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voice_description: voice,
          tone_guidelines: toneGuidelines,
          banned_topics: bannedTopics,
          disclosure_template: disclosureTemplate,
        }),
      });
      const data: BrandProfileResponse = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "Failed to save");
      } else {
        setSaved(true);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold uppercase text-primary">Admin Control Center</p>
        <h1 className="mt-2 font-display text-4xl font-bold">Social Brand Settings</h1>
        <p className="mt-3 text-muted-foreground">
          The brand voice and tone the pipeline&apos;s Writer and Guardrail steps draft against. Just
          enough to steer the agent -- not a full settings dump.
        </p>
        <p className="mt-2 text-sm">
          <Link href="/admin/social/dashboard" className="text-primary hover:underline">
            Dashboard
          </Link>{" "}
          ·{" "}
          <Link href="/admin/social/queue" className="text-primary hover:underline">
            Approval queue
          </Link>
        </p>

        {loading && <p className="mt-8 text-muted-foreground">Loading...</p>}

        {!loading && loadError && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Couldn&apos;t load the brand profile</CardTitle>
              <CardDescription>{loadError}</CardDescription>
            </CardHeader>
          </Card>
        )}

        {!loading && !loadError && migrationPending && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-base">Not set up yet</CardTitle>
              <CardDescription>
                The <code>social_accounts</code> / <code>social_brand_profile</code> tables haven&apos;t
                been created yet. Saving isn&apos;t possible until the Phase 0 migration is applied.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {!loading && !loadError && !migrationPending && accountError && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-base">No account resolved</CardTitle>
              <CardDescription>{accountError} Saving isn&apos;t possible until this resolves.</CardDescription>
            </CardHeader>
          </Card>
        )}

        {!loading && !loadError && !migrationPending && !accountError && (
          <Card className="mt-8">
            <CardHeader className="gap-5">
              <label className="grid gap-2 text-sm font-medium">
                Voice
                <span className="text-xs font-normal text-muted-foreground">
                  How the brand sounds -- a short description, not a style guide.
                </span>
                <Textarea
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  rows={3}
                  placeholder="Warm, direct, a little irreverent. No corporate hedge-speak."
                />
              </label>

              <StringListField
                label="Tone guidelines"
                helperText="Short rules the Writer/Guardrail steps check drafts against."
                items={toneGuidelines}
                onChange={setToneGuidelines}
              />

              <StringListField
                label="Banned topics"
                helperText="Topics the pipeline should never post about."
                items={bannedTopics}
                onChange={setBannedTopics}
              />

              <label className="grid gap-2 text-sm font-medium">
                Disclosure template
                <span className="text-xs font-normal text-muted-foreground">
                  Standing FTC disclosure text used when a post needs one.
                </span>
                <Input
                  value={disclosureTemplate}
                  onChange={(e) => setDisclosureTemplate(e.target.value)}
                  placeholder="#ad -- I may earn a commission from links in this post."
                />
              </label>

              <div className="flex items-center gap-3">
                <Button onClick={save} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
                {saved && <p className="text-sm text-muted-foreground">Saved.</p>}
                {saveError && <p className="text-sm text-destructive">{saveError}</p>}
              </div>
            </CardHeader>
          </Card>
        )}
      </div>
    </main>
  );
}
