"use client";

import { ExternalLink, Hash, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { DashboardBreadcrumbs } from "./dashboard-breadcrumbs";
import { formatRelativeTime } from "./time";
import type { DashboardBookmark, DashboardFolder } from "./types";

export function DashboardMainPanel({
  selectedFolder,
  breadcrumbs,
  bookmarks,
  creatingFolder,
  onSelectFolder,
  onCreateFolder,
  onDeleteBookmark,
  onOpenSearch,
}: {
  selectedFolder: DashboardFolder;
  breadcrumbs: DashboardFolder[];
  bookmarks: DashboardBookmark[];
  creatingFolder: boolean;
  onSelectFolder: (folderId: string) => void;
  onCreateFolder: (name: string) => void;
  onDeleteBookmark: (bookmarkId: string) => Promise<void>;
  onOpenSearch: () => void;
}) {
  const [creatingMode, setCreatingMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [deletingBookmarkId, setDeletingBookmarkId] = useState<string | null>(
    null,
  );

  return (
    <div className="rounded-2xl border border-border/80 bg-card/70 p-5 shadow-xs backdrop-blur-sm">
      <div className="mb-5 min-w-[260px] flex-1">
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

      <DashboardBreadcrumbs
        folders={breadcrumbs}
        selectedFolderId={selectedFolder.id}
        onSelectFolder={onSelectFolder}
      />

      <header className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-semibold text-2xl tracking-tight">
            {selectedFolder.name}
          </h1>
          <Button
            type="button"
            size="sm"
            onClick={() => setCreatingMode((prev) => !prev)}
            disabled={creatingFolder}
          >
            <Plus className="h-4 w-4" />
            New folder
          </Button>
        </div>
        {creatingMode ? (
          <form
            className="mt-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!newFolderName.trim()) {
                return;
              }
              onCreateFolder(newFolderName.trim());
              setNewFolderName("");
              setCreatingMode(false);
            }}
          >
            <Input
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              placeholder="Folder name"
              className="h-9"
            />
            <Button type="submit" size="sm" disabled={creatingFolder}>
              Create
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setCreatingMode(false);
                setNewFolderName("");
              }}
            >
              Cancel
            </Button>
          </form>
        ) : null}
        <p className="mt-1 text-muted-foreground text-sm">
          {selectedFolder.itemCount} saved items • updated{" "}
          {formatRelativeTime(selectedFolder.updatedAtMs)}
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

      <div className="mt-8">
        <p className="mb-3 font-medium text-sm">Bookmarks</p>
        {bookmarks.length === 0 ? (
          <div className="rounded-xl border border-border border-dashed p-6 text-center text-muted-foreground text-sm">
            No bookmarks in this folder yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {bookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="rounded-xl border border-border/80 bg-background p-4 transition-colors hover:bg-muted"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noreferrer"
                    className="line-clamp-1 font-medium text-sm hover:underline"
                  >
                    {bookmark.title}
                  </a>
                  <div className="flex items-center gap-1">
                    <a href={bookmark.url} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      disabled={deletingBookmarkId === bookmark.id}
                      onClick={async () => {
                        setDeletingBookmarkId(bookmark.id);
                        try {
                          await onDeleteBookmark(bookmark.id);
                        } finally {
                          setDeletingBookmarkId((current) =>
                            current === bookmark.id ? null : current,
                          );
                        }
                      }}
                      aria-label="Delete bookmark"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                <p className="line-clamp-1 text-muted-foreground text-xs">
                  {bookmark.url}
                </p>
                {bookmark.text ? (
                  <p className="mt-2 line-clamp-2 text-muted-foreground text-xs">
                    {bookmark.text}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground uppercase">
                    {bookmark.source}
                  </span>
                  {bookmark.tags.slice(0, 5).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                {bookmark.childLinks.length > 0 ? (
                  <details className="mt-3 rounded-md border border-border/70 bg-muted/30 p-2 text-xs">
                    <summary className="cursor-pointer font-medium text-muted-foreground">
                      Links in post ({bookmark.childLinks.length})
                    </summary>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {bookmark.childLinks.map((link) => (
                        <div
                          key={link.url}
                          className="rounded-md border border-border/60 bg-background p-2"
                        >
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="line-clamp-1 text-primary hover:underline"
                          >
                            {link.title || link.url}
                          </a>
                          <p className="line-clamp-1 text-muted-foreground">
                            {link.url}
                          </p>
                          {link.siteName || link.description ? (
                            <p className="line-clamp-2 text-muted-foreground">
                              {[link.siteName, link.description]
                                .filter(Boolean)
                                .join(" • ")}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
