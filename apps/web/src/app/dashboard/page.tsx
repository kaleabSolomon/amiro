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
import { DashboardFolderSidebar } from "@/components/dashboard/dashboard-folder-sidebar";
import { DashboardMainPanel } from "@/components/dashboard/dashboard-main-panel";
import type {
  DashboardFolder,
  DashboardSearchBookmark,
} from "@/components/dashboard/types";
import { AppShell } from "@/components/layout/app-shell";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

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
  const [selectedFolderId, setSelectedFolderId] = useState("unfiled");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const trimmedSearchQuery = searchQuery.trim();
  const deferredSearchQuery = useDeferredValue(trimmedSearchQuery);
  const foldersQuery = useQuery(api.dashboard.getFolderTree);
  const bookmarks = useQuery(api.dashboard.getBookmarksForFolder, {
    folderId: selectedFolderId,
  });
  const searchResults = useQuery(
    api.dashboard.searchWorkspace,
    paletteOpen && deferredSearchQuery
      ? { query: deferredSearchQuery, limit: 30 }
      : "skip",
  );
  const createFolder = useMutation(api.dashboard.createFolder);
  const deleteBookmark = useMutation(api.dashboard.deleteBookmark);

  const folders = useMemo<DashboardFolder[]>(() => {
    if (!foldersQuery || foldersQuery.length === 0) {
      return [
        {
          id: "unfiled",
          name: "Unfiled",
          parentId: null,
          tags: [],
          itemCount: 0,
          updatedAtMs: null,
        },
      ];
    }

    return foldersQuery;
  }, [foldersQuery]);

  const folderMap = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder])),
    [folders],
  );

  const selectedFolder = folderMap.get(selectedFolderId) ?? folders[0];

  const breadcrumbs = useMemo(() => [selectedFolder], [selectedFolder]);

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
    if (!folderMap.has(selectedFolderId) && folders.length > 0) {
      setSelectedFolderId(folders[0].id);
    }
  }, [folderMap, folders, selectedFolderId]);

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

  const selectFolder = (folderId: string) => {
    setSelectedFolderId(folderId);
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
      setSelectedFolderId(result.id);
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
    <section className="mx-auto w-full max-w-6xl px-6 py-8">
      <SidebarProvider>
        <DashboardFolderSidebar
          folders={folders}
          selectedFolderId={selectedFolder.id}
          onSelectFolder={selectFolder}
        />

        <SidebarInset>
          <DashboardMainPanel
            selectedFolder={selectedFolder}
            breadcrumbs={breadcrumbs}
            bookmarks={bookmarks ?? []}
            creatingFolder={creatingFolder}
            onSelectFolder={selectFolder}
            onCreateFolder={handleCreateFolder}
            onDeleteBookmark={handleDeleteBookmark}
            onOpenSearch={() => setPaletteOpen(true)}
          />
        </SidebarInset>

        <DashboardCommandPalette
          open={paletteOpen}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          loading={Boolean(deferredSearchQuery) && searchResults === undefined}
          folders={paletteFolders}
          bookmarks={paletteBookmarks}
          onClose={() => setPaletteOpen(false)}
          onSelectFolder={selectFolder}
          onOpenBookmark={openBookmark}
        />
      </SidebarProvider>
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
          <AppShell>
            <FolderWorkspace />
          </AppShell>
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
