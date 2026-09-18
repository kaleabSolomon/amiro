"use client";

import { FolderInput, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidebarMenuAction } from "@/components/ui/sidebar";
import { FOLDER_ICONS } from "./new-folder-dialog";
import type { DashboardFolder, FolderBookmarkDisposition } from "./types";

type Props = {
  folder: DashboardFolder;
  onRenameFolder: (input: {
    folderId: string;
    name: string;
    icon: string;
  }) => Promise<void>;
  onDeleteFolder: (input: {
    folderId: string;
    bookmarks: FolderBookmarkDisposition;
  }) => Promise<void>;
};

export function FolderActionsMenu({
  folder,
  onRenameFolder,
  onDeleteFolder,
}: Props) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(folder.name);
  const [icon, setIcon] = useState(folder.icon ?? FOLDER_ICONS[0]);
  const [disposition, setDisposition] =
    useState<FolderBookmarkDisposition>("move-to-unfiled");
  const [busy, setBusy] = useState(false);

  function openRename() {
    // Reset from the folder each time — the dialog stays mounted between opens,
    // so stale edits from a cancelled rename would otherwise persist.
    setName(folder.name);
    setIcon(folder.icon ?? FOLDER_ICONS[0]);
    setRenameOpen(true);
  }

  async function handleRename() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Give your folder a name");
      return;
    }

    setBusy(true);
    try {
      await onRenameFolder({
        folderId: folder.id,
        name: trimmedName,
        icon: icon.trim() || FOLDER_ICONS[0],
      });
      setRenameOpen(false);
    } catch {
      // The caller surfaces the error; keep the dialog open so the edit isn't lost.
    } finally {
      setBusy(false);
    }
  }

  function openDelete() {
    // Always reopen on the non-destructive choice, so a previous "delete them
    // too" can never be inherited by the next folder you open this on.
    setDisposition("move-to-unfiled");
    setDeleteOpen(true);
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await onDeleteFolder({ folderId: folder.id, bookmarks: disposition });
      setDeleteOpen(false);
    } catch {
      // Same as rename — the caller toasts, we just stay put.
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <SidebarMenuAction
              showOnHover
              aria-label={`Folder options for ${folder.name}`}
            />
          }
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="bottom" className="w-44">
          <DropdownMenuItem onClick={openRename}>
            <Pencil className="h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={openDelete}>
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="border-border bg-popover sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl tracking-tight">
              Rename folder
            </DialogTitle>
            <DialogDescription>
              Change the name or icon. Bookmarks inside stay put.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="rename-folder-name">Name</Label>
              <Input
                id="rename-folder-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleRename();
                  }
                }}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rename-folder-icon">Icon</Label>
              <div className="grid grid-cols-[3.5rem_1fr] gap-2">
                <Input
                  id="rename-folder-icon"
                  value={icon}
                  onChange={(event) => setIcon(event.target.value)}
                  maxLength={4}
                  className="text-center text-lg"
                  aria-label="Folder emoji"
                />
                <div className="grid grid-cols-8 gap-1">
                  {FOLDER_ICONS.map((folderIcon) => (
                    <button
                      key={folderIcon}
                      type="button"
                      onClick={() => setIcon(folderIcon)}
                      className="flex h-9 items-center justify-center rounded-md border border-border bg-background text-base transition-colors hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary/10"
                      aria-label={`Use ${folderIcon} icon`}
                      aria-pressed={icon === folderIcon}
                    >
                      {folderIcon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRenameOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleRename} disabled={busy}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-border bg-popover sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl tracking-tight">
              Delete &ldquo;{folder.name}&rdquo;?
            </DialogTitle>
            <DialogDescription>
              {folder.itemCount > 0
                ? `This folder holds ${folder.itemCount} ${
                    folder.itemCount === 1 ? "bookmark" : "bookmarks"
                  }. Choose what happens to ${
                    folder.itemCount === 1 ? "it" : "them"
                  }.`
                : "This folder is empty."}
            </DialogDescription>
          </DialogHeader>

          {folder.itemCount > 0 && (
            <div className="space-y-2 py-1">
              <button
                type="button"
                onClick={() => setDisposition("move-to-unfiled")}
                aria-pressed={disposition === "move-to-unfiled"}
                className="w-full rounded-lg border border-border bg-background p-3 text-left transition-colors hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary/10"
              >
                <span className="flex items-center gap-2 font-medium text-sm">
                  <FolderInput className="h-4 w-4" />
                  Keep the bookmarks
                </span>
                <span className="mt-1 block text-muted-foreground text-xs">
                  {folder.itemCount === 1 ? "It moves" : "They move"} to
                  Unfiled. Unfiled is private, so anything public here becomes
                  private again.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDisposition("delete")}
                aria-pressed={disposition === "delete"}
                className="w-full rounded-lg border border-border bg-background p-3 text-left transition-colors hover:bg-muted aria-pressed:border-destructive aria-pressed:bg-destructive/10"
              >
                <span className="flex items-center gap-2 font-medium text-sm">
                  <Trash2 className="h-4 w-4" />
                  Delete them too
                </span>
                <span className="mt-1 block text-muted-foreground text-xs">
                  Permanently removes{" "}
                  {folder.itemCount === 1
                    ? "the bookmark"
                    : `all ${folder.itemCount} bookmarks`}
                  . This can&apos;t be undone.
                </span>
              </button>
            </div>
          )}

          {folder.visibility === "public" && (
            <p className="text-muted-foreground text-sm">
              Existing share links to this folder stop working.
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={busy}
            >
              {disposition === "delete" && folder.itemCount > 0
                ? "Delete folder and bookmarks"
                : "Delete folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
