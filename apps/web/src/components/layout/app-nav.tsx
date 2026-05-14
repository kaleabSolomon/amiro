"use client";

import { Bell, Plus, Search, User } from "lucide-react";
import Link from "next/link";

import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";

function openCommandPalette() {
  window.dispatchEvent(
    new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }),
  );
}

export function AppNav() {
  return (
    <nav className="sticky top-0 z-40 border-foreground-muted/20 border-b bg-background/80 backdrop-blur-md">
      <div className="flex w-full items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <button
          type="button"
          onClick={openCommandPalette}
          className="flex w-full max-w-sm items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-muted-foreground text-sm transition-colors hover:bg-muted"
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

        <div className="flex shrink-0 items-center gap-1">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-md px-2 py-2 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground sm:px-3"
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">My profile</span>
          </Link>

          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New bookmark</span>
            <span className="sm:hidden">New</span>
          </Button>

          <ModeToggle />

          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-[1.2rem] w-[1.2rem]" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
