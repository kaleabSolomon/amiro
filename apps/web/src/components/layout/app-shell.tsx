"use client";

import type { ReactNode } from "react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { DashboardFolderSidebar } from "@/components/dashboard/dashboard-folder-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { AppNav } from "./app-nav";
import { Footer } from "./site-footer";

export function AppShell({ children }: { children: ReactNode }) {
  const { folders, selectedFolderId, foldersLoading, selectFolder } =
    useDashboard();

  return (
    <SidebarProvider>
      <DashboardFolderSidebar
        folders={folders}
        selectedFolderId={selectedFolderId}
        isLoading={foldersLoading}
        onSelectFolder={selectFolder}
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
