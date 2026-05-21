"use client";

import { api } from "@amiro/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { Bell, FolderPlus, User } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { DashboardCommandPalette } from "@/components/dashboard/dashboard-command-palette";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { NewFolderDialog } from "@/components/dashboard/new-folder-dialog";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";

export function AppNav() {
  const { commandPalette } = useDashboard();
  const createFolder = useMutation(api.dashboard.createFolder);

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
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-md px-2 py-2 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground sm:px-3"
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">My profile</span>
          </Link>

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

          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-[1.2rem] w-[1.2rem]" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
