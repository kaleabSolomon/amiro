"use client";

import { api } from "@amiro/backend/convex/_generated/api";
import type { Id } from "@amiro/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  Bookmark as BookmarkIcon,
  ExternalLink,
  Globe2,
  Lock,
  Save,
} from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import { toast } from "sonner";

import { formatRelativeTime } from "@/components/dashboard/time";
import { Footer } from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";

/* ─── Helpers ─────────────────────────────────────────────── */

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getLetterAvatar(url: string) {
  return getDomain(url).charAt(0).toUpperCase();
}

function getInitials(name?: string | null) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "U";
}

/* ─── Types ───────────────────────────────────────────────── */

type PublicBookmark = {
  id: Id<"syncedBookmarks">;
  url: string;
  title: string;
  text: string;
  tags: string[];
  visibility: "private" | "public";
  capturedAt: number;
  lastSyncedAt: number;
};

/* ─── Sub-components ──────────────────────────────────────── */

function ShareNav({
  currentUser,
}: {
  currentUser: { username?: string | null } | null | undefined;
}) {
  return (
    <nav className="sticky top-0 z-40 border-border/60 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href={currentUser ? "/dashboard" : "/"}
          className="font-serif text-foreground text-lg transition-opacity hover:opacity-80"
        >
          Amiro
        </Link>

        <div className="flex items-center gap-2">
          {currentUser ? (
            <Button
              size="sm"
              variant="secondary"
              render={<Link href="/dashboard" />}
            >
              Go to dashboard
            </Button>
          ) : (
            <>
              <span className="hidden text-muted-foreground text-sm sm:inline">
                Save this collection to your Amiro
              </span>
              <Button size="sm" render={<Link href="/auth" />}>
                Sign in
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function BookmarkRow({
  bookmark,
  isSaving,
  canSave,
  onSave,
}: {
  bookmark: PublicBookmark;
  isSaving: boolean;
  canSave: boolean;
  onSave: () => void;
}) {
  const domain = getDomain(bookmark.url);
  const letter = getLetterAvatar(bookmark.url);

  return (
    <article className="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/50">
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
          {bookmark.visibility === "public" ? (
            <Globe2 className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          ) : (
            <Lock className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          )}
        </div>

        <p className="mt-0.5 font-mono text-muted-foreground text-xs">
          {domain}
        </p>

        {bookmark.text ? (
          <p className="mt-1.5 line-clamp-1 text-muted-foreground/80 text-sm">
            {bookmark.text}
          </p>
        ) : null}

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

      <div className="flex shrink-0 items-center gap-1 pt-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <a
          href={bookmark.url}
          target="_blank"
          rel="noreferrer"
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Open link"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        {canSave ? (
          <button
            type="button"
            disabled={isSaving}
            onClick={onSave}
            className="flex items-center gap-1 rounded px-1 text-muted-foreground text-xs transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Save bookmark"
            title="Save to Unfiled"
          >
            <Save className="h-3.5 w-3.5" />
            {isSaving ? "Saving…" : "Save"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

/* ─── Main page ───────────────────────────────────────────── */

export default function SharePage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = use(params);

  const shareData = useQuery(api.sharing.resolveShare, { publicId });
  const currentUser = useQuery(api.auth.getCurrentUser);

  const saveFromShare = useMutation(api.sharing.saveFromShare);

  const [savingBookmarkId, setSavingBookmarkId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);

  const canSave = Boolean(currentUser);

  /* Loading */
  if (shareData === undefined) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading share…</div>
      </div>
    );
  }

  /* Not found — resolveShare throws, Convex returns null on error */
  if (shareData === null) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background px-4">
        <section className="w-full max-w-md rounded-xl border border-border/60 bg-card/50 p-8 text-center shadow-sm">
          <h1 className="font-serif text-3xl text-foreground">
            Share not found
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            This link may have expired or been removed.
          </p>
          <Button className="mt-6" render={<Link href="/" />}>
            Go home
          </Button>
        </section>
      </main>
    );
  }

  const { owner, resource } = shareData;
  const initials = getInitials(owner?.name);
  const bookmarks: PublicBookmark[] =
    resource.type === "folder"
      ? (resource.bookmarks as PublicBookmark[])
      : [resource.bookmark as PublicBookmark];
  const isFolder = resource.type === "folder";
  const folderName = isFolder ? resource.folder.name : null;
  const folderIcon = isFolder ? resource.folder.icon : null;

  async function handleSaveBookmark(bookmarkId: string) {
    setSavingBookmarkId(bookmarkId);
    try {
      await saveFromShare({
        publicId,
        bookmarkId: bookmarkId as Id<"syncedBookmarks">,
      });
      toast.success("Bookmark saved to Unfiled.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save bookmark.",
      );
    } finally {
      setSavingBookmarkId((cur) => (cur === bookmarkId ? null : cur));
    }
  }

  async function handleSaveAll() {
    setSavingAll(true);
    try {
      const result = await saveFromShare({ publicId });
      toast.success(
        result.savedCount === 0
          ? "You already have all these bookmarks."
          : `${result.savedCount} bookmark${result.savedCount === 1 ? "" : "s"} saved to Unfiled.`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save bookmarks.",
      );
    } finally {
      setSavingAll(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <ShareNav currentUser={currentUser} />

      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl space-y-8">
          {/* ── Hero / owner card ── */}
          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="bg-[radial-gradient(circle_at_20%_0%,oklch(0.62_0.13_165_/_0.08),transparent_40%),radial-gradient(circle_at_80%_10%,oklch(0.58_0.11_280_/_0.06),transparent_35%)] p-6 sm:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  {/* Avatar */}
                  <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-[oklch(0.86_0.13_165)]/80 to-[oklch(0.65_0.18_320)]/70 font-serif text-3xl text-[oklch(0.2_0.04_165)] shadow-[0_1px_2px_oklch(0_0_0_/_0.4),0_8px_24px_-12px_oklch(0_0_0_/_0.5)]">
                    {initials}
                  </div>

                  <div className="min-w-0">
                    <h1 className="font-serif text-4xl tracking-normal sm:text-5xl">
                      {owner?.name ?? "Amiro user"}
                    </h1>
                    {owner?.username ? (
                      <p className="mt-1 font-mono text-muted-foreground text-sm">
                        @{owner.username}
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 md:pt-8">
                  {owner?.username ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      render={<Link href={`/profile/${owner.username}`} />}
                    >
                      View profile
                    </Button>
                  ) : null}
                  {canSave && isFolder ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={savingAll}
                      onClick={handleSaveAll}
                    >
                      <BookmarkIcon className="h-4 w-4" />
                      {savingAll ? "Saving…" : "Save all to Amiro"}
                    </Button>
                  ) : null}
                </div>
              </div>

              {/* Shared resource label */}
              <div className="mt-6 flex items-center gap-3">
                {isFolder ? (
                  <>
                    <span className="grid h-9 w-9 place-items-center rounded-md bg-mint/10 text-lg text-mint">
                      {folderIcon}
                    </span>
                    <div>
                      <p className="font-serif text-xl">{folderName}</p>
                      <p className="text-muted-foreground text-xs">
                        {bookmarks.length} public bookmark
                        {bookmarks.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Shared a bookmark
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* ── Bookmark list ── */}
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-serif text-2xl tracking-normal">
                {isFolder ? "Bookmarks" : "Bookmark"}
              </h2>
              <div className="flex items-center gap-2">
                {!canSave ? (
                  <p className="text-muted-foreground text-xs">
                    <Link
                      href="/auth"
                      className="underline underline-offset-2 hover:text-foreground"
                    >
                      Sign in
                    </Link>{" "}
                    to save
                  </p>
                ) : null}
                {canSave && isFolder ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={savingAll}
                    onClick={handleSaveAll}
                  >
                    <BookmarkIcon className="h-3.5 w-3.5" />
                    {savingAll ? "Saving…" : "Save all"}
                  </Button>
                ) : null}
              </div>
            </div>

            {bookmarks.length === 0 ? (
              <div className="rounded-xl border border-border border-dashed bg-card/40 p-8 text-center text-muted-foreground text-sm">
                No public bookmarks in this collection.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border/60 bg-card/50">
                <div className="divide-y divide-border/40">
                  {bookmarks.map((bookmark) => (
                    <BookmarkRow
                      key={bookmark.id}
                      bookmark={bookmark}
                      canSave={canSave}
                      isSaving={savingBookmarkId === bookmark.id || savingAll}
                      onSave={() => handleSaveBookmark(bookmark.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
