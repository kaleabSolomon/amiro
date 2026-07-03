"use client";

import { api } from "@amiro/backend/convex/_generated/api";
import type { Id } from "@amiro/backend/convex/_generated/dataModel";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";

import {
  DashboardProvider,
  useDashboard,
} from "@/components/dashboard/dashboard-context";
import { DashboardMainPanel } from "@/components/dashboard/dashboard-main-panel";
import type { DashboardFolder } from "@/components/dashboard/types";
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
        : (folderMap.get(selectedFolderId) ?? folders[0]);
  const breadcrumbs = useMemo(() => [selectedFolder], [selectedFolder]);

  const isFeedView =
    selectedFolderId === "recent" || selectedFolderId === "shared";
  const folderBookmarks = useQuery(
    api.dashboard.getBookmarksForFolder,
    isFeedView ? "skip" : { folderId: selectedFolderId },
  );
  const recentBookmarks = useQuery(
    api.dashboard.getRecentBookmarks,
    selectedFolderId === "recent" ? { days: 7, limit: 120 } : "skip",
  );
  const sharedBookmarks = useQuery(
    api.dashboard.getSharedBookmarks,
    selectedFolderId === "shared" ? { limit: 120 } : "skip",
  );
  const bookmarks =
    selectedFolderId === "recent"
      ? recentBookmarks
      : selectedFolderId === "shared"
        ? sharedBookmarks
        : folderBookmarks;
  const bookmarksLoading = bookmarks === undefined;

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
    <section className="mx-auto w-full max-w-6xl px-6 py-8">
      <DashboardMainPanel
        selectedFolder={selectedFolder}
        breadcrumbs={breadcrumbs}
        bookmarks={bookmarks ?? []}
        bookmarksLoading={bookmarksLoading}
        onDeleteBookmark={handleDeleteBookmark}
      />
    </section>
  );
}

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
