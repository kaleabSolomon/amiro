"use client";

import { api } from "@amiro/backend/convex/_generated/api";
import type { Id } from "@amiro/backend/convex/_generated/dataModel";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  DashboardProvider,
  useDashboard,
} from "@/components/dashboard/dashboard-context";
import {
  DashboardMainPanel,
  type SortOption,
} from "@/components/dashboard/dashboard-main-panel";
import type {
  DashboardBookmark,
  DashboardFolder,
} from "@/components/dashboard/types";
import { AppShell } from "@/components/layout/app-shell";

function RedirectToAuth() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/auth");
  }, [router]);

  return null;
}

function RedirectToCompleteProfile() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/auth?mode=complete-profile");
  }, [router]);

  return null;
}

function FolderWorkspace() {
  const { selectedFolderId, folders } = useDashboard();

  const folderMap = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder])),
    [folders],
  );

  const selectedFolder: DashboardFolder =
    selectedFolderId === "recent"
      ? {
          id: "recent",
          name: "Recent",
          icon: "🕘",
          visibility: "private",
          parentId: null,
          tags: [],
          itemCount: 0,
          updatedAtMs: null,
        }
      : selectedFolderId === "shared"
        ? {
            id: "shared",
            name: "Shared with me",
            icon: "🔗",
            visibility: "private",
            parentId: null,
            tags: [],
            itemCount: 0,
            updatedAtMs: null,
          }
        : selectedFolderId === "feed"
          ? {
              id: "feed",
              name: "Feed",
              icon: "👥",
              visibility: "private",
              parentId: null,
              tags: [],
              itemCount: 0,
              updatedAtMs: null,
            }
          : (folderMap.get(selectedFolderId) ?? folders[0]);
  const breadcrumbs = useMemo(() => [selectedFolder], [selectedFolder]);

  const isFeedView =
    selectedFolderId === "recent" ||
    selectedFolderId === "shared" ||
    selectedFolderId === "feed";
  // Folder views go through the paginated query: the old one collected the
  // whole folder, which is what put a hard ceiling on large accounts.
  const [sortBy, setSortBy] = useState<SortOption>("Recent");
  const serverSort =
    sortBy === "Most starred"
      ? "stars"
      : sortBy === "Most saved"
        ? "saves"
        : "recent";

  const folderPages = usePaginatedQuery(
    api.dashboard.listBookmarksForFolder,
    isFeedView ? "skip" : { folderId: selectedFolderId, sort: serverSort },
    { initialNumItems: BOOKMARKS_PER_PAGE },
  );
  const recentBookmarks = useQuery(
    api.dashboard.getRecentBookmarks,
    selectedFolderId === "recent" ? { days: 7, limit: 120 } : "skip",
  );
  const sharedBookmarks = useQuery(
    api.dashboard.getSharedBookmarks,
    selectedFolderId === "shared" ? { limit: 120 } : "skip",
  );
  const feedData = useQuery(
    api.follows.getFollowingFeed,
    selectedFolderId === "feed" ? { limit: 50 } : "skip",
  );
  const feedBookmarks = useMemo<DashboardBookmark[] | undefined>(() => {
    if (!feedData) return feedData;
    return feedData.bookmarks.map((b: any) => ({
      id: b.id,
      url: b.url,
      title: b.title,
      text: b.text,
      childLinks: [],
      tags: b.tags,
      source: b.source,
      visibility: b.visibility,
      folderId: b.folderId,
      folderName: b.folderName,
      totalSaves: b.totalSaves,
      totalStars: b.totalStars,
      viewerHasStarred: b.viewerHasStarred,
      savedFrom: b.owner
        ? {
            id: b.owner.id,
            name: b.owner.name,
            username: b.owner.username,
            image: b.owner.image,
          }
        : null,
      capturedAt: b.capturedAt,
      lastSyncedAt: b.lastSyncedAt,
    }));
  }, [feedData]);

  const bookmarks =
    selectedFolderId === "recent"
      ? recentBookmarks
      : selectedFolderId === "shared"
        ? sharedBookmarks
        : selectedFolderId === "feed"
          ? feedBookmarks
          : folderPages.results;
  // "LoadingFirstPage" is the only state that should blank the list; loading a
  // later page keeps what's already on screen.
  const bookmarksLoading = isFeedView
    ? bookmarks === undefined
    : folderPages.status === "LoadingFirstPage";

  const deleteBookmark = useMutation(api.dashboard.deleteBookmark);

  const handleDeleteBookmark = async (bookmarkId: string) => {
    try {
      await deleteBookmark({
        bookmarkId: bookmarkId as Id<"syncedBookmarks">,
      });
      toast.success("Bookmark deleted.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete bookmark.";
      toast.error(message);
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <DashboardMainPanel
        selectedFolder={selectedFolder}
        breadcrumbs={breadcrumbs}
        bookmarks={bookmarks ?? []}
        bookmarksLoading={bookmarksLoading}
        onDeleteBookmark={handleDeleteBookmark}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onLoadMore={
          isFeedView
            ? undefined
            : () => folderPages.loadMore(BOOKMARKS_PER_PAGE)
        }
        canLoadMore={!isFeedView && folderPages.status === "CanLoadMore"}
        loadingMore={folderPages.status === "LoadingMore"}
      />
    </section>
  );
}

// Page size for the folder list. Also the increment for "Load more".
const BOOKMARKS_PER_PAGE = 20;

export default function DashboardPage() {
  const currentUser = useQuery(api.auth.getCurrentUser);

  return (
    <>
      <Authenticated>
        {currentUser === undefined ? (
          <div className="flex min-h-svh items-center justify-center">
            <div className="text-muted-foreground text-sm">Loading...</div>
          </div>
        ) : currentUser && !currentUser.username ? (
          <RedirectToCompleteProfile />
        ) : (
          <DashboardProvider>
            <AppShell>
              <FolderWorkspace />
            </AppShell>
          </DashboardProvider>
        )}
      </Authenticated>
      <Unauthenticated>
        <RedirectToAuth />
      </Unauthenticated>
      <AuthLoading>
        <div className="flex min-h-svh items-center justify-center">
          <div className="text-muted-foreground text-sm">Loading...</div>
        </div>
      </AuthLoading>
    </>
  );
}
