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
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { DashboardCommandPalette } from "@/components/dashboard/dashboard-command-palette";
import { DashboardFolderSidebar } from "@/components/dashboard/dashboard-folder-sidebar";
import { DashboardMainPanel } from "@/components/dashboard/dashboard-main-panel";
import type { DashboardFolder } from "@/components/dashboard/types";
import { AppShell } from "@/components/layout/app-shell";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

function RedirectToAuth() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/auth");
  }, [router]);

  return null;
}

function FolderWorkspace() {
  const [selectedFolderId, setSelectedFolderId] = useState("unfiled");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const foldersQuery = useQuery(api.dashboard.getFolderTree);
  const bookmarks = useQuery(api.dashboard.getBookmarksForFolder, {
    folderId: selectedFolderId,
  });
  const createFolder = useMutation(api.dashboard.createFolder);

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

  const breadcrumbs = useMemo(() => {
    const path: DashboardFolder[] = [];
    let current: DashboardFolder | undefined = selectedFolder;

    while (current) {
      path.unshift(current);
      current = current.parentId ? folderMap.get(current.parentId) : undefined;
    }

    return path;
  }, [folderMap, selectedFolder]);

  const childFolders = useMemo(
    () => folders.filter((folder) => folder.parentId === selectedFolder.id),
    [folders, selectedFolder.id],
  );

  const filteredFolders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return folders;
    }

    return folders.filter((folder) => {
      return (
        folder.name.toLowerCase().includes(query) ||
        folder.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    });
  }, [folders, searchQuery]);

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
        parentFolderId:
          selectedFolderId !== "unfiled"
            ? (selectedFolderId as Id<"folders">)
            : undefined,
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
            childFolders={childFolders}
            bookmarks={bookmarks ?? []}
            creatingFolder={creatingFolder}
            onSelectFolder={selectFolder}
            onCreateFolder={handleCreateFolder}
            onOpenSearch={() => setPaletteOpen(true)}
          />
        </SidebarInset>

        <DashboardCommandPalette
          open={paletteOpen}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          folders={filteredFolders}
          onClose={() => setPaletteOpen(false)}
          onSelectFolder={selectFolder}
        />
      </SidebarProvider>
    </section>
  );
}

export default function DashboardPage() {
  return (
    <>
      <Authenticated>
        <AppShell>
          <FolderWorkspace />
        </AppShell>
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
