"use client";

import { api } from "@amiro/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Bell, FolderPlus, Users } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { DashboardCommandPalette } from "@/components/dashboard/dashboard-command-palette";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { NewFolderDialog } from "@/components/dashboard/new-folder-dialog";
import { ModeToggle } from "@/components/mode-toggle";
import { NotificationPanel } from "@/components/notifications/notification-panel";
import { Button } from "@/components/ui/button";

export function AppNav() {
  const { commandPalette } = useDashboard();
  const createFolder = useMutation(api.dashboard.createFolder);

  const unreadCountResponse = useQuery(api.notifications.getUnreadCount);
  const unreadCount = unreadCountResponse?.count ?? 0;

  return (
    <nav className="sticky top-0 z-40 border-foreground-muted/20 border-b bg-background/80 backdrop-blur-md">
      <div className="flex w-full items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <DashboardCommandPalette
          open={commandPalette.open}
          query={commandPalette.query}
          loading={commandPalette.loading}
          onQueryChange={commandPalette.setQuery}
          folders={commandPalette.folders}
          bookmarks={commandPalette.bookmarks}
          onClose={() => commandPalette.setOpen(false)}
          onOpen={() => commandPalette.setOpen(true)}
          onSelectFolder={commandPalette.onSelectFolder}
          onOpenBookmark={commandPalette.onOpenBookmark}
        />

        <div className="flex shrink-0 items-center gap-1">
          <NewFolderDialog
            onCreateFolder={async (input) => {
              await createFolder({
                name: input.name,
                icon: input.icon,
                visibility: input.visibility,
              });
              toast.success("Folder created");
            }}
            trigger={
              <Button size="sm" className="gap-1.5">
                <FolderPlus className="h-4 w-4" />
                <span className="hidden sm:inline">New folder</span>
                <span className="sm:hidden">Folder</span>
              </Button>
            }
          />

          <ModeToggle />

          <NotificationPanel
            trigger={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Notifications"
                className="relative"
              >
                <Bell className="h-[1.2rem] w-[1.2rem]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 font-medium text-[10px] text-destructive-foreground">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Button>
            }
          />
        </div>
      </div>
    </nav>
  );
}
