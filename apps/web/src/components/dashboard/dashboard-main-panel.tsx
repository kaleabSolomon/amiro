"use client";

import { FolderClosed, Hash, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { DashboardBreadcrumbs } from "./dashboard-breadcrumbs";
import type { MockFolder } from "./mock-data";

export function DashboardMainPanel({
  selectedFolder,
  breadcrumbs,
  childFolders,
  onSelectFolder,
  onOpenSearch,
}: {
  selectedFolder: MockFolder;
  breadcrumbs: MockFolder[];
  childFolders: MockFolder[];
  onSelectFolder: (folderId: string) => void;
  onOpenSearch: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card/70 p-5 shadow-xs backdrop-blur-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
        </div>
        <div className="min-w-[260px] flex-1">
          <div className="relative">
            <Search className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
            <button
              type="button"
              onClick={onOpenSearch}
              className="absolute top-1.5 right-2 inline-flex items-center rounded-md border border-border bg-muted px-2 py-1 font-medium text-[11px] text-muted-foreground"
            >
              <span className="hidden sm:inline">Ctrl/Cmd</span>
              <span className="sm:hidden">⌘</span>
              <span className="ml-1">K</span>
            </button>
            <Input
              readOnly
              onClick={onOpenSearch}
              className="h-11 cursor-pointer border-border/80 bg-background pr-20 pl-9"
              placeholder="Search folders and tags..."
            />
          </div>
        </div>
      </div>

      <DashboardBreadcrumbs
        folders={breadcrumbs}
        selectedFolderId={selectedFolder.id}
        onSelectFolder={onSelectFolder}
      />

      <header className="mb-4">
        <h1 className="font-semibold text-2xl tracking-tight">
          {selectedFolder.name}
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {selectedFolder.itemCount} saved items • updated{" "}
          {selectedFolder.updatedAt}
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {selectedFolder.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-muted px-2.5 py-1 font-medium text-[11px] text-muted-foreground"
          >
            <Hash className="h-3 w-3" />
            {tag}
          </span>
        ))}
      </div>

      <div>
        <p className="mb-3 font-medium text-sm">Subfolders</p>
        {childFolders.length === 0 ? (
          <div className="rounded-xl border border-border border-dashed p-6 text-center text-muted-foreground text-sm">
            No subfolders in this folder yet.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {childFolders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => onSelectFolder(folder.id)}
                className="rounded-xl border border-border/80 bg-background p-4 text-left transition-colors hover:bg-muted"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-medium text-sm">{folder.name}</p>
                  <FolderClosed className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-xs">
                  {folder.itemCount} items • updated {folder.updatedAt}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {folder.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
