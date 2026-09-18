"use client";

import { FolderClosed, Search } from "lucide-react";
import { useEffect, useRef } from "react";

import { toDisplayTags } from "./tag-display";
import type { DashboardFolder, DashboardSearchBookmark } from "./types";

export function DashboardCommandPalette({
  open,
  query,
  loading,
  onQueryChange,
  folders,
  bookmarks,
  onClose,
  onOpen,
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
  onOpen: () => void;
  onSelectFolder: (folderId: string) => void;
  onOpenBookmark: (url: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (containerRef.current?.contains(target)) {
        return;
      }

      onClose();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open, onClose]);

  const hasQuery = query.trim().length > 0;
  const hasResults = folders.length > 0 || bookmarks.length > 0;
  const showDropdown = open && (hasQuery || folders.length > 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      {/* Static search button (visible when palette is closed) */}
      {!open ? (
        <button
          type="button"
          onClick={onOpen}
          className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-muted-foreground text-sm transition-colors hover:bg-muted"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="hidden flex-1 text-left sm:block">
            Search folders, bookmarks, tags...
          </span>
          <span className="flex-1 text-left sm:hidden">Search...</span>
          <kbd className="hidden items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground sm:inline-flex">
            ⌘K
          </kbd>
        </button>
      ) : null}

      {/* Active search input (visible when palette is open) */}
      {open ? (
        <div className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm ring-1 ring-ring">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search folders, bookmarks, tags..."
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground sm:inline-flex">
            esc
          </kbd>
        </div>
      ) : null}

      {/* Dropdown results */}
      {showDropdown ? (
        <div className="absolute top-full left-0 z-50 mt-1.5 w-full rounded-xl border border-border bg-background shadow-xl sm:min-w-[360px]">
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
                  className="mb-1 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left hover:bg-muted"
                >
                  <span className="flex items-center gap-2">
                    <FolderClosed className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{folder.name}</span>
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {folder.itemCount} items
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
                        className="mb-1 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left hover:bg-muted"
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
                    {bookmarks.map((bookmark) => {
                      const tagText = toDisplayTags(bookmark.tags)
                        .slice(0, 2)
                        .map((tag) => `#${tag.label}`)
                        .join(" ");
                      return (
                        <button
                          key={bookmark.id}
                          type="button"
                          onClick={() => onOpenBookmark(bookmark.url)}
                          className="mb-1 w-full rounded-lg px-2.5 py-2 text-left hover:bg-muted"
                        >
                          <p className="line-clamp-1 text-sm">
                            {bookmark.title}
                          </p>
                          <p className="line-clamp-1 text-muted-foreground text-xs">
                            {bookmark.url}
                          </p>
                          <p className="line-clamp-1 text-[11px] text-muted-foreground">
                            {bookmark.folderName} • {bookmark.source}
                            {tagText ? ` • ${tagText}` : ""}
                          </p>
                        </button>
                      );
                    })}
                  </>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
