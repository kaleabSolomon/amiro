"use client";

import { api } from "@amiro/backend/convex/_generated/api";
import type { Id } from "@amiro/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  Bookmark as BookmarkIcon,
  Calendar,
  ExternalLink,
  Globe2,
  Link2,
  Lock,
  LogOut,
  Monitor,
  Moon,
  Save,
  Star,
  Sun,
  UserMinus,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { use, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  tagFacetClass,
  toDisplayTags,
} from "@/components/dashboard/tag-display";
import { formatRelativeTime } from "@/components/dashboard/time";
import { Footer } from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type ProfileFolder = {
  id: string;
  name: string;
  icon?: string;
  visibility: "private" | "public";
  itemCount: number;
};

type ProfileBookmark = {
  id: string;
  url: string;
  title: string;
  text: string;
  tags: string[];
  capturedAt: number;
  lastSyncedAt: number;
  folderId: string | null;
  folderName: string;
  folderIcon: string;
  folderVisibility?: "private" | "public";
  visibility: "private" | "public";
  source: "chrome" | "telegram" | "instagram" | "twitter";
  totalSaves?: number;
  totalStars?: number;
  viewerHasStarred?: boolean;
};

type Session = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: number;
  expiresAt: number;
};

type ConnectedSource = {
  source: string;
  count: number;
};

type ProfileTab = "profile" | "settings";

function getInitials(name?: string | null) {
  if (!name) {
    return "U";
  }

  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "U";
}

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getLetterAvatar(url: string) {
  return getDomain(url).charAt(0).toUpperCase();
}

function formatJoinedDate(timestamp?: number) {
  if (!timestamp) {
    return "Recently";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(new Date(timestamp));
}

function formatSessionDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export default function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const profileData = useQuery(api.profile.getProfileByUsername, { username });
  const currentUser = useQuery(api.auth.getCurrentUser);
  const sessions = (useQuery(api.auth.getActiveSessions) ?? []) as Session[];
  const connectedSources = (useQuery(api.dashboard.getConnectedSources) ??
    []) as ConnectedSource[];
  const telegramConnection = useQuery(
    api.dashboard.getTelegramConnectionStatus,
  );

  const updateProfile = useMutation(api.auth.updateProfile);
  const createTelegramLinkToken = useMutation(
    api.dashboard.createTelegramLinkToken,
  );
  const toggleBookmarkStar = useMutation(api.sharing.toggleBookmarkStar);
  const savePublicBookmark = useMutation(api.sharing.savePublicBookmark);
  const createShare = useMutation(api.sharing.createShare);

  const [activeFolderFilter, setActiveFolderFilter] = useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");
  const [displayName, setDisplayName] = useState("");
  const [usernameValue, setUsernameValue] = useState("");
  const [bioValue, setBioValue] = useState("");
  const [usernameAvailability, setUsernameAvailability] = useState<{
    status: "idle" | "checking" | "available" | "taken" | "invalid";
    message: string | null;
  }>({ status: "idle", message: null });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingBookmarkId, setSavingBookmarkId] = useState<string | null>(null);
  const [sharingFolderId, setSharingFolderId] = useState<string | null>(null);
  const [creatingTelegramToken, setCreatingTelegramToken] = useState(false);

  const isOwner = profileData?.isOwner ?? false;
  const profileUser = profileData?.user;
  const folders = (profileData?.folders ?? []) as ProfileFolder[];
  const bookmarks = (profileData?.bookmarks ?? []) as ProfileBookmark[];
  const canUseAuthenticatedActions = Boolean(currentUser);

  // Following (subscription) — no counts vanity; just the button + utility count.
  const followUser = useMutation(api.follows.followUser);
  const unfollowUser = useMutation(api.follows.unfollowUser);
  const followState = useQuery(
    api.follows.isFollowing,
    profileUser?.id && !isOwner ? { userId: profileUser.id } : "skip",
  );
  const followingCountData = useQuery(
    api.follows.getFollowingCount,
    profileUser?.id ? { userId: profileUser.id } : "skip",
  );
  const [optimisticFollowing, setOptimisticFollowing] = useState<
    boolean | null
  >(null);
  const [followPending, setFollowPending] = useState(false);
  const isFollowing = optimisticFollowing ?? followState?.following ?? false;
  const followingCount = followingCountData?.count ?? 0;

  async function handleToggleFollow() {
    if (!profileUser?.id) {
      return;
    }
    if (!canUseAuthenticatedActions) {
      router.push("/auth");
      return;
    }

    const next = !isFollowing;
    setOptimisticFollowing(next);
    setFollowPending(true);
    try {
      if (next) {
        await followUser({ followeeId: profileUser.id });
      } else {
        await unfollowUser({ followeeId: profileUser.id });
      }
    } catch (error) {
      setOptimisticFollowing(!next); // revert
      toast.error(
        error instanceof Error ? error.message : "Could not update follow.",
      );
    } finally {
      setFollowPending(false);
    }
  }

  useEffect(() => {
    if (profileUser?.name) setDisplayName(profileUser.name);
    if (profileUser?.username) setUsernameValue(profileUser.username);
    if (profileUser?.bio) setBioValue(profileUser.bio);
  }, [profileUser?.name, profileUser?.username, profileUser?.bio]);

  useEffect(() => {
    const normalizedUsername = usernameValue.trim();

    if (normalizedUsername === profileUser?.username) {
      setUsernameAvailability({ status: "idle", message: null });
      return;
    }

    if (!normalizedUsername || normalizedUsername.length < 3) {
      setUsernameAvailability({ status: "idle", message: null });
      return;
    }

    setUsernameAvailability({
      status: "checking",
      message: "Checking username availability...",
    });

    let isCancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        const result = await authClient.isUsernameAvailable({
          username: normalizedUsername,
        });

        if (isCancelled) return;

        if (result.data?.available) {
          setUsernameAvailability({
            status: "available",
            message: "Username is available.",
          });
        } else {
          setUsernameAvailability({
            status: "taken",
            message: "That username is already taken.",
          });
        }
      } catch (error) {
        if (isCancelled) return;
        setUsernameAvailability({
          status: "invalid",
          message:
            error instanceof Error ? error.message : "Could not validate.",
        });
      }
    }, 450);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [usernameValue, profileUser?.username]);

  useEffect(() => {
    if (!isOwner && activeTab === "settings") {
      setActiveTab("profile");
    }
  }, [activeTab, isOwner]);

  const initials = useMemo(
    () => getInitials(profileUser?.name),
    [profileUser?.name],
  );

  const filteredBookmarks = useMemo(() => {
    const next = activeFolderFilter
      ? bookmarks.filter((bookmark) => bookmark.folderId === activeFolderFilter)
      : bookmarks;

    return [...next].sort((a, b) => b.lastSyncedAt - a.lastSyncedAt);
  }, [bookmarks, activeFolderFilter]);

  const publicFolders = folders.filter(
    (folder) => folder.visibility === "public",
  );
  const publicBookmarks = bookmarks.filter(
    (bookmark) => bookmark.visibility === "public",
  );

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }

    if (
      usernameAvailability.status === "checking" ||
      usernameAvailability.status === "taken" ||
      usernameAvailability.status === "invalid"
    ) {
      toast.error("Please choose a valid and available username.");
      return;
    }

    setSavingProfile(true);
    try {
      if (usernameValue.trim() !== profileUser?.username) {
        const result = await authClient.updateUser({
          username: usernameValue.trim(),
        });
        if (result.error) {
          throw new Error(result.error.message || "Failed to update username.");
        }
      }

      await updateProfile({
        name: displayName.trim(),
        bio: bioValue.trim(),
      });

      toast.success("Profile updated.");

      if (
        usernameValue.trim() !== profileUser?.username &&
        usernameValue.trim()
      ) {
        router.push(`/profile/${usernameValue.trim()}`);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update profile.";
      toast.error(message);
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
      const message =
        error instanceof Error
          ? error.message
          : "Failed to create Telegram link token.";
      toast.error(message);
    } finally {
      setCreatingTelegramToken(false);
    }
  };

  const handleShareProfile = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast.success("Profile link copied.");
  };

  const handleShareFolder = async (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    setSharingFolderId(folderId);
    try {
      const result = await createShare({
        resourceType: "folder",
        resourceId: folderId,
        visibility: "unlisted",
      });
      const url = `${window.location.origin}/share/${result.publicId}`;
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create share link.",
      );
    } finally {
      setSharingFolderId((cur) => (cur === folderId ? null : cur));
    }
  };

  const handleToggleStar = async (bookmarkId: string) => {
    if (!canUseAuthenticatedActions) {
      toast.error("Sign in to star bookmarks.");
      return;
    }

    try {
      await toggleBookmarkStar({
        bookmarkId: bookmarkId as Id<"syncedBookmarks">,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update star.";
      toast.error(message);
    }
  };

  const handleSaveBookmark = async (bookmarkId: string) => {
    if (!canUseAuthenticatedActions || isOwner) {
      return;
    }

    setSavingBookmarkId(bookmarkId);
    try {
      const result = await savePublicBookmark({
        bookmarkId: bookmarkId as Id<"syncedBookmarks">,
      });
      toast.success(
        result.attributed
          ? "Bookmark saved to Unfiled."
          : "Bookmark already saved.",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save bookmark.";
      toast.error(message);
    } finally {
      setSavingBookmarkId((current) =>
        current === bookmarkId ? null : current,
      );
    }
  };

  if (profileData === undefined) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading profile...</div>
      </div>
    );
  }

  if (profileData === null) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background px-4">
        <section className="w-full max-w-md rounded-xl border border-border/60 bg-card/50 p-8 text-center shadow-sm">
          <h1 className="font-serif text-3xl text-foreground">
            Profile not found
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            No Amiro profile exists for @{username}.
          </p>
          <Button className="mt-6" onClick={() => router.push("/dashboard")}>
            Dashboard
          </Button>
        </section>
      </main>
    );
  }

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <ProfileNav currentUser={currentUser ?? null} />

      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl space-y-8">
          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="bg-[radial-gradient(circle_at_20%_0%,oklch(0.62_0.13_165_/_0.08),transparent_40%),radial-gradient(circle_at_80%_10%,oklch(0.58_0.11_280_/_0.06),transparent_35%)] p-6 sm:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-[oklch(0.86_0.13_165)]/80 to-[oklch(0.65_0.18_320)]/70 font-serif text-3xl text-[oklch(0.2_0.04_165)] shadow-[0_1px_2px_oklch(0_0_0_/_0.4),0_8px_24px_-12px_oklch(0_0_0_/_0.5)]">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <h1 className="font-serif text-4xl tracking-normal sm:text-5xl">
                      {profileUser?.name}
                    </h1>
                    <p className="mt-1 font-mono text-muted-foreground text-sm">
                      @{profileUser?.username}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 md:pt-8">
                  {!isOwner ? (
                    <Button
                      type="button"
                      variant={isFollowing ? "secondary" : "default"}
                      size="sm"
                      onClick={handleToggleFollow}
                      disabled={followPending || followState === undefined}
                    >
                      {isFollowing ? (
                        <>
                          <UserMinus className="h-4 w-4" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          Follow
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => router.push("/dashboard")}
                    >
                      Dashboard
                    </Button>
                  )}
                  <Button type="button" size="sm" onClick={handleShareProfile}>
                    <Link2 className="h-4 w-4" />
                    Share profile
                  </Button>
                </div>
              </div>

              <p className="mt-6 max-w-3xl whitespace-pre-wrap text-foreground/90 text-sm leading-6">
                {profileUser?.bio
                  ? profileUser.bio
                  : isOwner
                    ? "This is your public Amiro profile. Public folders and public bookmarks are visible to other people."
                    : `${profileUser?.name} is collecting and sharing public bookmarks on Amiro.`}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-4 text-muted-foreground text-xs">
                <span className="inline-flex items-center gap-1.5">
                  <Globe2 className="h-3.5 w-3.5" />
                  Amiro profile
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Joined {formatJoinedDate(profileUser?.createdAt)}
                </span>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <StatTile label="Following" value={followingCount} />
                <StatTile
                  label="Public bookmarks"
                  value={publicBookmarks.length}
                />
                <StatTile label="Public folders" value={publicFolders.length} />
              </div>
            </div>
          </section>

          {isOwner ? (
            <div className="flex w-fit items-center rounded-xl border border-border/60 bg-card/50 p-1 shadow-sm">
              <ProfileTabButton
                active={activeTab === "profile"}
                onClick={() => setActiveTab("profile")}
              >
                Public profile
              </ProfileTabButton>
              <ProfileTabButton
                active={activeTab === "settings"}
                onClick={() => setActiveTab("settings")}
              >
                Settings
              </ProfileTabButton>
            </div>
          ) : null}

          {activeTab === "profile" ? (
            <div className="space-y-8">
              <section className="space-y-4">
                <SectionHeading
                  title={isOwner ? "Folders" : "Public folders"}
                  meta={`${folders.length} shared`}
                />
                {folders.length === 0 ? (
                  <EmptyPanel text="No public folders shared yet." />
                ) : (
                  <div className="grid gap-3 md:grid-cols-3">
                    {folders.map((folder) => {
                      const active = activeFolderFilter === folder.id;
                      return (
                        // biome-ignore lint/a11y/useSemanticElements: Needs to be a div because it contains a nested button
                        <div
                          key={folder.id}
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            setActiveFolderFilter(active ? null : folder.id)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setActiveFolderFilter(active ? null : folder.id);
                            }
                          }}
                          className={cn(
                            "group relative cursor-pointer rounded-xl border bg-card/50 p-5 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            active
                              ? "border-mint bg-mint/5"
                              : "border-border/60",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="grid h-9 w-9 place-items-center rounded-md bg-mint/10 text-mint">
                              {folder.icon ?? "F"}
                            </span>
                            <div className="flex items-center gap-2">
                              {isOwner && folder.visibility === "public" ? (
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleShareFolder(e, folder.id)
                                  }
                                  disabled={sharingFolderId === folder.id}
                                  className="z-10 rounded p-1 text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 group-hover:opacity-100"
                                  aria-label="Copy share link"
                                  title="Copy share link"
                                >
                                  <Link2 className="h-3.5 w-3.5" />
                                </button>
                              ) : null}
                              <VisibilityPill visibility={folder.visibility} />
                            </div>
                          </div>
                          <h2 className="mt-5 line-clamp-1 font-serif text-xl">
                            {folder.name}
                          </h2>
                          <p className="mt-1 text-muted-foreground text-sm">
                            {folder.itemCount} bookmarks
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="space-y-4">
                <SectionHeading
                  title={isOwner ? "Bookmarks" : "Public bookmarks"}
                  meta={`${filteredBookmarks.length} visible`}
                />
                {filteredBookmarks.length === 0 ? (
                  <EmptyPanel
                    text={
                      activeFolderFilter
                        ? "No visible bookmarks in this folder."
                        : "No public bookmarks shared yet."
                    }
                  />
                ) : (
                  <div className="overflow-hidden rounded-xl border border-border/60 bg-card/50">
                    <div className="divide-y divide-border/40">
                      {filteredBookmarks.map((bookmark) => (
                        <BookmarkRow
                          key={bookmark.id}
                          bookmark={bookmark}
                          canUseAuthenticatedActions={
                            canUseAuthenticatedActions
                          }
                          canSave={!isOwner && canUseAuthenticatedActions}
                          isSaving={savingBookmarkId === bookmark.id}
                          onSave={() => handleSaveBookmark(bookmark.id)}
                          onToggleStar={() => handleToggleStar(bookmark.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>
          ) : null}

          {isOwner && activeTab === "settings" ? (
            <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
              <div className="space-y-4">
                <SectionHeading title="Profile settings" meta="Owner only" />
                <SettingsCard>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="profile-name">Name</Label>
                      <Input
                        id="profile-name"
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="profile-username">Username</Label>
                      <Input
                        id="profile-username"
                        value={usernameValue}
                        onChange={(event) =>
                          setUsernameValue(event.target.value)
                        }
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                      {usernameAvailability.message ? (
                        <p
                          className={cn(
                            "font-medium text-[11px]",
                            usernameAvailability.status === "available"
                              ? "text-primary"
                              : usernameAvailability.status === "checking"
                                ? "text-muted-foreground"
                                : "text-destructive",
                          )}
                        >
                          {usernameAvailability.message}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="profile-bio">Bio</Label>
                      <textarea
                        id="profile-bio"
                        value={bioValue}
                        onChange={(event) => setBioValue(event.target.value)}
                        placeholder="A short bio..."
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-1.5 pt-2">
                      <Label htmlFor="profile-email">Email</Label>
                      <Input
                        id="profile-email"
                        value={profileUser?.email ?? ""}
                        disabled
                      />
                    </div>
                    <div className="pt-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                      >
                        <Save className="h-4 w-4" />
                        {savingProfile ? "Saving..." : "Save profile"}
                      </Button>
                    </div>
                  </div>
                </SettingsCard>

                <SettingsCard>
                  <p className="mb-3 font-medium text-sm">Theme</p>
                  <div className="flex flex-wrap gap-2">
                    <ThemeButton
                      active={theme === "light"}
                      onClick={() => setTheme("light")}
                      icon={Sun}
                      label="Light"
                    />
                    <ThemeButton
                      active={theme === "dark"}
                      onClick={() => setTheme("dark")}
                      icon={Moon}
                      label="Dark"
                    />
                    <ThemeButton
                      active={theme === "system"}
                      onClick={() => setTheme("system")}
                      icon={Monitor}
                      label="System"
                    />
                  </div>
                </SettingsCard>
              </div>

              <div className="space-y-4">
                <SectionHeading title="Connections" meta="Apps and sessions" />
                <div className="grid gap-4 md:grid-cols-2">
                  <SettingsCard>
                    <p className="font-medium text-sm">Connected apps</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {connectedSources.length === 0 ? (
                        <p className="text-muted-foreground text-xs">
                          No sources yet.
                        </p>
                      ) : (
                        connectedSources.map((source) => (
                          <span
                            key={source.source}
                            className="rounded-md bg-muted px-2 py-1 text-xs"
                          >
                            {source.source} ({source.count})
                          </span>
                        ))
                      )}
                    </div>
                    <div className="mt-4 rounded-md border border-border border-dashed p-3 text-xs">
                      {telegramConnection?.connected ? (
                        <p>
                          Telegram linked as{" "}
                          <span className="font-medium">
                            {telegramConnection.telegramUsername
                              ? `@${telegramConnection.telegramUsername}`
                              : `ID ${telegramConnection.telegramUserId}`}
                          </span>
                        </p>
                      ) : (
                        <p className="text-muted-foreground">
                          Telegram not linked.
                        </p>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        className="mt-3"
                        onClick={handleConnectTelegram}
                        disabled={creatingTelegramToken}
                      >
                        {telegramConnection?.connected
                          ? "Relink Telegram"
                          : "Connect Telegram"}
                      </Button>
                    </div>
                  </SettingsCard>

                  <SettingsCard>
                    <p className="font-medium text-sm">Connected sessions</p>
                    <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                      {sessions.length === 0 ? (
                        <p className="text-muted-foreground text-xs">
                          No active sessions.
                        </p>
                      ) : (
                        sessions.map((session) => (
                          <div
                            key={session.id}
                            className="rounded-md border border-border/70 p-3 text-xs"
                          >
                            <p className="line-clamp-1">
                              {session.userAgent || "Unknown device"}
                            </p>
                            <p className="mt-1 text-muted-foreground">
                              {session.ipAddress || "Unknown IP"} | active since{" "}
                              {formatSessionDate(session.createdAt)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </SettingsCard>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      authClient.signOut({
                        fetchOptions: {
                          onSuccess: () => router.push("/dashboard"),
                        },
                      });
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </Button>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function ProfileNav({
  currentUser,
}: {
  currentUser: { username?: string | null } | null;
}) {
  const router = useRouter();
  const dashboardHref = currentUser ? "/dashboard" : "/";

  return (
    <nav className="sticky top-0 z-40 border-border/60 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href={dashboardHref}
          className="font-serif text-foreground text-lg transition-opacity hover:opacity-80"
        >
          Amiro
        </Link>

        <div className="flex items-center gap-2">
          {currentUser ? (
            <span className="text-muted-foreground text-sm">
              Viewing public profile
            </span>
          ) : (
            <>
              <span className="hidden text-muted-foreground text-sm sm:inline">
                Viewing public profile
              </span>
              <Button size="sm" onClick={() => router.push("/auth")}>
                Sign in
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function ProfileTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-1.5 font-medium text-xs transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function SectionHeading({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="font-serif text-2xl tracking-normal">{title}</h2>
      {meta ? <p className="text-muted-foreground text-xs">{meta}</p> : null}
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-border border-dashed bg-card/40 p-8 text-center text-muted-foreground text-sm">
      {text}
    </div>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-5 transition-colors hover:bg-muted/30">
      {children}
    </div>
  );
}

function StatTile({
  label,
  value,
}: {
  label: number | string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/40 p-4">
      <p className="font-serif text-2xl">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
        {label}
      </p>
    </div>
  );
}

function VisibilityPill({ visibility }: { visibility: "private" | "public" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
        visibility === "public"
          ? "border-mint/30 bg-mint/10 text-mint"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      <Globe2 className="h-3 w-3" />
      {visibility}
    </span>
  );
}

function BookmarkRow({
  bookmark,
  canUseAuthenticatedActions,
  canSave,
  isSaving,
  onSave,
  onToggleStar,
}: {
  bookmark: ProfileBookmark;
  canUseAuthenticatedActions: boolean;
  canSave: boolean;
  isSaving: boolean;
  onSave: () => void;
  onToggleStar: () => void;
}) {
  const domain = getDomain(bookmark.url);
  const letter = getLetterAvatar(bookmark.url);
  const totalSaves = bookmark.totalSaves ?? 0;
  const totalStars = bookmark.totalStars ?? 0;
  const viewerHasStarred = bookmark.viewerHasStarred ?? false;
  const canStarBookmark =
    canUseAuthenticatedActions &&
    bookmark.visibility === "public" &&
    bookmark.folderVisibility === "public";

  return (
    <article className="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/50">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground text-sm">
        {letter}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <a
            href={bookmark.url}
            target="_blank"
            rel="noreferrer"
            className="line-clamp-1 font-semibold text-foreground text-sm transition-colors hover:text-primary"
          >
            {bookmark.title}
          </a>
          <span className="font-bold text-muted-foreground/60 text-xs">
            &middot;
          </span>
          <span className="flex shrink-0 items-center gap-1 text-muted-foreground text-xs">
            <span>{bookmark.folderIcon}</span>
            {bookmark.folderName}
          </span>
          {bookmark.visibility === "public" ? (
            <Globe2 className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          ) : (
            <Lock className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          )}
        </div>

        <p className="mt-0.5 font-mono text-muted-foreground text-xs">
          {domain}
        </p>

        {bookmark.text ? (
          <p className="mt-1.5 line-clamp-1 text-muted-foreground/80 text-sm">
            {bookmark.text}
          </p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {toDisplayTags(bookmark.tags)
            .slice(0, 4)
            .map((tag) => (
              <span
                key={tag.raw}
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 font-medium text-[11px]",
                  tagFacetClass(tag.facet),
                )}
              >
                {tag.label}
              </span>
            ))}
          <span className="text-[11px] text-muted-foreground/60">
            {formatRelativeTime(bookmark.capturedAt)}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end justify-between self-stretch">
        <div className="flex items-center gap-4 pt-0.5 text-muted-foreground">
          <span className="flex items-center gap-1 text-xs" title="Saves">
            <BookmarkIcon className="h-3.5 w-3.5" />
            {totalSaves}
          </span>
          {canSave ? (
            <button
              type="button"
              disabled={isSaving}
              onClick={onSave}
              className="flex items-center gap-1 rounded px-1 text-xs transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Save bookmark"
              title="Save bookmark to Unfiled"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? "Saving" : "Save"}
            </button>
          ) : null}
          <button
            type="button"
            disabled={!canStarBookmark}
            onClick={onToggleStar}
            className={cn(
              "flex items-center gap-1 rounded px-1 text-xs transition-colors",
              viewerHasStarred
                ? "text-amber-500 hover:text-amber-600"
                : "hover:text-foreground",
              !canStarBookmark &&
                "cursor-not-allowed opacity-45 hover:text-muted-foreground",
            )}
            aria-pressed={viewerHasStarred}
            aria-label={viewerHasStarred ? "Unstar bookmark" : "Star bookmark"}
            title={
              canStarBookmark
                ? "Star bookmark"
                : "Sign in to star public bookmarks"
            }
          >
            <Star
              className={cn("h-3.5 w-3.5", viewerHasStarred && "fill-current")}
            />
            {totalStars}
          </button>
        </div>
      </div>
    </article>
  );
}

function ThemeButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Button>
  );
}
