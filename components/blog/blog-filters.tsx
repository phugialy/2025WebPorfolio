"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Search, LayoutGrid, List, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { BlogPost } from "@/lib/convex-posts";
import { cn } from "@/lib/utils";

interface BlogFiltersProps {
  posts: BlogPost[];
  onFilterChange: (filteredPosts: BlogPost[]) => void;
  onSearch: (query: string) => void;
  onTagClick?: (tag: string) => void;
  onViewToggle?: (view: "grid" | "list") => void;
}

export function BlogFilters({
  posts,
  onFilterChange,
  onSearch,
  onTagClick,
  onViewToggle,
}: BlogFiltersProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [showSources, setShowSources] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);

  // Extract and clean source names (if they're URLs, extract domain)
  const extractSourceName = (source: string): string => {
    try {
      // If it looks like a URL, extract domain
      if (source.includes("http://") || source.includes("https://")) {
        const url = new URL(source);
        return url.hostname.replace("www.", "");
      }
      return source;
    } catch {
      return source;
    }
  };
  
  const allSources = Array.from(
    new Set(posts.map((post) => extractSourceName(post.source)))
  ).sort();
  
  // Create a mapping of clean source names to original sources for filtering
  const sourceMap = new Map<string, string>();
  posts.forEach((post) => {
    const cleanName = extractSourceName(post.source);
    if (!sourceMap.has(cleanName)) {
      sourceMap.set(cleanName, post.source);
    }
  });

  // Apply current search and source filters to get relevant posts for tag list
  const getFilteredPostsForTags = () => {
    let filtered = [...posts];

    // Search filter
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (post) =>
          post.title.toLowerCase().includes(lowerQuery) ||
          post.metadata?.aiSummary?.toLowerCase().includes(lowerQuery) ||
          (Array.isArray(post.tags) && post.tags.some((t) => t.toLowerCase().includes(lowerQuery)))
      );
    }

    // Source filter (but NOT tag filter - we need all tags from filtered posts)
    if (selectedSource) {
      const originalSource = sourceMap.get(selectedSource) || selectedSource;
      filtered = filtered.filter((post) => {
        const postCleanSource = extractSourceName(post.source);
        return postCleanSource.toLowerCase() === selectedSource.toLowerCase() || 
               post.source.toLowerCase() === originalSource.toLowerCase();
      });
    }
    
    // Tag filter - when a tag is selected, only show tags that exist in those filtered posts
    if (selectedTag) {
      filtered = filtered.filter((post) => {
        if (!Array.isArray(post.tags)) return false;
        return post.tags.some((postTag) => postTag.toLowerCase() === selectedTag.toLowerCase());
      });
    }

    return filtered;
  };

  // Extract unique tags and sources from filtered posts
  const allTags = Array.from(
    new Set(getFilteredPostsForTags().flatMap((post) => {
      // Ensure tags is an array
      if (!Array.isArray(post.tags)) return [];
      return post.tags;
    }))
  ).sort();

  // Apply filters
  const applyFilters = useCallback((
    query: string,
    tag: string | null,
    source: string | null
  ) => {
    let filtered = [...posts];

    // Search filter
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(
        (post) =>
          post.title.toLowerCase().includes(lowerQuery) ||
          post.metadata?.aiSummary?.toLowerCase().includes(lowerQuery) ||
          (Array.isArray(post.tags) && post.tags.some((t) => t.toLowerCase().includes(lowerQuery)))
      );
      onSearch(query);
    }

    // Tag filter
    if (tag) {
      filtered = filtered.filter((post) => {
        // Ensure tags is an array and do case-insensitive exact match
        if (!Array.isArray(post.tags)) return false;
        return post.tags.some((postTag) => postTag.toLowerCase() === tag.toLowerCase());
      });
    }

    // Source filter (match against clean source name, case-insensitive)
    if (source) {
      // Find original source from all posts
      const sourceMapping: { [key: string]: string } = {};
      posts.forEach((post) => {
        const cleanName = extractSourceName(post.source);
        if (!sourceMapping[cleanName]) {
          sourceMapping[cleanName] = post.source;
        }
      });
      const originalSource = sourceMapping[source] || source;
      filtered = filtered.filter((post) => {
        const postCleanSource = extractSourceName(post.source);
        return postCleanSource.toLowerCase() === source.toLowerCase() || 
               post.source.toLowerCase() === originalSource.toLowerCase();
      });
    }

    onFilterChange(filtered);
  }, [posts, onSearch, onFilterChange]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(query, selectedTag, selectedSource);
  };

  const handleTagClick = (tag: string) => {
    const newTag = selectedTag === tag ? null : tag;
    setSelectedTag(newTag);
    applyFilters(searchQuery, newTag, selectedSource);
    if (onTagClick) {
      onTagClick(tag);
    }
  };

  const handleSourceClick = (source: string) => {
    const newSource = selectedSource === source ? null : source;
    setSelectedSource(newSource);
    applyFilters(searchQuery, selectedTag, newSource);
  };

  const handleViewToggle = (mode: "grid" | "list") => {
    setViewMode(mode);
    if (onViewToggle) {
      onViewToggle(mode);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTag(null);
    setSelectedSource(null);
    applyFilters("", null, null);
  };

  // Apply initial filters when posts load
  useEffect(() => {
    if (posts.length > 0) {
      applyFilters(searchQuery, selectedTag, selectedSource);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts]); // Only when posts change - handlers already call applyFilters

  const hasActiveFilters = searchQuery || selectedTag || selectedSource;

  return (
    <div className="space-y-6 mb-8">
      {/* Search and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="search"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewToggle("list")}
              className={cn(
                "h-8 px-3",
                viewMode === "list" && "bg-background shadow-sm"
              )}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewToggle("grid")}
              className={cn(
                "h-8 px-3",
                viewMode === "grid" && "bg-background shadow-sm"
              )}
              aria-label="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <Filter className="w-4 h-4" />
            Filters:
          </span>
          {searchQuery && (
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full flex items-center gap-2">
              Search: &quot;{searchQuery}&quot;
              <button
                onClick={() => handleSearch("")}
                className="hover:bg-primary/20 rounded-full p-0.5"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedTag && (
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full flex items-center gap-2">
              Tag: {selectedTag}
              <button
                onClick={() => handleTagClick(selectedTag)}
                className="hover:bg-primary/20 rounded-full p-0.5"
                aria-label="Clear tag filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedSource && (
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full flex items-center gap-2">
              Source: {selectedSource}
              <button
                onClick={() => handleSourceClick(selectedSource)}
                className="hover:bg-primary/20 rounded-full p-0.5"
                aria-label="Clear source filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-7 text-xs"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Tags - Show top 10, expandable */}
      {allTags.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {(showAllTags ? allTags : allTags.slice(0, 10)).map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={cn(
                  "px-3 py-1 rounded-full text-sm transition-all duration-200",
                  selectedTag === tag
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                )}
              >
                {tag}
              </button>
            ))}
            {allTags.length > 10 && !showAllTags && (
              <button
                onClick={() => setShowAllTags(true)}
                className="px-3 py-1 rounded-full text-sm bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all duration-200 font-medium"
              >
                +{allTags.length - 10} more
              </button>
            )}
            {showAllTags && allTags.length > 10 && (
              <button
                onClick={() => setShowAllTags(false)}
                className="px-3 py-1 rounded-full text-sm bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all duration-200 font-medium"
              >
                Show less
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sources - Collapsible (if multiple) */}
      {allSources.length > 1 && (
        <div className="border-t pt-4">
          <button
            onClick={() => setShowSources(!showSources)}
            className="flex items-center justify-between w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter by Source ({allSources.length} {allSources.length === 1 ? "source" : "sources"})
              {selectedSource && (
                <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                  Active
                </span>
              )}
            </span>
            {showSources ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          
          {showSources && (
            <div className="mt-3 flex flex-wrap gap-2">
              {allSources.map((source) => (
                <button
                  key={source}
                  onClick={() => handleSourceClick(source)}
                  className={cn(
                    "px-3 py-1 rounded-full text-sm transition-all duration-200",
                    selectedSource === source
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  )}
                >
                  {source}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

