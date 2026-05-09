"use client";

import { Clock, FolderClosed, Share } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import UserMenu from "../user-menu";
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
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="mt-4 flex w-full justify-between px-2 group-data-[collapsible=icon]:px-0">
              <span className="font-light font-serif text-2xl tracking-tight group-data-[collapsible=icon]:hidden">
                Amiro
              </span>
              <SidebarTrigger />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Quick Access</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem key="recent">
                <SidebarMenuButton
                  isActive={selectedFolderId === "recent"}
                  onClick={() => onSelectFolder("recent")}
                  tooltip="Recent"
                >
                  <Clock className="h-4 w-4 text-sidebar-foreground/40" />
                  <span>Recent</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>10</SidebarMenuBadge>
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarMenu>
              <SidebarMenuItem key="shared">
                <SidebarMenuButton
                  isActive={selectedFolderId === "shared"}
                  onClick={() => onSelectFolder("shared")}
                  tooltip="Shared"
                >
                  <Share className="h-4 w-4 text-sidebar-foreground/40" />
                  <span>Shared with me</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>10</SidebarMenuBadge>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {folderEntries.map((folder) => (
                <SidebarMenuItem key={folder.id}>
                  <SidebarMenuButton
                    isActive={selectedFolderId === folder.id}
                    onClick={() => onSelectFolder(folder.id)}
                    tooltip={folder.name}
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
      <SidebarFooter>
        <div className="border-sidebar-border border-t pt-2">
          <UserMenu />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
