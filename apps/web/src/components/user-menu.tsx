"use client";

import { api } from "@amiro/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Monitor, Moon, Save, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

function getInitials(name?: string) {
  if (!name) {
    return "U";
  }

  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "U";
}

export default function UserMenu() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const user = useQuery(api.auth.getCurrentUser);
  const sessions = useQuery(api.auth.getActiveSessions) ?? [];
  const connectedSources = useQuery(api.dashboard.getConnectedSources) ?? [];
  const updateProfile = useMutation(api.auth.updateProfile);
  const [displayName, setDisplayName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setDisplayName(user?.name ?? "");
  }, [user?.name]);

  const initials = useMemo(() => getInitials(user?.name), [user?.name]);

  const onSaveProfile = async () => {
    if (!displayName.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }

    setSavingProfile(true);
    try {
      await updateProfile({ name: displayName.trim() });
      toast.success("Profile updated.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update profile.";
      toast.error(message);
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-full"
            aria-label="Open settings"
          />
        }
      >
        <span className="font-semibold text-xs">{initials}</span>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>
            Manage account, appearance, and connected sessions.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto px-4 pb-4">
          <section className="space-y-3 rounded-xl border p-3">
            <p className="font-medium text-sm">Profile</p>
            <div className="space-y-2">
              <Label htmlFor="settings-name">Name</Label>
              <Input
                id="settings-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-email">Email</Label>
              <Input id="settings-email" value={user?.email ?? ""} disabled />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={onSaveProfile}
              disabled={savingProfile}
            >
              <Save className="h-4 w-4" />
              Save profile
            </Button>
          </section>

          <section className="space-y-3 rounded-xl border p-3">
            <p className="font-medium text-sm">Theme</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("light")}
              >
                <Sun className="h-4 w-4" />
                Light
              </Button>
              <Button
                type="button"
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("dark")}
              >
                <Moon className="h-4 w-4" />
                Dark
              </Button>
              <Button
                type="button"
                variant={theme === "system" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("system")}
              >
                <Monitor className="h-4 w-4" />
                System
              </Button>
            </div>
          </section>

          <section className="space-y-3 rounded-xl border p-3">
            <p className="font-medium text-sm">Connected Apps</p>
            {connectedSources.length === 0 ? (
              <p className="text-muted-foreground text-xs">No sources yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {connectedSources.map((source) => (
                  <span
                    key={source.source}
                    className="rounded-md bg-muted px-2 py-1 text-xs"
                  >
                    {source.source} ({source.count})
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3 rounded-xl border p-3">
            <p className="font-medium text-sm">Connected Sessions</p>
            {sessions.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                No active sessions.
              </p>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-md border border-border/70 p-2 text-xs"
                  >
                    <p className="line-clamp-1">
                      {session.userAgent || "Unknown device"}
                    </p>
                    <p className="text-muted-foreground">
                      {session.ipAddress || "Unknown IP"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <SheetFooter>
          <Button
            variant="destructive"
            onClick={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    router.push("/dashboard");
                  },
                },
              });
            }}
          >
            Sign out
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
