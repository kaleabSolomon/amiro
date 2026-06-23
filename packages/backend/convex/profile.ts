import { v } from "convex/values";
import { components } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { query } from "./_generated/server";
import { authComponent } from "./auth";

async function getBookmarkEngagement(
  ctx: QueryCtx,
  bookmark: Doc<"syncedBookmarks">,
  viewerId?: string,
) {
  const [saveStats, starStats, starClaim] = await Promise.all([
    ctx.db
      .query("bookmarkSaveStats")
      .withIndex("by_bookmark", (q) => q.eq("bookmarkId", bookmark._id))
      .unique(),
    ctx.db
      .query("bookmarkStarStats")
      .withIndex("by_bookmark", (q) => q.eq("bookmarkId", bookmark._id))
      .unique(),
    viewerId
      ? ctx.db
          .query("bookmarkStarClaims")
          .withIndex("by_starred_by_and_bookmark", (q) =>
            q.eq("starredBy", viewerId).eq("bookmarkId", bookmark._id),
          )
          .unique()
      : null,
  ]);

  return {
    totalSaves: saveStats?.totalAttributedSaves ?? 0,
    totalStars: starStats?.totalStars ?? 0,
    viewerHasStarred: Boolean(starClaim),
  };
}

export const getProfileByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    // 1. Find user by username
    const user = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "username", value: args.username }],
    })) as {
      _id: string;
      name: string;
      username?: string | null;
      bio?: string | null;
      image?: string | null;
      email: string;
      createdAt: number;
    } | null;

    if (!user) {
      return null;
    }

    // 2. Check if the current logged-in user is the owner
    const authUser = await authComponent.safeGetAuthUser(ctx);
    const isOwner = authUser ? authUser._id === user._id : false;

    // 3. Fetch user profile
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    // 4. Fetch folders
    const allFolders = await ctx.db
      .query("folders")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // 4. Fetch bookmarks
    const allBookmarks = await ctx.db
      .query("syncedBookmarks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const folderById = new Map(
      allFolders.map((folder) => [folder._id, folder]),
    );

    // Filter folders and bookmarks based on owner status. Public viewers only
    // see bookmarks that are public and live inside a public folder.
    const folders = allFolders
      .filter(
        (folder) => isOwner || (folder.visibility ?? "private") === "public",
      )
      .map((folder) => {
        const folderBookmarks = allBookmarks.filter(
          (b) =>
            b.folderId === folder._id &&
            (isOwner || (b.visibility ?? "private") === "public"),
        );
        return {
          id: folder._id,
          name: folder.name,
          icon: folder.icon ?? "📁",
          visibility: folder.visibility ?? "private",
          itemCount: folderBookmarks.length,
        };
      });

    const visibleBookmarks = allBookmarks.filter((bookmark) => {
      if (isOwner) {
        return true;
      }

      if ((bookmark.visibility ?? "private") !== "public") {
        return false;
      }

      if (!bookmark.folderId) {
        return true;
      }

      const folder = folderById.get(bookmark.folderId);
      return (folder?.visibility ?? "private") === "public";
    });

    const bookmarks = await Promise.all(
      visibleBookmarks.map(async (b) => {
        const folder = b.folderId ? folderById.get(b.folderId) : null;
        return {
          id: b._id,
          url: b.url,
          title: b.title,
          text: b.text ?? "",
          tags: b.tags,
          capturedAt: b.capturedAt,
          lastSyncedAt: b.lastSyncedAt,
          folderId: b.folderId ?? null,
          folderName: folder?.name ?? "Unfiled",
          folderIcon: folder?.icon ?? "📁",
          folderVisibility: folder?.visibility ?? "private",
          visibility: b.visibility ?? "private",
          source: b.source,
          ...(await getBookmarkEngagement(ctx, b, authUser?._id)),
        };
      }),
    );

    return {
      user: {
        id: user._id,
        name: user.name,
        username: user.username ?? null,
        bio: userProfile?.bio ?? null,
        image: user.image ?? null,
        email: isOwner ? user.email : undefined,
        createdAt: user.createdAt,
      },
      folders,
      bookmarks,
      isOwner,
    };
  },
});
