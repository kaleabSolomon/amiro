"use client";

import { api } from "@amiro/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  Clock,
  FolderClosed,
  LogOut,
  Plus,
  Share,
  Sparkles,
  Users,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { NewFolderDialog } from "./new-folder-dialog";
import type { DashboardFolder } from "./types";

const WORKSPACE_FOLDER_SKELETONS = [
  "workspace-folder-skeleton-1",
  "workspace-folder-skeleton-2",
  "workspace-folder-skeleton-3",
  "workspace-folder-skeleton-4",
  "workspace-folder-skeleton-5",
];

function getInitials(name?: string | null) {
  if (!name) {
    return "U";
  }

  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "U";
}

export function DashboardFolderSidebar({
  folders,
  selectedFolderId,
  isLoading = false,
  loadingFallback,
  recentCount = 0,
  sharedCount = 0,
  creatingFolder = false,
  onSelectFolder: onSelectFolderProp,
  onCreateFolder,
}: {
  folders: DashboardFolder[];
  selectedFolderId: string;
  isLoading?: boolean;
  loadingFallback?: ReactNode;
  recentCount?: number;
  sharedCount?: number;
  creatingFolder?: boolean;
  onSelectFolder: (folderId: string) => void;
  onCreateFolder: (input: {
    name: string;
    icon: string;
    visibility: "private" | "public";
  }) => Promise<void>;
}) {
  const currentUser = useQuery(api.auth.getCurrentUser);
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();

  // On mobile the sidebar is an overlay sheet — dismiss it after picking a
  // folder so the bookmarks it reveals are actually visible.
  const onSelectFolder = (folderId: string) => {
    onSelectFolderProp(folderId);
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  const profileHref = currentUser?.username
    ? (`/profile/${currentUser.username}` as Route)
    : "/dashboard";
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
              {/* Desktop collapse control only — on mobile the sheet has its
                  own close button. */}
              <SidebarTrigger className="hidden md:inline-flex" />
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
                <SidebarMenuBadge>{recentCount}</SidebarMenuBadge>
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
                <SidebarMenuBadge>{sharedCount}</SidebarMenuBadge>
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarMenu>
              <SidebarMenuItem key="feed">
                <SidebarMenuButton
                  isActive={selectedFolderId === "feed"}
                  onClick={() => onSelectFolder("feed")}
                  tooltip="Feed"
                >
                  <Users className="h-4 w-4 text-sidebar-foreground/40" />
                  <span>Feed</span>
                </SidebarMenuButton>
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
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full cursor-pointer items-center gap-2 rounded-md p-2 text-left transition-colors hover:bg-sidebar-accent group-data-[collapsible=icon]:justify-center">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-linear-to-br from-[oklch(0.86_0.13_165)]/80 to-[oklch(0.65_0.18_320)]/70 font-semibold text-[oklch(0.2_0.04_165)] text-xs shadow-[0_1px_2px_oklch(0_0_0_/_0.4),0_8px_24px_-12px_oklch(0_0_0_/_0.5)]">
                {getInitials(currentUser?.name)}
              </div>
              <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                <div className="flex items-center gap-1 font-medium text-xs">
                  <span className="truncate">
                    {currentUser?.name ?? "Profile"}
                  </span>
                  <Sparkles className="h-3 w-3 shrink-0 text-primary" />
                </div>
                <div className="text-[11px] text-muted-foreground">
                  @{currentUser?.username ?? "user"}
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              sideOffset={8}
              className="w-48"
            >
              <DropdownMenuItem render={<Link href={profileHref} />}>
                <Sparkles className="h-4 w-4" />
                Open profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  authClient.signOut({
                    fetchOptions: {
                      onSuccess: () => router.push("/"),
                    },
                  });
                }}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
