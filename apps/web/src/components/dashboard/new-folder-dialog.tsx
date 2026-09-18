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

export const FOLDER_ICONS = ["📁", "⭐", "💡", "📚", "🎨", "💼", "🔖", "🧠"];

type Props = {
  trigger: ReactElement;
  creating?: boolean;
  onCreateFolder: (input: {
    name: string;
    icon: string;
    visibility: "private" | "public";
  }) => Promise<void>;
};

export function NewFolderDialog({
  trigger,
  creating = false,
  onCreateFolder,
}: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(FOLDER_ICONS[0]);
  const [visibility, setVisibility] = useState<"private" | "public">("private");

  async function handleCreate() {
    const trimmedName = name.trim();
    const trimmedIcon = icon.trim() || FOLDER_ICONS[0];

    if (!trimmedName) {
      toast.error("Give your folder a name");
      return;
    }

    try {
      await onCreateFolder({
        name: trimmedName,
        icon: trimmedIcon,
        visibility,
      });
    } catch {
      return;
    }

    setOpen(false);
    setName("");
    setIcon(FOLDER_ICONS[0]);
    setVisibility("private");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="border-border bg-popover sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl tracking-tight">
            New folder
          </DialogTitle>
          <DialogDescription>
            Group bookmarks by topic, project, or vibe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="folder-name">Name</Label>
            <Input
              id="folder-name"
              placeholder="e.g. design inspo"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="folder-icon">Icon</Label>
            <div className="grid grid-cols-[3.5rem_1fr] gap-2">
              <Input
                id="folder-icon"
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
            Create folder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
