"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { useState, useMemo, useEffect } from "react";
import { Eye, EyeOff, Edit, Trash2, Save, X, ChevronUp, ChevronDown, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GitHubSync } from "./github-sync";

const ITEMS_PER_PAGE = 10;

export function AdminProjectsContent() {
  const projects = useQuery(api.projects.listAll) || [];
  const updateVisibility = useMutation(api.projects.updateVisibility);
  const updateProject = useMutation(api.projects.update);
  const updateOrder = useMutation(api.projects.updateOrder);
  const deleteProject = useMutation(api.projects.remove);
  const createProject = useMutation(api.projects.create);

  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<any>({
    title: "",
    description: "",
    tags: [],
    year: new Date().getFullYear().toString(),
    type: "repository",
    status: "active",
    visible: true,
    featured: false,
    repoAccess: "public",
    hideRepoButton: false,
    order: 9999,
  });
  const [filter, setFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (filter === "visible") return p.visible;
      if (filter === "hidden") return !p.visible;
      return true;
    });
  }, [projects, filter]);

  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE);
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredProjects.slice(start, end);
  }, [filteredProjects, currentPage]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const handleMoveUp = async (projectId: string, currentOrder: number) => {
    // Find the project with the next lower order
    const sortedProjects = [...projects].sort((a, b) => (a.order || 9999) - (b.order || 9999));
    const currentIndex = sortedProjects.findIndex((p) => p.id === projectId);
    
    if (currentIndex > 0) {
      const previousProject = sortedProjects[currentIndex - 1];
      const previousOrder = previousProject.order || 9999;
      
      // Swap orders
      await updateOrder({ id: projectId, order: previousOrder });
      await updateOrder({ id: previousProject.id, order: currentOrder });
    }
  };

  const handleMoveDown = async (projectId: string, currentOrder: number) => {
    // Find the project with the next higher order
    const sortedProjects = [...projects].sort((a, b) => (a.order || 9999) - (b.order || 9999));
    const currentIndex = sortedProjects.findIndex((p) => p.id === projectId);
    
    if (currentIndex < sortedProjects.length - 1) {
      const nextProject = sortedProjects[currentIndex + 1];
      const nextOrder = nextProject.order || 9999;
      
      // Swap orders
      await updateOrder({ id: projectId, order: nextOrder });
      await updateOrder({ id: nextProject.id, order: currentOrder });
    }
  };

  const handleToggleVisibility = async (projectId: string, currentVisible: boolean) => {
    try {
      await updateVisibility({
        id: projectId,
        visible: !currentVisible,
      });
    } catch (error) {
      console.error("Error updating visibility:", error);
      alert("Failed to update visibility");
    }
  };

  const handleStartEdit = (project: any) => {
    setEditingProject(project.id);
    setError(null);
    setEditForm({
      title: project.title,
      description: project.description,
      visible: project.visible,
      featured: project.featured,
      order: project.order ?? 9999,
      githubUrl: project.githubUrl || "",
      repoAccess: project.repoAccess || "public",
      hideRepoButton: project.hideRepoButton || false,
      demoUrl: project.demoUrl || "",
      appUrl: project.appUrl || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingProject || saving) return;

    setSaving(true);
    setError(null);

    try {
      // Validate required fields
      if (!editForm.title || editForm.title.trim() === "") {
        setError("Title is required");
        setSaving(false);
        return;
      }

      // Validate and sanitize form data
      const updates: any = {
        id: editingProject,
      };

      // Only include defined, non-empty values
      updates.title = editForm.title.trim();
      updates.description = editForm.description?.trim() || "";
      updates.visible = Boolean(editForm.visible);
      updates.featured = Boolean(editForm.featured);
      
      if (editForm.order !== undefined && editForm.order !== null) {
        const orderNum = typeof editForm.order === 'string' 
          ? parseInt(editForm.order, 10) 
          : Number(editForm.order);
        if (!isNaN(orderNum)) {
          updates.order = orderNum;
        }
      }
      
      if (editForm.githubUrl !== undefined) {
        updates.githubUrl = editForm.githubUrl.trim() || undefined;
      }
      if (editForm.demoUrl !== undefined) {
        updates.demoUrl = editForm.demoUrl.trim() || undefined;
      }
      if (editForm.repoAccess !== undefined) {
        updates.repoAccess = editForm.repoAccess;
      }
      if (editForm.hideRepoButton !== undefined) {
        updates.hideRepoButton = Boolean(editForm.hideRepoButton);
      }
      if (editForm.appUrl !== undefined) {
        updates.appUrl = editForm.appUrl.trim() || undefined;
      }

      await updateProject(updates);
      setEditingProject(null);
      setEditForm({});
      setError(null);
    } catch (error) {
      console.error("Error updating project:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update project";
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingProject(null);
    setEditForm({});
    setError(null);
  };

  const handleCreateProject = async () => {
    if (saving) return;

    setSaving(true);
    setError(null);

    try {
      // Validate required fields
      if (!createForm.title || createForm.title.trim() === "") {
        setError("Title is required");
        setSaving(false);
        return;
      }

      // Generate unique ID
      const projectId = `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Prepare project data
      const projectData: any = {
        id: projectId,
        title: createForm.title.trim(),
        description: createForm.description?.trim() || "",
        tags: Array.isArray(createForm.tags) ? createForm.tags : (createForm.tags ? createForm.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : []),
        year: createForm.year || new Date().getFullYear().toString(),
        type: createForm.type || "repository",
        status: createForm.status || "active",
        visible: Boolean(createForm.visible),
        featured: Boolean(createForm.featured),
        order: createForm.order ?? 9999,
        repoAccess: createForm.repoAccess || "public",
        hideRepoButton: Boolean(createForm.hideRepoButton),
      };

      // Add optional fields if provided
      if (createForm.githubUrl?.trim()) {
        projectData.githubUrl = createForm.githubUrl.trim();
      }
      if (createForm.demoUrl?.trim()) {
        projectData.demoUrl = createForm.demoUrl.trim();
      }
      if (createForm.appUrl?.trim()) {
        projectData.appUrl = createForm.appUrl.trim();
      }
      if (createForm.slug?.trim()) {
        projectData.slug = createForm.slug.trim();
      }
      if (createForm.language?.trim()) {
        projectData.language = createForm.language.trim();
      }
      if (createForm.stars !== undefined && createForm.stars !== null && createForm.stars !== "") {
        const starsNum = Number(createForm.stars);
        if (!isNaN(starsNum)) {
          projectData.stars = starsNum;
        }
      }

      await createProject(projectData);
      
      // Reset form
      setCreateForm({
        title: "",
        description: "",
        tags: [],
        year: new Date().getFullYear().toString(),
        type: "repository",
        status: "active",
        visible: true,
        featured: false,
        repoAccess: "public",
        hideRepoButton: false,
        order: 9999,
      });
      setShowCreateForm(false);
      setError(null);
    } catch (error) {
      console.error("Error creating project:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create project";
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (projectId: string) => {
    try {
      await deleteProject({ id: projectId });
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Failed to delete project");
    }
  };

  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Project Administration</h1>
            <p className="text-muted-foreground">
              Manage project visibility and settings
            </p>
          </div>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create New Project
          </Button>
        </header>

        {/* GitHub Sync */}
        <div className="mb-8">
          <GitHubSync />
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => {
              setFilter("all");
              setCurrentPage(1);
            }}
            size="sm"
          >
            All ({projects.length})
          </Button>
          <Button
            variant={filter === "visible" ? "default" : "outline"}
            onClick={() => {
              setFilter("visible");
              setCurrentPage(1);
            }}
            size="sm"
          >
            Visible ({projects.filter((p) => p.visible).length})
          </Button>
          <Button
            variant={filter === "hidden" ? "default" : "outline"}
            onClick={() => {
              setFilter("hidden");
              setCurrentPage(1);
            }}
            size="sm"
          >
            Hidden ({projects.filter((p) => !p.visible).length})
          </Button>
        </div>

        {/* Projects List */}
        <div className="grid gap-4">
          {paginatedProjects.map((project) => {
            const sortedProjects = [...projects].sort((a, b) => (a.order || 9999) - (b.order || 9999));
            const currentIndex = sortedProjects.findIndex((p) => p.id === project.id);
            const canMoveUp = currentIndex > 0;
            const canMoveDown = currentIndex < sortedProjects.length - 1;
            
            return (
            <Card key={project._id} className={!project.visible ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">{project.title}</CardTitle>
                      {project.featured && (
                        <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                          Featured
                        </span>
                      )}
                      <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
                        {project.type}
                      </span>
                    </div>
                    <CardDescription>{project.description}</CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Order Controls */}
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMoveUp(project.id, project.order || 9999)}
                        disabled={!canMoveUp}
                        title="Move up (higher priority)"
                        className="h-6 w-6"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMoveDown(project.id, project.order || 9999)}
                        disabled={!canMoveDown}
                        title="Move down (lower priority)"
                        className="h-6 w-6"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleVisibility(project.id, project.visible)}
                      title={project.visible ? "Hide project" : "Show project"}
                    >
                      {project.visible ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleStartEdit(project)}
                      title="Edit project"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowDeleteConfirm(project.id)}
                      title="Delete project"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {editingProject === project.id && (
                <CardContent className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Title</label>
                      <Input
                        value={editForm.title}
                        onChange={(e) =>
                          setEditForm({ ...editForm, title: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">GitHub URL</label>
                      <Input
                        value={editForm.githubUrl}
                        onChange={(e) =>
                          setEditForm({ ...editForm, githubUrl: e.target.value })
                        }
                        placeholder="https://github.com/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Demo URL</label>
                      <Input
                        value={editForm.demoUrl}
                        onChange={(e) =>
                          setEditForm({ ...editForm, demoUrl: e.target.value })
                        }
                        placeholder="https://demo.example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Repo Access</label>
                      <select
                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        value={editForm.repoAccess}
                        onChange={(e) =>
                          setEditForm({ ...editForm, repoAccess: e.target.value })
                        }
                      >
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                        <option value="request-access">Request Access</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">App URL</label>
                      <Input
                        value={editForm.appUrl || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, appUrl: e.target.value })
                        }
                        placeholder="https://app.example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Display Order</label>
                      <Input
                        type="number"
                        value={editForm.order ?? 9999}
                        onChange={(e) => {
                          const value = e.target.value;
                          const numValue = value === "" ? 9999 : parseInt(value, 10);
                          setEditForm({ ...editForm, order: isNaN(numValue) ? 9999 : numValue });
                        }}
                        placeholder="9999"
                      />
                      <p className="text-xs text-muted-foreground">
                        Lower number = higher priority (shown first)
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm({ ...editForm, description: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editForm.visible}
                        onChange={(e) =>
                          setEditForm({ ...editForm, visible: e.target.checked })
                        }
                      />
                      <span className="text-sm">Visible</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editForm.featured}
                        onChange={(e) =>
                          setEditForm({ ...editForm, featured: e.target.checked })
                        }
                      />
                      <span className="text-sm">Featured</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editForm.hideRepoButton}
                        onChange={(e) =>
                          setEditForm({ ...editForm, hideRepoButton: e.target.checked })
                        }
                      />
                      <span className="text-sm">Hide Repo Button</span>
                    </label>
                    <p className="text-xs text-muted-foreground w-full">
                      Hide repo button for private repos with live sites (only show demo/live site buttons)
                    </p>
                  </div>
                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                      {error}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSaveEdit} 
                      size="sm"
                      disabled={saving}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      onClick={handleCancelEdit}
                      variant="outline"
                      size="sm"
                      disabled={saving}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              )}

              <CardContent className="pt-4 border-t">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Order:</span>
                    <span className="ml-2 font-medium">{project.order ?? 9999}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <span className="ml-2">{project.status}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Visibility:</span>
                    <span className={`ml-2 ${project.visible ? "text-green-600" : "text-red-600"}`}>
                      {project.visible ? "Visible" : "Hidden"}
                    </span>
                  </div>
                  {project.githubUrl && (
                    <div>
                      <span className="text-muted-foreground">Repo:</span>
                      <span className="ml-2">{project.repoAccess || "public"}</span>
                    </div>
                  )}
                  {project.demoUrl && (
                    <div>
                      <span className="text-muted-foreground">Demo:</span>
                      <a
                        href={project.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-primary hover:underline"
                      >
                        View
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={ITEMS_PER_PAGE}
            totalItems={filteredProjects.length}
          />
        )}

        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No projects found.</p>
          </div>
        )}
      </div>

      {/* Create Project Dialog */}
      {showCreateForm && (
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Add a new project to your portfolio
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title *</label>
                  <Input
                    value={createForm.title}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, title: e.target.value })
                    }
                    placeholder="Project Title"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Year</label>
                  <Input
                    value={createForm.year}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, year: e.target.value })
                    }
                    placeholder="2024"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    value={createForm.type}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, type: e.target.value })
                    }
                  >
                    <option value="repository">Repository</option>
                    <option value="case-study">Case Study</option>
                    <option value="live-app">Live App</option>
                    <option value="side-project">Side Project</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    value={createForm.status}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, status: e.target.value })
                    }
                  >
                    <option value="active">Active</option>
                    <option value="featured">Featured</option>
                    <option value="in-progress">In Progress</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">GitHub URL</label>
                  <Input
                    value={createForm.githubUrl || ""}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, githubUrl: e.target.value })
                    }
                    placeholder="https://github.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Repo Access</label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    value={createForm.repoAccess}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, repoAccess: e.target.value })
                    }
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                    <option value="request-access">Request Access</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Demo URL</label>
                  <Input
                    value={createForm.demoUrl || ""}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, demoUrl: e.target.value })
                    }
                    placeholder="https://demo.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">App URL</label>
                  <Input
                    value={createForm.appUrl || ""}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, appUrl: e.target.value })
                    }
                    placeholder="https://app.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tags (comma-separated)</label>
                  <Input
                    value={Array.isArray(createForm.tags) ? createForm.tags.join(", ") : createForm.tags || ""}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, tags: e.target.value })
                    }
                    placeholder="React, TypeScript, Next.js"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Language</label>
                  <Input
                    value={createForm.language || ""}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, language: e.target.value })
                    }
                    placeholder="TypeScript"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="flex min-h-[100px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, description: e.target.value })
                  }
                  placeholder="Project description..."
                />
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={createForm.visible}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, visible: e.target.checked })
                    }
                  />
                  <span className="text-sm">Visible</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={createForm.featured}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, featured: e.target.checked })
                    }
                  />
                  <span className="text-sm">Featured</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={createForm.hideRepoButton}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, hideRepoButton: e.target.checked })
                    }
                  />
                  <span className="text-sm">Hide Repo Button</span>
                </label>
              </div>
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  {error}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  setError(null);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateProject}
                disabled={saving}
              >
                {saving ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Project</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this project? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(showDeleteConfirm)}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}

