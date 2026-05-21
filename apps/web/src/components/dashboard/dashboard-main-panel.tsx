"use client";

import { api } from "@amiro/backend/convex/_generated/api";
import type { Id } from "@amiro/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import {
  ArrowUpDown,
  ChevronDown,
  ExternalLink,
  Eye,
  Globe2,
  Hash,
  Lock,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { toast } from "sonner";

import { NewBookmarkDialog } from "@/components/dashboard/new-bookmark-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { formatRelativeTime } from "./time";
import type { DashboardBookmark, DashboardFolder } from "./types";

/* ─── Helpers ─────────────────────────────────────────────── */

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getLetterAvatar(url: string): string {
  const domain = getDomain(url);
  return domain.charAt(0).toUpperCase();
}

/** Hard-coded views & stars seeded from the bookmark id for now */
function getFakeStats(id: string): { views: number; stars: number } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const views = Math.abs(hash % 450) + 5;
  const stars = Math.abs((hash >> 8) % 80);
  return { views, stars };
}

const SORT_OPTIONS = ["Recent", "Most viewed", "Most saved"] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

/* ─── Skeletons ───────────────────────────────────────────── */

const BOOKMARK_SKELETONS = [
  "bookmark-skeleton-1",
  "bookmark-skeleton-2",
  "bookmark-skeleton-3",
];

function BookmarkSkeletonList() {
  return (
    <div className="divide-y divide-border/60">
      {BOOKMARK_SKELETONS.map((skeletonId) => (
        <div key={skeletonId} className="flex items-start gap-4 px-5 py-5">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-4/5" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-10" />
          </div>
        </div>
      ))}
    </div>
  );
}

function VisibilityToggle({
  active,
  icon: Icon,
  label,
  compact = false,
  disabled = false,
  onClick,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  compact?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors",
        compact && "px-2",
        active
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:text-foreground",
        disabled && "cursor-not-allowed opacity-45 hover:text-muted-foreground",
      )}
      aria-pressed={active}
      aria-label={label}
      title={label}
    >
      <Icon className="h-3 w-3" />
      {compact ? null : label}
    </button>
  );
}

/* ─── Main component ──────────────────────────────────────── */

export function DashboardMainPanel({
  selectedFolder,
  bookmarks,
  bookmarksLoading = false,
  bookmarksLoadingFallback,
  onDeleteBookmark,
}: {
  selectedFolder: DashboardFolder;
  breadcrumbs: DashboardFolder[];
  bookmarks: DashboardBookmark[];
  bookmarksLoading?: boolean;
  bookmarksLoadingFallback?: ReactNode;
  onDeleteBookmark: (bookmarkId: string) => Promise<void>;
}) {
  const [deletingBookmarkId, setDeletingBookmarkId] = useState<string | null>(
    null,
  );
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("Recent");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  const createBookmark = useMutation(api.sync.createBookmark);
  const updateFolderVisibility = useMutation(
    api.dashboard.updateFolderVisibility,
  );
  const updateBookmarkVisibility = useMutation(
    api.dashboard.updateBookmarkVisibility,
  );

  const [creatingBookmark, setCreatingBookmark] = useState(false);

  /* Collect unique tags from bookmarks for the filter bar */
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const bookmark of bookmarks) {
      for (const tag of bookmark.tags) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet);
  }, [bookmarks]);

  /* Filter bookmarks by active tag */
  const filteredBookmarks = useMemo(() => {
    if (!activeTag) return bookmarks;
    return bookmarks.filter((b) => b.tags.includes(activeTag));
  }, [bookmarks, activeTag]);

  const folderIsPublic = selectedFolder.visibility === "public";
  const folderVisibilityLocked = selectedFolder.id === "unfiled";

  return (
    <div>
      {/* Header section */}
      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="mb-4 font-serif text-5xl tracking-tight">
              <span className="mr-3 align-middle text-4xl">
                {selectedFolder.icon ?? "📁"}
              </span>
              {selectedFolder.name}
            </h1>

            <p className="mt-1 text-muted-foreground text-sm">
              {selectedFolder.itemCount} saved items · updated{" "}
              {formatRelativeTime(selectedFolder.updatedAtMs)} ·{" "}
              {folderIsPublic ? "🌐 Public" : "🔒 Private"}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {selectedFolder.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-muted px-2.5 py-1 font-medium text-[11px] text-muted-foreground"
                >
                  <Hash className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center rounded-md border border-border bg-surface p-0.5">
              <VisibilityToggle
                active={!folderIsPublic}
                icon={Lock}
                label="Private"
                disabled={folderVisibilityLocked}
                onClick={async () => {
                  if (folderVisibilityLocked || !folderIsPublic) {
                    return;
                  }
                  try {
                    await updateFolderVisibility({
                      folderId: selectedFolder.id as Id<"folders">,
                      visibility: "private",
                    });
                    toast.success("Folder is now private.");
                  } catch (error) {
                    const message =
                      error instanceof Error
                        ? error.message
                        : "Failed to update folder visibility.";
                    toast.error(message);
                  }
                }}
              />
              <VisibilityToggle
                active={folderIsPublic}
                icon={Globe2}
                label="Public"
                disabled={folderVisibilityLocked}
                onClick={async () => {
                  if (folderVisibilityLocked || folderIsPublic) {
                    return;
                  }
                  try {
                    await updateFolderVisibility({
                      folderId: selectedFolder.id as Id<"folders">,
                      visibility: "public",
                    });
                    toast.success("Folder is now public.");
                  } catch (error) {
                    const message =
                      error instanceof Error
                        ? error.message
                        : "Failed to update folder visibility.";
                    toast.error(message);
                  }
                }}
              />
            </div>
            <NewBookmarkDialog
              creating={creatingBookmark}
              onCreateBookmark={async (input) => {
                setCreatingBookmark(true);
                try {
                  await createBookmark({
                    url: input.url,
                    folderId:
                      selectedFolder.id === "unfiled"
                        ? undefined
                        : (selectedFolder.id as Id<"folders">),
                    visibility: input.visibility,
                  });
                  toast.success("Bookmark saved");
                } catch (error) {
                  const message =
                    error instanceof Error
                      ? error.message
                      : "Failed to save bookmark.";
                  toast.error(message);
                  throw error;
                } finally {
                  setCreatingBookmark(false);
                }
              }}
              trigger={
                <Button type="button" className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  New bookmark
                </Button>
              }
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!folderIsPublic}
            >
              Share
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Bookmarks section ─────────────────────────────── */}
      <div className="mt-8">
        <p className="mb-4 font-medium text-muted-foreground text-sm">
          Bookmarks in {selectedFolder.name}
        </p>

        {bookmarksLoading ? (
          (bookmarksLoadingFallback ?? (
            <div className="rounded-xl border border-border/60 bg-card/50">
              <BookmarkSkeletonList />
            </div>
          ))
        ) : bookmarks.length === 0 ? (
          <div className="rounded-xl border border-border border-dashed p-6 text-center text-muted-foreground text-sm">
            No bookmarks in this folder yet.
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 bg-card/50">
            {/* ─── Filter bar + sort ───────────────────── */}
            <div className="flex items-center justify-between gap-3 border-border/60 border-b px-5 py-3">
              {/* Tag filters */}
              <div className="flex flex-wrap items-center gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTag(null)}
                  className={`rounded-full px-3 py-1 font-medium text-xs transition-colors ${
                    activeTag === null
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  All
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                    className={`rounded-full px-3 py-1 font-medium text-xs transition-colors ${
                      activeTag === tag
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>

              {/* Sort dropdown */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setSortDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-muted-foreground text-xs transition-colors hover:bg-muted"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  {sortBy}
                  <ChevronDown className="h-3 w-3" />
                </button>

                {sortDropdownOpen ? (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-40"
                      aria-label="Close"
                      onClick={() => setSortDropdownOpen(false)}
                    />
                    <div className="absolute right-0 z-50 mt-1 w-40 rounded-lg border border-border bg-background py-1 shadow-lg">
                      {SORT_OPTIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setSortBy(option);
                            setSortDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted ${
                            sortBy === option
                              ? "font-medium text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            {/* ─── Bookmark list ───────────────────────── */}
            <div className="divide-y divide-border/40">
              {filteredBookmarks.map((bookmark) => {
                const domain = getDomain(bookmark.url);
                const letter = getLetterAvatar(bookmark.url);
                const { views, stars } = getFakeStats(bookmark.id);
                const bookmarkIsPublic = bookmark.visibility === "public";
                const bookmarkToggleDisabled = !folderIsPublic;

                return (
                  <div
                    key={bookmark.id}
                    className="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/50"
                  >
                    {/* Letter avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground text-sm">
                      {letter}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      {/* Title row */}
                      <div className="flex items-center gap-2">
                        <a
                          href={bookmark.url}
                          target="_blank"
                          rel="noreferrer"
                          className="line-clamp-1 font-semibold text-foreground text-sm transition-colors hover:text-primary"
                        >
                          {bookmark.title}
                        </a>
                        {bookmarkIsPublic ? (
                          <Globe2 className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                        ) : (
                          <Lock className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                        )}

                        {/* Hover-reveal action icons */}
                        <div className="ml-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <div className="flex items-center rounded-md border border-border bg-background/80 p-0.5">
                            <VisibilityToggle
                              active={!bookmarkIsPublic}
                              icon={Lock}
                              label="Private bookmark"
                              compact
                              disabled={bookmarkToggleDisabled}
                              onClick={async () => {
                                if (
                                  bookmarkToggleDisabled ||
                                  !bookmarkIsPublic
                                ) {
                                  return;
                                }
                                try {
                                  await updateBookmarkVisibility({
                                    bookmarkId:
                                      bookmark.id as Id<"syncedBookmarks">,
                                    visibility: "private",
                                  });
                                  toast.success("Bookmark is now private.");
                                } catch (error) {
                                  const message =
                                    error instanceof Error
                                      ? error.message
                                      : "Failed to update bookmark visibility.";
                                  toast.error(message);
                                }
                              }}
                            />
                            <VisibilityToggle
                              active={bookmarkIsPublic}
                              icon={Globe2}
                              label="Public bookmark"
                              compact
                              disabled={bookmarkToggleDisabled}
                              onClick={async () => {
                                if (
                                  bookmarkToggleDisabled ||
                                  bookmarkIsPublic
                                ) {
                                  return;
                                }
                                try {
                                  await updateBookmarkVisibility({
                                    bookmarkId:
                                      bookmark.id as Id<"syncedBookmarks">,
                                    visibility: "public",
                                  });
                                  toast.success("Bookmark is now public.");
                                } catch (error) {
                                  const message =
                                    error instanceof Error
                                      ? error.message
                                      : "Failed to update bookmark visibility.";
                                  toast.error(message);
                                }
                              }}
                            />
                          </div>
                          <a
                            href={bookmark.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label="Open link"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          <button
                            type="button"
                            disabled={deletingBookmarkId === bookmark.id}
                            onClick={async () => {
                              setDeletingBookmarkId(bookmark.id);
                              try {
                                await onDeleteBookmark(bookmark.id);
                              } finally {
                                setDeletingBookmarkId((current) =>
                                  current === bookmark.id ? null : current,
                                );
                              }
                            }}
                            className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Delete bookmark"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Domain */}
                      <p className="mt-0.5 font-mono text-muted-foreground text-xs">
                        {domain}
                      </p>

                      {/* Description */}
                      {bookmark.text ? (
                        <p className="mt-1.5 line-clamp-1 text-muted-foreground/80 text-sm">
                          {bookmark.text}
                        </p>
                      ) : null}

                      {/* Tags + time */}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {bookmark.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-0.5 rounded-full border border-border/70 bg-muted/80 px-2 py-0.5 font-medium text-[11px] text-muted-foreground"
                          >
                            # {tag}
                          </span>
                        ))}
                        <span className="text-[11px] text-muted-foreground/60">
                          {formatRelativeTime(bookmark.capturedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Stats (right side) */}
                    <div className="flex shrink-0 items-center gap-4 pt-0.5 text-muted-foreground">
                      <span className="flex items-center gap-1 text-xs">
                        <Eye className="h-3.5 w-3.5" />
                        {views}
                      </span>
                      <span className="flex items-center gap-1 text-xs">
                        <Star className="h-3.5 w-3.5" />
                        {stars}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
