"use client";

import { FolderClosed } from "lucide-react";

import { Input } from "@/components/ui/input";

import type { DashboardFolder, DashboardSearchBookmark } from "./types";

export function DashboardCommandPalette({
  open,
  query,
  loading,
  onQueryChange,
  folders,
  bookmarks,
  onClose,
  onSelectFolder,
  onOpenBookmark,
}: {
  open: boolean;
  query: string;
  loading: boolean;
  onQueryChange: (query: string) => void;
  folders: DashboardFolder[];
  bookmarks: DashboardSearchBookmark[];
  onClose: () => void;
  onSelectFolder: (folderId: string) => void;
  onOpenBookmark: (url: string) => void;
}) {
  if (!open) {
    return null;
  }

  const hasQuery = query.trim().length > 0;
  const hasResults = folders.length > 0 || bookmarks.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl rounded-xl border border-border bg-background shadow-xl">
        <div className="border-b p-3">
          <Input
            autoFocus
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search folders, tags, sources, links, and content..."
          />
        </div>
        <div className="max-h-[360px] overflow-y-auto p-2">
          {loading ? (
            <p className="px-2 py-8 text-center text-muted-foreground text-sm">
              Searching...
            </p>
          ) : !hasQuery ? (
            folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => onSelectFolder(folder.id)}
                className="mb-1.5 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left hover:bg-muted"
              >
                <span className="flex items-center gap-2">
                  <FolderClosed className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{folder.name}</span>
                </span>
                <span className="text-muted-foreground text-xs">
                  {folder.tags.join(" • ")}
                </span>
              </button>
            ))
          ) : !hasResults ? (
            <p className="px-2 py-8 text-center text-muted-foreground text-sm">
              No matching folders or bookmarks.
            </p>
          ) : (
            <>
              {folders.length > 0 ? (
                <>
                  <p className="mb-1 px-2 py-1 text-muted-foreground text-xs uppercase">
                    Folders
                  </p>
                  {folders.map((folder) => (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => onSelectFolder(folder.id)}
                      className="mb-1.5 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left hover:bg-muted"
                    >
                      <span className="flex items-center gap-2">
                        <FolderClosed className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{folder.name}</span>
                      </span>
                    </button>
                  ))}
                </>
              ) : null}

              {bookmarks.length > 0 ? (
                <>
                  <p className="mb-1 px-2 py-1 text-muted-foreground text-xs uppercase">
                    Bookmarks
                  </p>
                  {bookmarks.map((bookmark) => (
                    <button
                      key={bookmark.id}
                      type="button"
                      onClick={() => onOpenBookmark(bookmark.url)}
                      className="mb-1.5 w-full rounded-lg px-2.5 py-2 text-left hover:bg-muted"
                    >
                      <p className="line-clamp-1 text-sm">{bookmark.title}</p>
                      <p className="line-clamp-1 text-muted-foreground text-xs">
                        {bookmark.url}
                      </p>
                      <p className="line-clamp-1 text-[11px] text-muted-foreground">
                        {bookmark.folderName} • {bookmark.source} • #
                        {bookmark.tags.slice(0, 2).join(" #")}
                      </p>
                    </button>
                  ))}
                </>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
