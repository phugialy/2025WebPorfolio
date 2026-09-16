import { createSupabaseAdminClient, createSupabaseReadClient } from "@/lib/supabase/server";

export type ProjectType = "case-study" | "repository" | "live-app" | "side-project";
export type ProjectStatus = "featured" | "active" | "archived" | "in-progress";
export type RepoAccess = "public" | "private" | "request-access";

export type Project = {
  id: string;
  slug: string;
  title: string;
  description: string;
  tags: string[];
  year: string;
  type: ProjectType;
  status: ProjectStatus;
  visible: boolean;
  featured: boolean;
  sort_order: number;
  image_url: string | null;
  role: string | null;
  duration: string | null;
  metrics: string[] | null;
  github_url: string | null;
  repo_access: RepoAccess;
  hide_repo_button: boolean;
  stars: number | null;
  language: string | null;
  demo_url: string | null;
  app_url: string | null;
  external_link: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectInput = {
  slug: string;
  title: string;
  description?: string;
  tags?: string[];
  year?: string;
  type?: ProjectType;
  status?: ProjectStatus;
  visible?: boolean;
  featured?: boolean;
  sortOrder?: number;
  githubUrl?: string;
  repoAccess?: RepoAccess;
  hideRepoButton?: boolean;
  demoUrl?: string;
  appUrl?: string;
  language?: string;
  stars?: number;
};

export type ProjectUpdate = Partial<{
  title: string;
  description: string;
  tags: string[];
  status: ProjectStatus;
  visible: boolean;
  featured: boolean;
  sortOrder: number;
  githubUrl: string | null;
  repoAccess: RepoAccess;
  hideRepoButton: boolean;
  demoUrl: string | null;
  appUrl: string | null;
  stars: number;
  language: string;
}>;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// --- Public reads (/work) ---

export async function listVisibleProjects(): Promise<Project[]> {
  const supabase = createSupabaseReadClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("visible", true)
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error listing visible projects:", error);
    return [];
  }
  return (data || []) as Project[];
}

export async function getFeaturedProjects(): Promise<Project[]> {
  const supabase = createSupabaseReadClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("visible", true)
    .eq("featured", true)
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error listing featured projects:", error);
    return [];
  }
  return (data || []) as Project[];
}

// --- Admin ---

export async function listAllProjects(): Promise<Project[]> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Supabase write config is missing");

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data || []) as Project[];
}

export async function createProject(input: ProjectInput): Promise<Project> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Supabase write config is missing");

  const { data, error } = await supabase
    .from("projects")
    .insert({
      slug: input.slug,
      title: input.title,
      description: input.description || "",
      tags: input.tags || [],
      year: input.year || new Date().getFullYear().toString(),
      type: input.type || "repository",
      status: input.status || "active",
      visible: input.visible ?? true,
      featured: input.featured ?? false,
      sort_order: input.sortOrder ?? 9999,
      github_url: input.githubUrl || null,
      repo_access: input.repoAccess || "public",
      hide_repo_button: input.hideRepoButton ?? false,
      demo_url: input.demoUrl || null,
      app_url: input.appUrl || null,
      language: input.language || null,
      stars: input.stars ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Project;
}

export async function updateProject(id: string, fields: ProjectUpdate): Promise<Project> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Supabase write config is missing");

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (fields.title !== undefined) update.title = fields.title;
  if (fields.description !== undefined) update.description = fields.description;
  if (fields.tags !== undefined) update.tags = fields.tags;
  if (fields.status !== undefined) update.status = fields.status;
  if (fields.visible !== undefined) update.visible = fields.visible;
  if (fields.featured !== undefined) update.featured = fields.featured;
  if (fields.sortOrder !== undefined) update.sort_order = fields.sortOrder;
  if (fields.githubUrl !== undefined) update.github_url = fields.githubUrl;
  if (fields.repoAccess !== undefined) update.repo_access = fields.repoAccess;
  if (fields.hideRepoButton !== undefined) update.hide_repo_button = fields.hideRepoButton;
  if (fields.demoUrl !== undefined) update.demo_url = fields.demoUrl;
  if (fields.appUrl !== undefined) update.app_url = fields.appUrl;
  if (fields.stars !== undefined) update.stars = fields.stars;
  if (fields.language !== undefined) update.language = fields.language;

  const { data, error } = await supabase
    .from("projects")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Project;
}

export async function deleteProject(id: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Supabase write config is missing");

  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

// --- GitHub sync ---

export type GitHubRepoInput = {
  name: string;
  fullName: string;
  description: string;
  url: string;
  stars?: number;
  language?: string;
  topics?: string[];
  homepage?: string;
};

export type SyncResult = {
  slug: string;
  action: "created" | "updated" | "error";
  title?: string;
  error?: string;
};

/**
 * Upsert a batch of GitHub repos as projects, keyed by a deterministic slug
 * (username-reponame) so re-running a sync updates rather than duplicates.
 * Mirrors the old Convex bulkSyncGitHubRepos mutation's behavior.
 */
export async function bulkSyncGitHubRepos(
  repos: GitHubRepoInput[],
  username: string
): Promise<{ success: true; total: number; results: SyncResult[] }> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Supabase write config is missing");

  const currentYear = new Date().getFullYear().toString();
  const results: SyncResult[] = [];

  for (const repo of repos) {
    const slug = `${username}-${slugify(repo.name)}`;
    try {
      const { data: existing } = await supabase
        .from("projects")
        .select("id, sort_order, created_at")
        .eq("slug", slug)
        .maybeSingle();

      const shared = {
        title: repo.name,
        description: repo.description || `Repository: ${repo.fullName}`,
        tags: repo.topics || [],
        github_url: repo.url,
        stars: repo.stars ?? 0,
        language: repo.language || null,
        demo_url: repo.homepage || null,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        const { error } = await supabase.from("projects").update(shared).eq("id", existing.id);
        if (error) throw error;
        results.push({ slug, action: "updated", title: repo.name });
      } else {
        const { error } = await supabase.from("projects").insert({
          slug,
          ...shared,
          year: currentYear,
          type: "repository",
          status: "active",
          visible: true,
          featured: false,
          sort_order: 9999,
          repo_access: "public",
        });
        if (error) throw error;
        results.push({ slug, action: "created", title: repo.name });
      }
    } catch (error) {
      results.push({ slug, action: "error", error: error instanceof Error ? error.message : String(error) });
    }
  }

  return { success: true, total: repos.length, results };
}

// --- Repo access requests ---

export async function requestRepoAccess(params: {
  projectId: string;
  email: string;
  name: string;
  company?: string;
}): Promise<void> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Supabase write config is missing");

  const { error } = await supabase.from("project_access_requests").insert({
    project_id: params.projectId,
    email: params.email,
    name: params.name,
    company: params.company || null,
  });

  if (error) throw error;
}
