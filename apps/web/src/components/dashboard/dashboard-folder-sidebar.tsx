"use client";

import { FolderClosed } from "lucide-react";
import { useMemo } from "react";
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
import type { MockFolder } from "./mock-data";

export function DashboardFolderSidebar({
  folders,
  selectedFolderId,
  onSelectFolder,
}: {
  folders: MockFolder[];
  selectedFolderId: string;
  onSelectFolder: (folderId: string) => void;
}) {
  const folderMap = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder])),
    [folders],
  );

  const folderEntries = useMemo(() => {
    const getDepth = (folder: MockFolder) => {
      let depth = 0;
      let currentParentId = folder.parentId;

      while (currentParentId) {
        const parent = folderMap.get(currentParentId);
        if (!parent) {
          break;
        }

        depth += 1;
        currentParentId = parent.parentId;
      }

      return depth;
    };

    return [...folders]
      .sort((a, b) => {
        if (a.parentId === b.parentId) {
          return a.name.localeCompare(b.name);
        }

        return a.parentId ? 1 : -1;
      })
      .map((folder) => ({ folder, depth: getDepth(folder) }));
  }, [folderMap, folders]);

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
              {folderEntries.map(({ folder, depth }) => (
                <SidebarMenuItem key={folder.id}>
                  <SidebarMenuButton
                    isActive={selectedFolderId === folder.id}
                    onClick={() => onSelectFolder(folder.id)}
                    style={{ paddingLeft: `${8 + depth * 14}px` }}
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
