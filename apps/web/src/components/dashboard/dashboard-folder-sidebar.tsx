"use client";

import { FolderClosed } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { DashboardFolder } from "./types";

export function DashboardFolderSidebar({
  folders,
  selectedFolderId,
  onSelectFolder,
}: {
  folders: DashboardFolder[];
  selectedFolderId: string;
  onSelectFolder: (folderId: string) => void;
}) {
  const folderEntries = [...folders].sort((a, b) => {
    if (a.id === "unfiled") {
      return -1;
    }
    if (b.id === "unfiled") {
      return 1;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <Sidebar>
      <SidebarHeader>
        <p className="px-2 font-semibold text-sm tracking-tight">Folders</p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {folderEntries.map((folder) => (
                <SidebarMenuItem key={folder.id}>
                  <SidebarMenuButton
                    isActive={selectedFolderId === folder.id}
                    onClick={() => onSelectFolder(folder.id)}
                  >
                    <FolderClosed className="h-4 w-4" />
                    <span>{folder.name}</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>{folder.itemCount}</SidebarMenuBadge>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
