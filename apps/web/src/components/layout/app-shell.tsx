"use client";

import { api } from "@amiro/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { DashboardFolderSidebar } from "@/components/dashboard/dashboard-folder-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppNav } from "./app-nav";
import { Footer } from "./site-footer";

export function AppShell({ children }: { children: ReactNode }) {
  const {
    folders,
    selectedFolderId,
    foldersLoading,
    recentCount,
    selectFolder,
  } = useDashboard();
  const createFolder = useMutation(api.dashboard.createFolder);
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

  return (
    <SidebarProvider>
      <DashboardFolderSidebar
        folders={folders}
        selectedFolderId={selectedFolderId}
        isLoading={foldersLoading}
        recentCount={recentCount}
        creatingFolder={creatingFolder}
        onSelectFolder={selectFolder}
        onCreateFolder={handleCreateFolder}
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
