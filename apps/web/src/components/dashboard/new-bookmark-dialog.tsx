"use client";

import { type ReactElement, useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  trigger: ReactElement;
  creating?: boolean;
  onCreateBookmark: (input: {
    url: string;
    visibility: "private" | "public";
  }) => Promise<void>;
};

export function NewBookmarkDialog({
  trigger,
  creating = false,
  onCreateBookmark,
}: Props) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");

  async function handleCreate() {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      toast.error("Please enter a URL");
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      toast.error("Please enter a valid URL (e.g. https://google.com)");
      return;
    }

    try {
      await onCreateBookmark({
        url: trimmedUrl,
        visibility,
      });
    } catch {
      return;
    }

    setOpen(false);
    setUrl("");
    setVisibility("private");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="border-border bg-popover sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl tracking-tight">
            New bookmark
          </DialogTitle>
          <DialogDescription>Save a link to your workspace.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="bookmark-url">URL</Label>
            <Input
              id="bookmark-url"
              placeholder="https://example.com"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Visibility</Label>
            <Select
              value={visibility}
              onValueChange={(value) =>
                setVisibility(value as "private" | "public")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private - only you</SelectItem>
                <SelectItem value="public">
                  Public - anyone with the link
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleCreate} disabled={creating}>
            {creating ? "Saving..." : "Save bookmark"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
