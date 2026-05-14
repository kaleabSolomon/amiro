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
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { DashboardCommandPalette } from "@/components/dashboard/dashboard-command-palette";
import {
  DashboardProvider,
  useDashboard,
} from "@/components/dashboard/dashboard-context";
import { DashboardMainPanel } from "@/components/dashboard/dashboard-main-panel";
import type { DashboardSearchBookmark } from "@/components/dashboard/types";
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
  const { selectedFolderId, selectFolder, folders, foldersLoading } =
    useDashboard();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const trimmedSearchQuery = searchQuery.trim();
  const deferredSearchQuery = useDeferredValue(trimmedSearchQuery);

  const folderMap = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder])),
    [folders],
  );

  const selectedFolder = folderMap.get(selectedFolderId) ?? folders[0];
  const breadcrumbs = useMemo(() => [selectedFolder], [selectedFolder]);

  const bookmarks = useQuery(api.dashboard.getBookmarksForFolder, {
    folderId: selectedFolderId,
  });
  const bookmarksLoading = bookmarks === undefined;

  const searchResults = useQuery(
    api.dashboard.searchWorkspace,
    paletteOpen && deferredSearchQuery
      ? { query: deferredSearchQuery, limit: 30 }
      : "skip",
  );
  const createFolder = useMutation(api.dashboard.createFolder);
  const deleteBookmark = useMutation(api.dashboard.deleteBookmark);

  const paletteFolders = useMemo(() => {
    if (!deferredSearchQuery) {
      return folders;
    }
    if (!searchResults) {
      return [];
    }

    return searchResults.folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      parentId: null,
      tags: [],
      itemCount: 0,
      updatedAtMs: null,
    }));
  }, [deferredSearchQuery, folders, searchResults]);

  const paletteBookmarks = useMemo<DashboardSearchBookmark[]>(() => {
    if (!deferredSearchQuery || !searchResults) {
      return [];
    }
    return searchResults.bookmarks;
  }, [deferredSearchQuery, searchResults]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key === "k";
      if (isShortcut) {
        event.preventDefault();
        setPaletteOpen(true);
      }

      if (event.key === "Escape") {
        setPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleSelectFolder = (folderId: string) => {
    selectFolder(folderId);
    setPaletteOpen(false);
    setSearchQuery("");
  };

  const handleCreateFolder = async (folderName: string) => {
    if (creatingFolder) {
      return;
    }

    setCreatingFolder(true);
    try {
      const result = await createFolder({
        name: folderName.trim(),
      });
      selectFolder(result.id);
      toast.success("Folder created.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create folder.";
      toast.error(message);
    } finally {
      setCreatingFolder(false);
    }
  };

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

  const openBookmark = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
    setPaletteOpen(false);
  };

  return (
    <>
      <section className="mx-auto w-full max-w-6xl px-6 py-8">
        <DashboardMainPanel
          selectedFolder={selectedFolder}
          breadcrumbs={breadcrumbs}
          bookmarks={bookmarks ?? []}
          bookmarksLoading={bookmarksLoading}
          creatingFolder={creatingFolder}
          onSelectFolder={handleSelectFolder}
          onCreateFolder={handleCreateFolder}
          onDeleteBookmark={handleDeleteBookmark}
        />
      </section>

      <DashboardCommandPalette
        open={paletteOpen}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        loading={Boolean(deferredSearchQuery) && searchResults === undefined}
        folders={paletteFolders}
        bookmarks={paletteBookmarks}
        onClose={() => setPaletteOpen(false)}
        onSelectFolder={handleSelectFolder}
        onOpenBookmark={openBookmark}
      />
    </>
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
