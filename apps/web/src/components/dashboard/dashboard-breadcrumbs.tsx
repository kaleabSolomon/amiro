"use client";

import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

import type { DashboardFolder } from "./types";

export function DashboardBreadcrumbs({
  folders,
  selectedFolderId,
  onSelectFolder,
}: {
  folders: DashboardFolder[];
  selectedFolderId: string;
  onSelectFolder: (folderId: string) => void;
}) {
  return (
    <nav className="mb-5 flex items-center gap-1 overflow-x-auto text-sm">
      {folders.map((folder, index) => (
        <div key={folder.id} className="flex items-center gap-1">
          {index > 0 && (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <button
            type="button"
            onClick={() => onSelectFolder(folder.id)}
            className={cn(
              "rounded-md px-2 py-1",
              folder.id === selectedFolderId
                ? "bg-primary/12 font-medium text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {folder.name}
          </button>
        </div>
      ))}
    </nav>
  );
}
