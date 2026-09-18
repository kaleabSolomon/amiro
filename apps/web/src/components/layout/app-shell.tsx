"use client";

import { api } from "@amiro/backend/convex/_generated/api";
import type { Id } from "@amiro/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { DashboardFolderSidebar } from "@/components/dashboard/dashboard-folder-sidebar";
import type { FolderBookmarkDisposition } from "@/components/dashboard/types";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppNav } from "./app-nav";
import { Footer } from "./site-footer";

export function AppShell({ children }: { children: ReactNode }) {
  const {
    folders,
    selectedFolderId,
    foldersLoading,
    recentCount,
    sharedCount,
    selectFolder,
  } = useDashboard();
  const createFolder = useMutation(api.dashboard.createFolder);
  const updateFolder = useMutation(api.dashboard.updateFolder);
  const deleteFolder = useMutation(api.dashboard.deleteFolder);
  const [creatingFolder, setCreatingFolder] = useState(false);

  const handleCreateFolder = async ({
    name,
    icon,
    visibility,
  }: {
    name: string;
    icon: string;
    visibility: "private" | "public";
  }) => {
    if (creatingFolder) {
      return;
    }

    setCreatingFolder(true);
    try {
      const result = await createFolder({
        name,
        icon,
        visibility,
      });
      selectFolder(result.id);
      toast.success("Folder created.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create folder.";
      toast.error(message);
      throw error;
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleRenameFolder = async ({
    folderId,
    name,
    icon,
  }: {
    folderId: string;
    name: string;
    icon: string;
  }) => {
    try {
      await updateFolder({
        folderId: folderId as Id<"folders">,
        name,
        icon,
      });
      toast.success("Folder updated.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update folder.";
      toast.error(message);
      throw error;
    }
  };

  const handleDeleteFolder = async ({
    folderId,
    bookmarks,
  }: {
    folderId: string;
    bookmarks: FolderBookmarkDisposition;
  }) => {
    try {
      const result = await deleteFolder({
        folderId: folderId as Id<"folders">,
        bookmarks,
      });

      // The current view is about to point at a folder that no longer exists.
      if (selectedFolderId === folderId) {
        selectFolder("unfiled");
      }

      const plural = (count: number) =>
        count === 1 ? "bookmark" : "bookmarks";

      if (result.deletedBookmarks > 0) {
        toast.success(
          `Folder deleted, along with ${result.deletedBookmarks} ${plural(
            result.deletedBookmarks,
          )}.`,
        );
      } else if (result.movedToUnfiled > 0) {
        toast.success(
          `Folder deleted. ${result.movedToUnfiled} ${plural(
            result.movedToUnfiled,
          )} moved to Unfiled.`,
        );
      } else {
        toast.success("Folder deleted.");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete folder.";
      toast.error(message);
      throw error;
    }
  };

  return (
    <SidebarProvider>
      <DashboardFolderSidebar
        folders={folders}
        selectedFolderId={selectedFolderId}
        isLoading={foldersLoading}
        recentCount={recentCount}
        sharedCount={sharedCount}
        creatingFolder={creatingFolder}
        onSelectFolder={selectFolder}
        onCreateFolder={handleCreateFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
      />
      <SidebarInset>
        <div className="flex min-h-svh flex-col bg-background">
          <AppNav />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
