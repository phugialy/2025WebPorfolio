"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RefreshCw, Github, CheckCircle2, AlertCircle } from "lucide-react";

interface SyncResult {
  success: boolean;
  total: number;
  results: Array<{
    id: string;
    action: "created" | "updated" | "error";
    title?: string;
    error?: string;
  }>;
}

export function GitHubSync() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");

  const bulkSync = useMutation(api.projects.bulkSyncGitHubRepos);

  const handleSync = async () => {
    if (!username.trim()) {
      setError("Please enter your GitHub username");
      return;
    }

    setSyncing(true);
    setError(null);
    setResult(null);

    try {
      // Fetch repos from GitHub API
      const response = await fetch(`/api/github/repos?username=${encodeURIComponent(username)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch repositories");
      }

      const data = await response.json();
      const { repos, username: fetchedUsername } = data;

      if (!repos || repos.length === 0) {
        setError("No public repositories found. Make sure you have public repos and the username is correct.");
        setSyncing(false);
        return;
      }

      // Sync to Convex
      const syncResult = await bulkSync({
        repos: repos.map((repo: any) => ({
          id: repo.id,
          name: repo.name,
          fullName: repo.fullName,
          description: repo.description,
          url: repo.url,
          stars: repo.stars,
          language: repo.language,
          topics: repo.topics,
          homepage: repo.homepage,
        })),
        username: fetchedUsername,
      });

      setResult(syncResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync repositories");
    } finally {
      setSyncing(false);
    }
  };

  const createdCount = result?.results.filter((r) => r.action === "created").length || 0;
  const updatedCount = result?.results.filter((r) => r.action === "updated").length || 0;
  const errorCount = result?.results.filter((r) => r.action === "error").length || 0;

  return (
    <div className="border rounded-lg p-6 space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Github className="w-6 h-6 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">Sync from GitHub</h3>
          <p className="text-sm text-muted-foreground">
            Fetch your public repositories and sync them to projects
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium mb-2 block">
            GitHub Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="phugialy"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            disabled={syncing}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Or set GITHUB_USERNAME in .env.local to use default
          </p>
        </div>

        <Button
          onClick={handleSync}
          disabled={syncing || !username.trim()}
          className="w-full"
        >
          {syncing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <Github className="w-4 h-4 mr-2" />
              Sync from GitHub
            </>
          )}
        </Button>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Error</p>
              <p className="text-sm text-destructive/80">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <p className="font-semibold">Sync Complete!</p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total</p>
                <p className="text-lg font-semibold">{result.total}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="text-lg font-semibold text-green-600">{createdCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Updated</p>
                <p className="text-lg font-semibold text-blue-600">{updatedCount}</p>
              </div>
            </div>
            {errorCount > 0 && (
              <div className="mt-2">
                <p className="text-sm text-destructive">
                  {errorCount} error(s) occurred
                </p>
              </div>
            )}
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground">
                💡 Tip: Use the visibility toggle to show/hide synced repos
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

