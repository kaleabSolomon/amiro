"use client";

import { api } from "@amiro/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  Calendar,
  ChevronLeft,
  Eye,
  Globe,
  Laptop,
  Link2,
  LogOut,
  MapPin,
  Moon,
  Save,
  Settings,
  Share2,
  Smartphone,
  Star,
  Sun,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { use, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

function getInitials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "U";
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getLetterAvatar(url: string): string {
  const domain = getDomain(url);
  return domain.charAt(0).toUpperCase();
}

function getFakeStats(id: string): { views: number; stars: number } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const views = Math.abs(hash % 450) + 5;
  const stars = Math.abs((hash >> 8) % 80);
  return { views, stars };
}

export default function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // 1. Fetch public profile data
  const profileData = useQuery(api.profile.getProfileByUsername, {
    username,
  });

  // 2. Fetch owner-specific info if matching
  const currentUser = useQuery(api.auth.getCurrentUser);
  const sessions = useQuery(api.auth.getActiveSessions) ?? [];
  const connectedSources = useQuery(api.dashboard.getConnectedSources) ?? [];
  const telegramConnection = useQuery(
    api.dashboard.getTelegramConnectionStatus,
  );

  // Mutations
  const updateProfile = useMutation(api.auth.updateProfile);
  const createTelegramLinkToken = useMutation(
    api.dashboard.createTelegramLinkToken,
  );

  // Local state
  const [activeFolderFilter, setActiveFolderFilter] = useState<string | null>(
    null,
  );
  const [displayName, setDisplayName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [creatingTelegramToken, setCreatingTelegramToken] = useState(false);

  useEffect(() => {
    if (profileData?.isOwner && profileData.user.name) {
      setDisplayName(profileData.user.name);
    }
  }, [profileData?.isOwner, profileData?.user.name]);

  // Derived variables
  const isOwner = profileData?.isOwner ?? false;
  const profileUser = profileData?.user;
  const folders = profileData?.folders ?? [];
  const bookmarks = profileData?.bookmarks ?? [];

  const initials = useMemo(
    () => getInitials(profileUser?.name),
    [profileUser?.name],
  );

  const filteredBookmarks = useMemo(() => {
    if (!activeFolderFilter) return bookmarks;
    return bookmarks.filter((b) => b.folderId === activeFolderFilter);
  }, [bookmarks, activeFolderFilter]);

  if (profileData === undefined) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="animate-pulse font-medium text-muted-foreground text-sm">
          Loading profile...
        </div>
      </div>
    );
  }

  // Not Found State
  if (profileData === null) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-background bg-dots-faint px-4 text-center">
        <div className="card-elevated relative w-full max-w-md space-y-6 overflow-hidden bg-card/45 p-8 backdrop-blur-md sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-destructive/20 bg-destructive/10 text-destructive">
            <UserPlus className="h-6 w-6 rotate-45" />
          </div>
          <div className="space-y-2">
            <h1 className="font-medium font-serif text-3xl text-foreground">
              Profile Not Found
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              The user{" "}
              <span className="font-mono font-semibold text-foreground">
                @{username}
              </span>{" "}
              could not be found. Please check the spelling or URL and try
              again.
            </p>
          </div>
          <div className="pt-2">
            <Button
              className="w-full"
              onClick={() => router.push("/dashboard")}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({ name: displayName.trim() });
      toast.success("Profile updated.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile.",
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleConnectTelegram = async () => {
    setCreatingTelegramToken(true);
    try {
      const result = await createTelegramLinkToken({});
      if (result.deepLink) {
        window.open(result.deepLink, "_blank", "noopener,noreferrer");
      } else {
        toast.info(
          `Set TELEGRAM_BOT_USERNAME in backend env. Token: ${result.token}`,
        );
      }
      toast.success("Open Telegram to finish linking.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create Telegram link token.",
      );
    } finally {
      setCreatingTelegramToken(false);
    }
  };

  const handleShareProfile = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success("Profile link copied to clipboard!");
  };

  const handleSaveBookmark = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Bookmark URL copied to clipboard!");
  };

  // Mock joined date fallback
  const joinedDate = profileUser?.createdAt
    ? new Date(profileUser.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "March 2024";

  return (
    <div className="min-h-screen bg-background bg-dots-faint px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-12">
        {/* Navigation back if logged in */}
        {currentUser && (
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => router.push("/dashboard")}
            >
              <ChevronLeft className="h-4 w-4" />
              Dashboard
            </Button>
            {isOwner && (
              <span className="rounded-full border border-mint/25 bg-mint/10 px-3 py-1 font-medium text-mint text-xs">
                Viewing your own profile
              </span>
            )}
          </div>
        )}

        {/* ─── Profile Card ─── */}
        <section className="card-elevated relative space-y-6 overflow-hidden bg-card/45 p-6 backdrop-blur-md sm:space-y-8 sm:p-8">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              {/* Initials Avatar */}
              <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl border border-white/5 bg-linear-to-br from-primary to-secondary font-semibold text-4xl text-primary-foreground shadow-lg sm:h-28 sm:w-28">
                {initials}
              </div>
              <div className="space-y-2">
                <h1 className="font-medium font-serif text-3xl text-foreground tracking-tight sm:text-4xl">
                  {profileUser?.name}
                </h1>
                <p className="font-medium text-mint text-sm tracking-wide">
                  @{profileUser?.username}
                </p>
                <p className="max-w-xl text-muted-foreground text-sm leading-relaxed">
                  Design engineer collecting the good corners of the web. Mostly
                  interfaces, OKLCH, and weird tools.
                </p>

                {/* Meta details */}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 text-muted-foreground/80 text-xs">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    Berlin
                  </span>
                  <a
                    href="https://anya.studio"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 transition-colors hover:text-foreground"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    anya.studio
                  </a>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Joined {joinedDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex w-full gap-2 md:w-auto">
              <Button
                variant="outline"
                className="flex-1 gap-1.5 text-xs md:flex-none"
              >
                <UserPlus className="h-4 w-4" />
                Follow
              </Button>
              <Button
                onClick={handleShareProfile}
                className="flex-1 gap-1.5 bg-mint font-semibold text-mint-foreground text-xs hover:opacity-90 md:flex-none"
              >
                <Share2 className="h-4 w-4" />
                Share profile
              </Button>
            </div>
          </div>

          {/* Sub-stats Grid */}
          <div className="grid grid-cols-2 gap-4 border-border/30 border-t pt-4 sm:grid-cols-4">
            <div className="rounded-xl border border-border/30 bg-muted/15 p-4 text-center transition-all hover:bg-muted/25 sm:text-left">
              <p className="font-bold text-2xl text-foreground tracking-tight">
                1,284
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                Followers
              </p>
            </div>
            <div className="rounded-xl border border-border/30 bg-muted/15 p-4 text-center transition-all hover:bg-muted/25 sm:text-left">
              <p className="font-bold text-2xl text-foreground tracking-tight">
                162
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                Following
              </p>
            </div>
            <div className="rounded-xl border border-border/30 bg-muted/15 p-4 text-center transition-all hover:bg-muted/25 sm:text-left">
              <p className="font-bold text-2xl text-foreground tracking-tight">
                {bookmarks.length}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                Public Bookmarks
              </p>
            </div>
            <div className="rounded-xl border border-border/30 bg-muted/15 p-4 text-center transition-all hover:bg-muted/25 sm:text-left">
              <p className="font-bold text-2xl text-foreground tracking-tight">
                {folders.length}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                Public Folders
              </p>
            </div>
          </div>
        </section>

        {/* ─── Public Folders ─── */}
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="font-serif text-2xl text-foreground">
              Public folders
            </h2>
            <span className="font-medium text-muted-foreground text-xs">
              {folders.length} shared
            </span>
          </div>

          {folders.length === 0 ? (
            <div className="rounded-2xl border border-border/40 border-dashed bg-card/10 p-8 text-center text-muted-foreground text-sm">
              No public folders shared yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {folders.map((folder) => {
                const isActive = activeFolderFilter === folder.id;
                return (
                  <button
                    type="button"
                    key={folder.id}
                    onClick={() =>
                      setActiveFolderFilter(isActive ? null : folder.id)
                    }
                    className={`cursor-pointer rounded-2xl border p-5 text-left transition-all duration-300 ${
                      isActive
                        ? "scale-[1.02] border-mint bg-mint/5 shadow-md shadow-mint/5"
                        : "border-border/60 bg-card/30 hover:border-mint/40 hover:bg-card/45"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint/10 text-base text-mint leading-none">
                        {folder.icon}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-mint/20 bg-mint/5 px-2 py-0.5 text-[10px] text-mint">
                        <Globe className="h-2.5 w-2.5" />
                        public
                      </span>
                    </div>
                    <h3 className="mt-4 truncate font-semibold text-base text-foreground">
                      {folder.name}
                    </h3>
                    <p className="mt-1 text-muted-foreground text-xs">
                      {folder.itemCount} bookmarks
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ─── Public Bookmarks ─── */}
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="font-serif text-2xl text-foreground">
              Public bookmarks
            </h2>
            <span className="font-medium text-muted-foreground text-xs">
              {filteredBookmarks.length} visible · private items hidden
            </span>
          </div>

          {filteredBookmarks.length === 0 ? (
            <div className="rounded-2xl border border-border/40 border-dashed bg-card/10 p-8 text-center text-muted-foreground text-sm">
              {activeFolderFilter
                ? "No public bookmarks in this folder."
                : "No public bookmarks shared yet."}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookmarks.map((bookmark) => {
                const { views, stars } = getFakeStats(bookmark.id);
                const domain = getDomain(bookmark.url);
                const letter = getLetterAvatar(bookmark.url);

                return (
                  <div
                    key={bookmark.id}
                    className="group flex flex-col gap-4 rounded-2xl border border-border/40 bg-card/25 p-5 transition-all duration-300 hover:border-border/80 hover:bg-card/45 sm:flex-row"
                  >
                    {/* Circle initials icon */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground text-sm">
                      {letter}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={bookmark.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-base text-foreground transition-colors hover:text-primary"
                        >
                          {bookmark.title}
                        </a>
                        <Globe className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                        <span className="rounded border border-border/30 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {domain}
                        </span>
                      </div>

                      {bookmark.text ? (
                        <p className="line-clamp-2 text-muted-foreground/90 text-sm leading-relaxed">
                          {bookmark.text}
                        </p>
                      ) : null}

                      {/* Tags & Time */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {bookmark.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-0.5 rounded-full border border-border/50 bg-muted/65 px-2 py-0.5 font-medium text-[10px] text-muted-foreground"
                          >
                            # {tag}
                          </span>
                        ))}
                        <span className="font-mono text-[10px] text-muted-foreground/50">
                          {new Date(bookmark.capturedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex shrink-0 items-center justify-between gap-4 border-border/30 border-t pt-3 sm:flex-col sm:items-end sm:justify-start sm:border-t-0 sm:pt-0">
                      <div className="flex items-center gap-4 text-muted-foreground">
                        <span className="flex items-center gap-1 text-xs">
                          <Eye className="h-3.5 w-3.5" />
                          {views}
                        </span>
                        <span className="flex items-center gap-1 text-xs">
                          <Star className="h-3.5 w-3.5" />
                          {stars}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSaveBookmark(bookmark.url)}
                        className="text-xs transition-all hover:bg-mint/10 hover:text-mint"
                      >
                        Save →
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ─── Owner Controls Section (If viewing own profile) ─── */}
        {isOwner && (
          <section className="space-y-6 border-border/40 border-t pt-6">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-mint" />
              <h2 className="font-serif text-2xl text-foreground">
                Manage Integrations & Settings
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Left Side: Profile info & Theme */}
              <div className="space-y-6">
                {/* Profile Edit Panel */}
                <div className="space-y-4 rounded-2xl border border-border/40 bg-card/30 p-5">
                  <h3 className="border-border/20 border-b pb-2 font-semibold text-foreground text-sm">
                    Profile settings
                  </h3>
                  <div className="space-y-2">
                    <Label htmlFor="profile-name">Display Name</Label>
                    <Input
                      id="profile-name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-email">Email Address</Label>
                    <Input
                      id="profile-email"
                      value={profileUser?.email ?? ""}
                      disabled
                      className="bg-muted/30"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="mt-2 gap-1.5"
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                  >
                    <Save className="h-4 w-4" />
                    {savingProfile ? "Saving..." : "Save details"}
                  </Button>
                </div>

                {/* Appearance switcher */}
                <div className="space-y-3 rounded-2xl border border-border/40 bg-card/30 p-5">
                  <h3 className="border-border/20 border-b pb-2 font-semibold text-foreground text-sm">
                    Appearance
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("light")}
                    >
                      <Sun className="mr-1.5 h-4 w-4" />
                      Light
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("dark")}
                    >
                      <Moon className="mr-1.5 h-4 w-4" />
                      Dark
                    </Button>
                    <Button
                      variant={theme === "system" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("system")}
                    >
                      <Laptop className="mr-1.5 h-4 w-4" />
                      System
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Side: Connections & Active Sessions */}
              <div className="space-y-6">
                {/* Connected Apps */}
                <div className="space-y-4 rounded-2xl border border-border/40 bg-card/30 p-5">
                  <h3 className="border-border/20 border-b pb-2 font-semibold text-foreground text-sm">
                    Connected integrations
                  </h3>

                  {connectedSources.length === 0 ? (
                    <p className="text-muted-foreground text-xs">
                      No active extensions synced yet.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {connectedSources.map((source) => (
                        <span
                          key={source.source}
                          className="rounded-full border border-border bg-muted px-3 py-1 font-mono text-muted-foreground text-xs"
                        >
                          {source.source}: {source.count} synced
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2 rounded-xl border border-border/40 border-dashed bg-muted/10 p-3 text-xs">
                    {telegramConnection?.connected ? (
                      <p className="text-foreground">
                        Telegram linked as{" "}
                        <span className="font-semibold text-mint">
                          {telegramConnection.telegramUsername
                            ? `@${telegramConnection.telegramUsername}`
                            : `ID ${telegramConnection.telegramUserId}`}
                        </span>
                      </p>
                    ) : (
                      <p className="text-muted-foreground">
                        Telegram account is not linked.
                      </p>
                    )}
                    <Button
                      size="sm"
                      className="w-full text-xs"
                      onClick={handleConnectTelegram}
                      disabled={creatingTelegramToken}
                    >
                      {telegramConnection?.connected
                        ? "Relink Telegram bot"
                        : "Link Telegram bot"}
                    </Button>
                  </div>
                </div>

                {/* Active Sessions */}
                <div className="space-y-3 rounded-2xl border border-border/40 bg-card/30 p-5">
                  <h3 className="border-border/20 border-b pb-2 font-semibold text-foreground text-sm">
                    Logged-in devices ({sessions.length})
                  </h3>

                  <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/10 p-3 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5 truncate font-medium text-foreground">
                            {session.userAgent?.includes("Mobile") ? (
                              <Smartphone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            ) : (
                              <Laptop className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            )}
                            {session.userAgent || "Unknown device"}
                          </p>
                          <p className="mt-0.5 font-mono text-muted-foreground/80">
                            {session.ipAddress || "Unknown IP"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full gap-1.5 text-xs"
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
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out of all sessions
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
