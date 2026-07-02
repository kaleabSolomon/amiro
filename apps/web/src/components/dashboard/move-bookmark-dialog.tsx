"use client";

import { type ReactElement, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { DashboardFolder } from "./types";

type Props = {
  trigger: ReactElement;
  /** From useDashboard() — already ordered as [Unfiled, ...real folders]. */
  folders: DashboardFolder[];
  /** "unfiled" or a folder id — preselected and blocked as a destination. */
  currentFolderId: string;
  /** Whether the bookmark is currently public (to warn about auto-downgrade). */
  bookmarkIsPublic: boolean;
  /** Receives "unfiled" or a folder id. */
  onMove: (destinationFolderId: string) => Promise<void>;
};

export function MoveBookmarkDialog({
  trigger,
  folders,
  currentFolderId,
  bookmarkIsPublic,
  onMove,
}: Props) {
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState(currentFolderId);
  const [moving, setMoving] = useState(false);

  const destinationFolder = useMemo(
    () => folders.find((folder) => folder.id === destination),
    [folders, destination],
  );

  const destinationIsPublic = destinationFolder?.visibility === "public";
  const willBecomePrivate = bookmarkIsPublic && !destinationIsPublic;
  const unchanged = destination === currentFolderId;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      // Reset the selection to the current folder each time the dialog opens.
      setDestination(currentFolderId);
    }
  }

  async function handleMove() {
    if (unchanged || moving) {
      return;
    }

    setMoving(true);
    try {
      await onMove(destination);
    } catch {
      return;
    } finally {
      setMoving(false);
    }

    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="border-border bg-popover sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl tracking-tight">
            Move bookmark
          </DialogTitle>
          <DialogDescription>Choose a destination folder.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Folder</Label>
            <Select
              value={destination}
              onValueChange={(value) =>
                setDestination(value ?? currentFolderId)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value) => {
                    const selected = folders.find(
                      (folder) => folder.id === value,
                    );
                    if (!selected) {
                      return null;
                    }
                    return (
                      <>
                        <span>{selected.icon ?? "📁"}</span>
                        {selected.name}
                      </>
                    );
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    <span className="mr-2">{folder.icon ?? "📁"}</span>
                    {folder.name}
                    {folder.id === currentFolderId ? " (current)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {willBecomePrivate ? (
            <p className="text-muted-foreground text-xs">
              This bookmark will become private — the destination is a private
              folder.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={moving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleMove}
            disabled={moving || unchanged}
          >
            {moving ? "Moving..." : "Move"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
