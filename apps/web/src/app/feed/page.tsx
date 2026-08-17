"use client";

import { api } from "@amiro/backend/convex/_generated/api";
import type { Id } from "@amiro/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Bookmark as BookmarkIcon,
  Save,
  Star,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import {
  tagFacetClass,
  toDisplayTags,
} from "@/components/dashboard/tag-display";
import { formatRelativeTime } from "@/components/dashboard/time";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FeedBookmark = {
  id: string;
  url: string;
  title: string;
  text: string;
  tags: string[];
  source: "chrome" | "telegram" | "instagram" | "twitter";
  visibility: "private" | "public";
  folderId: string | null;
  folderName: string;
  capturedAt: number;
  lastSyncedAt: number;
  owner: {
    id: string;
    name: string;
    username: string | null;
    image: string | null;
  };
  totalSaves: number;
  totalStars: number;
  viewerHasStarred: boolean;
};

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "U";
}

export default function FeedPage() {
  const currentUser = useQuery(api.auth.getCurrentUser);
  const feedData = useQuery(api.follows.getFollowingFeed, { limit: 50 });
  const toggleBookmarkStar = useMutation(api.sharing.toggleBookmarkStar);
  const savePublicBookmark = useMutation(api.sharing.savePublicBookmark);

  const [savingId, setSavingId] = useState<string | null>(null);

  const bookmarks = (feedData?.bookmarks ?? []) as FeedBookmark[];
  const signedIn = Boolean(currentUser);
  const loading = currentUser === undefined || feedData === undefined;

  async function handleToggleStar(bookmarkId: string) {
    try {
      await toggleBookmarkStar({
        bookmarkId: bookmarkId as Id<"syncedBookmarks">,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update star.",
      );
    }
  }

  async function handleSave(bookmarkId: string) {
    setSavingId(bookmarkId);
    try {
      const result = await savePublicBookmark({
        bookmarkId: bookmarkId as Id<"syncedBookmarks">,
      });
      toast.success(
        result.attributed
          ? "Bookmark saved to Unfiled."
          : "Bookmark already saved.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save bookmark.",
      );
    } finally {
      setSavingId((current) => (current === bookmarkId ? null : current));
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-border/60 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="font-serif text-xl tracking-tight">Following</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            render={
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Link>
            }
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <p className="mb-5 text-muted-foreground text-sm">
          The latest public saves from people you follow.
        </p>

        {loading ? (
          <FeedState title="Loading…" body="Fetching the latest saves." />
        ) : !signedIn ? (
          <FeedState
            title="Sign in to see your feed"
            body="Follow people whose saves you admire and their public bookmarks show up here."
            action={
              <Button size="sm" render={<Link href="/auth">Sign in</Link>} />
            }
          />
        ) : bookmarks.length === 0 ? (
          <FeedState
            title="Your feed is empty"
            body="Follow people whose taste you trust — open a profile and hit Follow. Their public saves will collect here."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/60 bg-card/50">
            <div className="divide-y divide-border/40">
              {bookmarks.map((bookmark) => (
                <FeedRow
                  key={bookmark.id}
                  bookmark={bookmark}
                  isSaving={savingId === bookmark.id}
                  onSave={() => handleSave(bookmark.id)}
                  onToggleStar={() => handleToggleStar(bookmark.id)}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function FeedRow({
  bookmark,
  isSaving,
  onSave,
  onToggleStar,
}: {
  bookmark: FeedBookmark;
  isSaving: boolean;
  onSave: () => void;
  onToggleStar: () => void;
}) {
  const domain = getDomain(bookmark.url);
  const owner = bookmark.owner;

  return (
    <article className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-muted/50">
      {/* Attribution — who surfaced this */}
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted font-semibold text-[10px]">
          {getInitials(owner.name)}
        </span>
        {owner.username ? (
          <Link
            href={`/profile/${owner.username}`}
            className="font-medium text-foreground/80 transition-colors hover:text-primary"
          >
            {owner.name}
          </Link>
        ) : (
          <span className="font-medium text-foreground/80">{owner.name}</span>
        )}
        <span className="text-muted-foreground/60">saved</span>
        <span className="text-muted-foreground/60">·</span>
        <span>{formatRelativeTime(bookmark.capturedAt)}</span>
      </div>

      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <a
            href={bookmark.url}
            target="_blank"
            rel="noreferrer"
            className="line-clamp-1 font-semibold text-foreground text-sm transition-colors hover:text-primary"
          >
            {bookmark.title}
          </a>
          <p className="mt-0.5 font-mono text-muted-foreground text-xs">
            {domain} · {bookmark.folderName}
          </p>

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
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4 pt-0.5 text-muted-foreground">
          <span className="flex items-center gap-1 text-xs" title="Saves">
            <BookmarkIcon className="h-3.5 w-3.5" />
            {bookmark.totalSaves}
          </span>
          <button
            type="button"
            disabled={isSaving}
            onClick={onSave}
            className="flex items-center gap-1 rounded px-1 text-xs transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Save bookmark to your collection"
            title="Save bookmark to Unfiled"
          >
            <Save className="h-3.5 w-3.5" />
            {isSaving ? "Saving" : "Save"}
          </button>
          <button
            type="button"
            onClick={onToggleStar}
            className={cn(
              "flex items-center gap-1 rounded px-1 text-xs transition-colors",
              bookmark.viewerHasStarred
                ? "text-amber-500 hover:text-amber-600"
                : "hover:text-foreground",
            )}
            aria-pressed={bookmark.viewerHasStarred}
            aria-label={
              bookmark.viewerHasStarred ? "Unstar bookmark" : "Star bookmark"
            }
            title="Star bookmark"
          >
            <Star
              className={cn(
                "h-3.5 w-3.5",
                bookmark.viewerHasStarred && "fill-current",
              )}
            />
            {bookmark.totalStars}
          </button>
        </div>
      </div>
    </article>
  );
}

function FeedState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border/60 border-dashed bg-card/40 px-6 py-16 text-center">
      <Users className="h-8 w-8 text-muted-foreground/50" />
      <h2 className="font-serif text-lg">{title}</h2>
      <p className="max-w-sm text-muted-foreground text-sm">{body}</p>
      {action}
    </div>
  );
}
