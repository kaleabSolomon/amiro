"use client";

import { Clock, FolderClosed, Plus, Share } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
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
  SidebarMenuSkeleton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import UserMenu from "../user-menu";
import { NewFolderDialog } from "./new-folder-dialog";
import type { DashboardFolder } from "./types";

const WORKSPACE_FOLDER_SKELETONS = [
  "workspace-folder-skeleton-1",
  "workspace-folder-skeleton-2",
  "workspace-folder-skeleton-3",
  "workspace-folder-skeleton-4",
  "workspace-folder-skeleton-5",
];

export function DashboardFolderSidebar({
  folders,
  selectedFolderId,
  isLoading = false,
  loadingFallback,
  creatingFolder = false,
  onSelectFolder,
  onCreateFolder,
}: {
  folders: DashboardFolder[];
  selectedFolderId: string;
  isLoading?: boolean;
  loadingFallback?: ReactNode;
  creatingFolder?: boolean;
  onSelectFolder: (folderId: string) => void;
  onCreateFolder: (input: {
    name: string;
    icon: string;
    visibility: "private" | "public";
  }) => Promise<void>;
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
          <div className="flex items-center justify-between pr-2">
            <SidebarGroupLabel>Folders</SidebarGroupLabel>
            <NewFolderDialog
              creating={creatingFolder}
              onCreateFolder={onCreateFolder}
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-sidebar-foreground/50 hover:text-sidebar-foreground group-data-[collapsible=icon]:hidden"
                  aria-label="Create folder"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              }
            />
          </div>
          <SidebarGroupContent>
            {isLoading ? (
              (loadingFallback ?? (
                <SidebarMenu>
                  {WORKSPACE_FOLDER_SKELETONS.map((skeletonId) => (
                    <SidebarMenuItem key={skeletonId}>
                      <SidebarMenuSkeleton showIcon />
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              ))
            ) : (
              <SidebarMenu>
                {folderEntries.map((folder) => (
                  <SidebarMenuItem key={folder.id}>
                    <SidebarMenuButton
                      isActive={selectedFolderId === folder.id}
                      onClick={() => onSelectFolder(folder.id)}
                      tooltip={folder.name}
                    >
                      {folder.icon ? (
                        <span className="flex h-4 w-4 items-center justify-center text-sm leading-none">
                          {folder.icon}
                        </span>
                      ) : (
                        <FolderClosed className="h-4 w-4" />
                      )}
                      <span>{folder.name}</span>
                    </SidebarMenuButton>
                    <SidebarMenuBadge>{folder.itemCount}</SidebarMenuBadge>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
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
