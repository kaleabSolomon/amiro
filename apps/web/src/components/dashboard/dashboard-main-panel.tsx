"use client";

import { api } from "@amiro/backend/convex/_generated/api";
import type { Id } from "@amiro/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import {
  ArrowUpDown,
  Bookmark as BookmarkIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FolderInput,
  Globe2,
  Hash,
  Loader2,
  Lock,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { toast } from "sonner";

import { MoveBookmarkDialog } from "@/components/dashboard/move-bookmark-dialog";
import { NewBookmarkDialog } from "@/components/dashboard/new-bookmark-dialog";
import { ShareFolderDialog } from "@/components/dashboard/share-folder-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { useDashboard } from "./dashboard-context";
import { type DisplayTag, tagFacetClass, toDisplayTags } from "./tag-display";
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

const SORT_OPTIONS = ["Recent", "Most starred", "Most saved"] as const;
type SortOption = (typeof SORT_OPTIONS)[number];
const RECENT_PAGE_SIZE = 20;

function getDayKey(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function formatDayHeading(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (getDayKey(timestamp) === getDayKey(today.getTime())) {
    return "Today";
  }
  if (getDayKey(timestamp) === getDayKey(yesterday.getTime())) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);
}

function groupBookmarksByDay(
  bookmarks: DashboardBookmark[],
  getTimestamp: (bookmark: DashboardBookmark) => number,
) {
  const groups = new Map<string, DashboardBookmark[]>();

  for (const bookmark of bookmarks) {
    const key = getDayKey(getTimestamp(bookmark));
    groups.set(key, [...(groups.get(key) ?? []), bookmark]);
  }

  return [...groups.entries()].map(([key, items]) => ({
    key,
    label: formatDayHeading(items[0] ? getTimestamp(items[0]) : Date.now()),
    bookmarks: items,
  }));
}

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
  const [recentPage, setRecentPage] = useState(1);

  const { folders } = useDashboard();

  const createBookmark = useMutation(api.sync.createBookmark);
  const updateFolderVisibility = useMutation(
    api.dashboard.updateFolderVisibility,
  );
  const updateBookmarkVisibility = useMutation(
    api.dashboard.updateBookmarkVisibility,
  );
  const toggleBookmarkStar = useMutation(api.sharing.toggleBookmarkStar);
  const moveBookmark = useMutation(api.dashboard.moveBookmark);

  const [creatingBookmark, setCreatingBookmark] = useState(false);

  /* Collect unique tags from bookmarks for the filter bar (legacy chips hidden,
     facet prefixes stripped for display; `raw` drives filtering). */
  const allTags = useMemo(() => {
    const seen = new Set<string>();
    const out: DisplayTag[] = [];
    for (const bookmark of bookmarks) {
      for (const display of toDisplayTags(bookmark.tags)) {
        if (!seen.has(display.raw)) {
          seen.add(display.raw);
          out.push(display);
        }
      }
    }
    return out;
  }, [bookmarks]);

  /* Filter bookmarks by active tag */
  const filteredBookmarks = useMemo(() => {
    if (!activeTag) return bookmarks;
    return bookmarks.filter((b) => b.tags.includes(activeTag));
  }, [bookmarks, activeTag]);

  const isRecentView = selectedFolder.id === "recent";
  const isSharedView = selectedFolder.id === "shared";
  const isFeedView = isRecentView || isSharedView;
  const folderIsPublic = selectedFolder.visibility === "public";
  const folderVisibilityLocked = selectedFolder.id === "unfiled";
  const feedTimestamp = useMemo(
    () => (bookmark: DashboardBookmark) =>
      isSharedView
        ? (bookmark.savedAt ?? bookmark.lastSyncedAt)
        : bookmark.lastSyncedAt,
    [isSharedView],
  );
  const displayedItemCount = isFeedView
    ? bookmarks.length
    : selectedFolder.itemCount;
  const displayedUpdatedAtMs = isFeedView
    ? bookmarks[0]
      ? feedTimestamp(bookmarks[0])
      : null
    : selectedFolder.updatedAtMs;
  const recentPageCount = Math.max(
    1,
    Math.ceil(filteredBookmarks.length / RECENT_PAGE_SIZE),
  );
  const safeRecentPage = Math.min(recentPage, recentPageCount);
  const sortedBookmarks = useMemo(() => {
    const next = [...filteredBookmarks];
    if (sortBy === "Most starred") {
      return next.sort((a, b) => (b.totalStars ?? 0) - (a.totalStars ?? 0));
    }
    if (sortBy === "Most saved") {
      return next.sort((a, b) => (b.totalSaves ?? 0) - (a.totalSaves ?? 0));
    }
    return next.sort((a, b) => feedTimestamp(b) - feedTimestamp(a));
  }, [filteredBookmarks, sortBy, feedTimestamp]);
  const visibleBookmarks = isFeedView
    ? sortedBookmarks.slice(
        (safeRecentPage - 1) * RECENT_PAGE_SIZE,
        safeRecentPage * RECENT_PAGE_SIZE,
      )
    : sortedBookmarks;
  const feedBookmarkGroups = useMemo(
    () => groupBookmarksByDay(visibleBookmarks, feedTimestamp),
    [visibleBookmarks, feedTimestamp],
  );

  function renderBookmarkRow(bookmark: DashboardBookmark) {
    const domain = getDomain(bookmark.url);
    const letter = getLetterAvatar(bookmark.url);
    const bookmarkIsPublic = bookmark.visibility === "public";
    const bookmarkToggleDisabled = isFeedView
      ? bookmark.folderVisibility !== "public"
      : !folderIsPublic;
    const canStarBookmark = bookmarkIsPublic && !bookmarkToggleDisabled;
    const currentFolderId = isFeedView
      ? (bookmark.folderId ?? "unfiled")
      : selectedFolder.id;
    const totalSaves = bookmark.totalSaves ?? 0;
    const totalStars = bookmark.totalStars ?? 0;
    const viewerHasStarred = bookmark.viewerHasStarred ?? false;

    return (
      <div
        key={bookmark.id}
        className="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/50"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground text-sm">
          {letter}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <a
              href={bookmark.url}
              target="_blank"
              rel="noreferrer"
              className="line-clamp-1 font-semibold text-foreground text-sm transition-colors hover:text-primary"
            >
              {bookmark.title}
            </a>
            <div className="relative flex items-center">
              <div className="flex items-center opacity-100 transition-opacity group-hover:opacity-0">
                {bookmarkIsPublic ? (
                  <Globe2 className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                ) : (
                  <Lock className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                )}
              </div>

              <div className="pointer-events-none absolute top-1/2 left-0 z-10 flex -translate-y-1/2 items-center rounded-md border border-border bg-background/80 p-0.5 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                <VisibilityToggle
                  active={!bookmarkIsPublic}
                  icon={Lock}
                  label="Private bookmark"
                  compact
                  disabled={bookmarkToggleDisabled}
                  onClick={async () => {
                    if (bookmarkToggleDisabled || !bookmarkIsPublic) {
                      return;
                    }
                    try {
                      await updateBookmarkVisibility({
                        bookmarkId: bookmark.id as Id<"syncedBookmarks">,
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
                    if (bookmarkToggleDisabled || bookmarkIsPublic) {
                      return;
                    }
                    try {
                      await updateBookmarkVisibility({
                        bookmarkId: bookmark.id as Id<"syncedBookmarks">,
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
            </div>
          </div>

          <p className="mt-0.5 font-mono text-muted-foreground text-xs">
            {domain}
          </p>

          {isFeedView && bookmark.folderName ? (
            <p className="mt-1 text-muted-foreground text-xs">
              {isSharedView && bookmark.savedFrom ? (
                <>
                  Saved from{" "}
                  <span className="font-medium text-foreground/80">
                    {bookmark.savedFrom.username
                      ? `@${bookmark.savedFrom.username}`
                      : bookmark.savedFrom.name}
                  </span>{" "}
                  · {bookmark.folderName}
                </>
              ) : (
                bookmark.folderName
              )}
            </p>
          ) : null}

          {bookmark.text ? (
            <p className="mt-1.5 line-clamp-1 text-muted-foreground/80 text-sm">
              {bookmark.text}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {toDisplayTags(bookmark.tags)
              .slice(0, 4)
              .map((tag) => (
                <span
                  key={tag.raw}
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 font-medium text-[11px]",
                    tagFacetClass(tag.facet),
                  )}
                >
                  {tag.label}
                </span>
              ))}
            {bookmark.tagStatus === "pending" ? (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-border/60 border-dashed px-2 py-0.5 font-medium text-[11px] text-muted-foreground/70"
                title="AI is picking topic tags for this bookmark"
              >
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                tagging…
              </span>
            ) : null}
            <span className="text-[11px] text-muted-foreground/60">
              {formatRelativeTime(bookmark.capturedAt)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end justify-between self-stretch">
          <div className="flex items-center gap-4 pt-0.5 text-muted-foreground">
            <span className="flex items-center gap-1 text-xs" title="Saves">
              <BookmarkIcon className="h-3.5 w-3.5" />
              {totalSaves}
            </span>
            <button
              type="button"
              disabled={!canStarBookmark}
              onClick={async () => {
                if (!canStarBookmark) {
                  return;
                }
                try {
                  await toggleBookmarkStar({
                    bookmarkId: bookmark.id as Id<"syncedBookmarks">,
                  });
                } catch (error) {
                  const message =
                    error instanceof Error
                      ? error.message
                      : "Failed to update bookmark star.";
                  toast.error(message);
                }
              }}
              className={cn(
                "flex items-center gap-1 rounded px-1 text-xs transition-colors",
                viewerHasStarred
                  ? "text-amber-500 hover:text-amber-600"
                  : "hover:text-foreground",
                !canStarBookmark &&
                  "cursor-not-allowed opacity-45 hover:text-muted-foreground",
              )}
              aria-pressed={viewerHasStarred}
              aria-label={
                viewerHasStarred ? "Unstar bookmark" : "Star bookmark"
              }
              title={
                canStarBookmark
                  ? "Star bookmark"
                  : "Only public bookmarks can be starred"
              }
            >
              <Star
                className={cn(
                  "h-3.5 w-3.5",
                  viewerHasStarred && "fill-current",
                )}
              />
              {totalStars}
            </button>
          </div>

          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <a
              href={bookmark.url}
              target="_blank"
              rel="noreferrer"
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Open link"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <MoveBookmarkDialog
              folders={folders}
              currentFolderId={currentFolderId}
              bookmarkIsPublic={bookmarkIsPublic}
              onMove={async (destinationFolderId) => {
                try {
                  await moveBookmark({
                    bookmarkId: bookmark.id as Id<"syncedBookmarks">,
                    folderId:
                      destinationFolderId === "unfiled"
                        ? undefined
                        : (destinationFolderId as Id<"folders">),
                  });
                  toast.success("Bookmark moved.");
                } catch (error) {
                  const message =
                    error instanceof Error
                      ? error.message
                      : "Failed to move bookmark.";
                  toast.error(message);
                  throw error;
                }
              }}
              trigger={
                <button
                  type="button"
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Move bookmark to another folder"
                >
                  <FolderInput className="h-3.5 w-3.5" />
                </button>
              }
            />
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
      </div>
    );
  }

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
              {displayedItemCount} saved items · updated{" "}
              {formatRelativeTime(displayedUpdatedAtMs)}
              {isRecentView ? (
                " · last 7 days"
              ) : isSharedView ? (
                " · saved from others"
              ) : (
                <span className="inline-flex items-center gap-1">
                  {" · "}
                  {folderIsPublic ? (
                    <Globe2 className="inline h-3.5 w-3.5" />
                  ) : (
                    <Lock className="inline h-3.5 w-3.5" />
                  )}
                  {folderIsPublic ? " Public" : " Private"}
                </span>
              )}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {toDisplayTags(selectedFolder.tags).map((tag) => (
                <span
                  key={tag.raw}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-medium text-[11px]",
                    tagFacetClass(tag.facet),
                  )}
                >
                  {tag.facet === "plain" ? <Hash className="h-3 w-3" /> : null}
                  {tag.label}
                </span>
              ))}
            </div>
          </div>

          {!isFeedView ? (
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
              <ShareFolderDialog
                folderId={selectedFolder.id as Id<"folders">}
                folderName={selectedFolder.name}
                trigger={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!folderIsPublic}
                  >
                    Share
                  </Button>
                }
              />
            </div>
          ) : null}
        </div>
      </header>

      {/* ─── Bookmarks section ─────────────────────────────── */}
      <div className="mt-8">
        <p className="mb-4 font-medium text-muted-foreground text-sm">
          {isRecentView
            ? "Recent bookmarks from the last 7 days"
            : isSharedView
              ? "Bookmarks you saved from others"
              : `Bookmarks in ${selectedFolder.name}`}
        </p>

        {bookmarksLoading ? (
          (bookmarksLoadingFallback ?? (
            <div className="rounded-xl border border-border/60 bg-card/50">
              <BookmarkSkeletonList />
            </div>
          ))
        ) : bookmarks.length === 0 ? (
          <div className="rounded-xl border border-border border-dashed p-6 text-center text-muted-foreground text-sm">
            {isRecentView
              ? "No bookmarks saved in the last 7 days."
              : isSharedView
                ? "Nothing here yet. Bookmarks you save from other people will show up here."
                : "No bookmarks in this folder yet."}
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 bg-card/50">
            {/* ─── Filter bar + sort ───────────────────── */}
            <div className="flex items-center justify-between gap-3 border-border/60 border-b px-5 py-3">
              {/* Tag filters */}
              <div className="flex flex-wrap items-center gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTag(null);
                    setRecentPage(1);
                  }}
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
                    key={tag.raw}
                    type="button"
                    onClick={() => {
                      setActiveTag(activeTag === tag.raw ? null : tag.raw);
                      setRecentPage(1);
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1 font-medium text-xs transition-colors",
                      activeTag === tag.raw
                        ? "border-transparent bg-foreground text-background"
                        : cn(tagFacetClass(tag.facet), "hover:opacity-80"),
                    )}
                  >
                    {tag.label}
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

            {isFeedView ? (
              <div>
                {feedBookmarkGroups.map((group, index) => (
                  <section
                    key={group.key}
                    className={cn(index > 0 && "border-border/60 border-t")}
                  >
                    <div className="bg-background/60 px-5 py-3">
                      <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.16em]">
                        {group.label}
                      </p>
                    </div>
                    <div className="divide-y divide-border/40">
                      {group.bookmarks.map((bookmark) =>
                        renderBookmarkRow(bookmark),
                      )}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {visibleBookmarks.map((bookmark) =>
                  renderBookmarkRow(bookmark),
                )}
              </div>
            )}

            {isFeedView && recentPageCount > 1 ? (
              <div className="flex items-center justify-between border-border/60 border-t px-5 py-3">
                <p className="text-muted-foreground text-xs">
                  Page {safeRecentPage} of {recentPageCount}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={safeRecentPage === 1}
                    onClick={() =>
                      setRecentPage((page) => Math.max(1, page - 1))
                    }
                    aria-label="Previous recent page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={safeRecentPage === recentPageCount}
                    onClick={() =>
                      setRecentPage((page) =>
                        Math.min(recentPageCount, page + 1),
                      )
                    }
                    aria-label="Next recent page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
