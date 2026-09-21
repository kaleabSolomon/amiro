"use client";

import { api } from "@amiro/backend/convex/_generated/api";
import type { Id } from "@amiro/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import {
  FolderInput,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
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
import { useDashboard } from "./dashboard-context";
import { FOLDER_ICONS } from "./new-folder-dialog";
import { ShareFolderDialog } from "./share-folder-dialog";
import type { DashboardFolder, FolderBookmarkDisposition } from "./types";

type Props = {
  folder: DashboardFolder;
};

export function FolderActionsMenu({ folder }: Props) {
  const updateFolder = useMutation(api.dashboard.updateFolder);
  const deleteFolder = useMutation(api.dashboard.deleteFolder);
  const { selectFolder } = useDashboard();
  const [shareOpen, setShareOpen] = useState(false);
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
      await updateFolder({
        folderId: folder.id as Id<"folders">,
        name: trimmedName,
        icon: icon.trim() || FOLDER_ICONS[0],
      });
      toast.success("Folder updated.");
      setRenameOpen(false);
    } catch (error) {
      // Keep the dialog open so the edit isn't lost.
      toast.error(
        error instanceof Error ? error.message : "Failed to update folder.",
      );
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
      const result = await deleteFolder({
        folderId: folder.id as Id<"folders">,
        bookmarks: disposition,
      });

      const plural = (count: number) =>
        count === 1 ? "bookmark" : "bookmarks";
      if (result.deletedBookmarks > 0) {
        toast.success(
          `Folder deleted, along with ${result.deletedBookmarks} ${plural(result.deletedBookmarks)}.`,
        );
      } else if (result.movedToUnfiled > 0) {
        toast.success(
          `Folder deleted. ${result.movedToUnfiled} ${plural(result.movedToUnfiled)} moved to Unfiled.`,
        );
      } else {
        toast.success("Folder deleted.");
      }

      setDeleteOpen(false);
      // The panel is showing a folder that no longer exists.
      selectFolder("unfiled");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete folder.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`More options for ${folder.name}`}
            />
          }
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom" className="w-52">
          <DropdownMenuItem
            disabled={folder.visibility !== "public"}
            title={
              folder.visibility === "public"
                ? undefined
                : "Make this folder public to share it"
            }
            onClick={() => setShareOpen(true)}
          >
            <Share2 className="h-4 w-4" />
            {folder.visibility === "public" ? "Share" : "Share (make public)"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
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

      <ShareFolderDialog
        folderId={folder.id as Id<"folders">}
        folderName={folder.name}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />

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
