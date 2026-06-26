"use client";

import { api } from "@amiro/backend/convex/_generated/api";
import type { Id } from "@amiro/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Copy, Link2 } from "lucide-react";
import { type ReactElement, useEffect, useState } from "react";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  folderId: Id<"folders">;
  folderName: string;
  trigger: ReactElement;
};

export function ShareFolderDialog({ folderId, folderName, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [publicId, setPublicId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const createShare = useMutation(api.sharing.createShare);

  useEffect(() => {
    if (!open) return;
    if (publicId) return; // Already generated

    let mounted = true;
    async function generateShare() {
      setGenerating(true);
      try {
        const result = await createShare({
          resourceType: "folder",
          resourceId: folderId,
          visibility: "unlisted",
        });
        if (mounted) {
          setPublicId(result.publicId);
        }
      } catch (error) {
        if (mounted) {
          toast.error("Failed to generate share link.");
          setOpen(false);
        }
      } finally {
        if (mounted) {
          setGenerating(false);
        }
      }
    }

    void generateShare();

    return () => {
      mounted = false;
    };
  }, [open, folderId, publicId, createShare]);

  const shareUrl = publicId
    ? `${window.location.origin}/share/${publicId}`
    : "";

  function handleCopy() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied.");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="border-border bg-popover sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl tracking-tight">
            Share folder
          </DialogTitle>
          <DialogDescription>
            Anyone with this link can view the public bookmarks in this folder.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {generating ? (
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 w-[110px]" />
            </div>
          ) : publicId ? (
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={shareUrl}
                className="bg-muted font-mono text-muted-foreground text-xs"
              />
              <Button
                variant="outline"
                onClick={handleCopy}
                className="shrink-0 gap-1.5"
              >
                <Copy className="h-4 w-4" />
                Copy link
              </Button>
            </div>
          ) : (
            <div className="text-center text-muted-foreground text-sm">
              Generating link...
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
