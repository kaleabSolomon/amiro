import { ConvexError, v } from "convex/values";
import { components } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { authComponent } from "./auth";

type FolderStats = {
  itemCount: number;
  updatedAtMs: number | null;
  tagCounts: Map<string, number>;
};

const visibilityValidator = v.union(v.literal("private"), v.literal("public"));

function getOrCreateStats(map: Map<string, FolderStats>, key: string) {
  const existing = map.get(key);
  if (existing) {
    return existing;
  }

  const next: FolderStats = {
    itemCount: 0,
    updatedAtMs: null,
    tagCounts: new Map<string, number>(),
  };
  map.set(key, next);
  return next;
}

function topTags(tagCounts: Map<string, number>, limit = 4) {
  return [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}

function mapBookmark(bookmark: {
  _id: Id<"syncedBookmarks">;
  url: string;
  title: string;
  text?: string;
  childLinks?: Array<{
    url: string;
    title?: string;
    siteName?: string;
    description?: string;
  }>;
  tags: string[];
  source: "chrome" | "telegram" | "instagram" | "twitter";
  visibility?: "private" | "public";
  tagStatus?: "pending" | "tagged" | "skipped";
  capturedAt: number;
  lastSyncedAt: number;
}) {
  return {
    id: bookmark._id,
    url: bookmark.url,
    title: bookmark.title,
    text: bookmark.text ?? "",
    childLinks: bookmark.childLinks ?? [],
    tags: bookmark.tags,
    source: bookmark.source,
    visibility: bookmark.visibility ?? "private",
    tagStatus: bookmark.tagStatus,
    capturedAt: bookmark.capturedAt,
    lastSyncedAt: bookmark.lastSyncedAt,
  };
}

async function getBookmarkEngagement(
  ctx: QueryCtx,
  bookmark: Doc<"syncedBookmarks">,
  viewerId: string,
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
    ctx.db
      .query("bookmarkStarClaims")
      .withIndex("by_starred_by_and_bookmark", (q) =>
        q.eq("starredBy", viewerId).eq("bookmarkId", bookmark._id),
      )
      .unique(),
  ]);

  return {
    totalSaves: saveStats?.totalAttributedSaves ?? 0,
    totalStars: starStats?.totalStars ?? 0,
    viewerHasStarred: Boolean(starClaim),
  };
}

async function mapBookmarkWithEngagement(
  ctx: QueryCtx,
  bookmark: Doc<"syncedBookmarks">,
  viewerId: string,
) {
  return {
    ...mapBookmark(bookmark),
    ...(await getBookmarkEngagement(ctx, bookmark, viewerId)),
  };
}

function generateLinkToken() {
  return `tg_${crypto.randomUUID().replaceAll("-", "")}`;
}

export const getFolderTree = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return [];
    }

    const [folders, bookmarks] = await Promise.all([
      ctx.db
        .query("folders")
        .withIndex("by_user", (q) => q.eq("userId", authUser._id))
        .collect(),
      ctx.db
        .query("syncedBookmarks")
        .withIndex("by_user", (q) => q.eq("userId", authUser._id))
        .collect(),
    ]);

    const statsByFolder = new Map<string, FolderStats>();

    for (const bookmark of bookmarks) {
      const key = bookmark.folderId ?? "unfiled";
      const stats = getOrCreateStats(statsByFolder, key);
      stats.itemCount += 1;
      stats.updatedAtMs = Math.max(
        stats.updatedAtMs ?? 0,
        bookmark.lastSyncedAt ?? bookmark.capturedAt,
      );

      for (const tag of bookmark.tags) {
        stats.tagCounts.set(tag, (stats.tagCounts.get(tag) ?? 0) + 1);
      }
    }

    const folderTree = folders.map((folder) => {
      const stats = statsByFolder.get(folder._id);
      return {
        id: folder._id,
        name: folder.name,
        icon: folder.icon,
        visibility: folder.visibility ?? "private",
        parentId: folder.parentFolderId ?? null,
        itemCount: stats?.itemCount ?? 0,
        updatedAtMs: stats?.updatedAtMs ?? null,
        tags: stats ? topTags(stats.tagCounts) : [],
      };
    });

    const unfiledStats = statsByFolder.get("unfiled");
    const unfiled = {
      id: "unfiled",
      name: "Unfiled",
      icon: "📥",
      visibility: "private" as const,
      parentId: null,
      itemCount: unfiledStats?.itemCount ?? 0,
      updatedAtMs: unfiledStats?.updatedAtMs ?? null,
      tags: unfiledStats ? topTags(unfiledStats.tagCounts) : [],
    };

    return [unfiled, ...folderTree];
  },
});

export const getBookmarksForFolder = query({
  args: {
    folderId: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return [];
    }

    const targetFolderId =
      args.folderId === "unfiled"
        ? undefined
        : (args.folderId as Id<"folders">);
    let targetFolderVisibility: "private" | "public" = "private";

    if (targetFolderId) {
      const folder = await ctx.db.get(targetFolderId);
      if (!folder || folder.userId !== authUser._id) {
        throw new ConvexError("Folder not found.");
      }
      targetFolderVisibility = folder.visibility ?? "private";
    }

    const docs = !targetFolderId
      ? await ctx.db
          .query("syncedBookmarks")
          .withIndex("by_user_and_folder", (q) =>
            q.eq("userId", authUser._id).eq("folderId", undefined),
          )
          .order("desc")
          .collect()
      : await ctx.db
          .query("syncedBookmarks")
          .withIndex("by_user_and_folder", (q) =>
            q.eq("userId", authUser._id).eq("folderId", targetFolderId),
          )
          .order("desc")
          .collect();

    return await Promise.all(
      docs.map(async (bookmark) => ({
        ...(await mapBookmarkWithEngagement(ctx, bookmark, authUser._id)),
        folderVisibility: targetFolderVisibility,
      })),
    );
  },
});

export const getRecentBookmarks = query({
  args: {
    days: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return [];
    }

    const days = Math.max(1, Math.min(args.days ?? 7, 31));
    const limit = Math.max(1, Math.min(args.limit ?? 100, 200));
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const [folders, bookmarks] = await Promise.all([
      ctx.db
        .query("folders")
        .withIndex("by_user", (q) => q.eq("userId", authUser._id))
        .collect(),
      ctx.db
        .query("syncedBookmarks")
        .withIndex("by_user_and_last_synced_at", (q) =>
          q.eq("userId", authUser._id).gte("lastSyncedAt", since),
        )
        .order("desc")
        .take(limit),
    ]);

    const folderMap = new Map(folders.map((folder) => [folder._id, folder]));

    return await Promise.all(
      bookmarks.map(async (bookmark) => {
        const folder = bookmark.folderId
          ? folderMap.get(bookmark.folderId)
          : undefined;

        return {
          ...(await mapBookmarkWithEngagement(ctx, bookmark, authUser._id)),
          folderId: bookmark.folderId ?? null,
          folderName: folder?.name ?? "Unfiled",
          folderVisibility: folder?.visibility ?? "private",
        };
      }),
    );
  },
});

export const getRecentBookmarkCount = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return 0;
    }

    const days = Math.max(1, Math.min(args.days ?? 7, 31));
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    const bookmarks = await ctx.db
      .query("syncedBookmarks")
      .withIndex("by_user_and_last_synced_at", (q) =>
        q.eq("userId", authUser._id).gte("lastSyncedAt", since),
      )
      .take(1000);

    return bookmarks.length;
  },
});

async function resolveSaverProfiles(ctx: QueryCtx, userIds: Iterable<string>) {
  const uniqueIds = [...new Set(userIds)];
  const entries = await Promise.all(
    uniqueIds.map(async (userId) => {
      const user = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "user",
        where: [{ field: "_id", value: userId }],
      })) as {
        _id: string;
        name?: string | null;
        username?: string | null;
        image?: string | null;
      } | null;

      return [
        userId,
        {
          id: userId,
          name: user?.name ?? "Amiro user",
          username: user?.username ?? null,
          image: user?.image ?? null,
        },
      ] as const;
    }),
  );

  return new Map(entries);
}

export const getSharedBookmarks = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return [];
    }

    const limit = Math.max(1, Math.min(args.limit ?? 120, 200));

    const [folders, bookmarks] = await Promise.all([
      ctx.db
        .query("folders")
        .withIndex("by_user", (q) => q.eq("userId", authUser._id))
        .collect(),
      ctx.db
        .query("syncedBookmarks")
        .withIndex("by_user_and_saved_at", (q) =>
          q.eq("userId", authUser._id).gt("savedAt", 0),
        )
        .order("desc")
        .take(limit),
    ]);

    const folderMap = new Map(folders.map((folder) => [folder._id, folder]));
    const savers = await resolveSaverProfiles(
      ctx,
      bookmarks
        .map((bookmark) => bookmark.savedFromUserId)
        .filter((id): id is string => Boolean(id)),
    );

    return await Promise.all(
      bookmarks.map(async (bookmark) => {
        const folder = bookmark.folderId
          ? folderMap.get(bookmark.folderId)
          : undefined;
        const saver = bookmark.savedFromUserId
          ? (savers.get(bookmark.savedFromUserId) ?? null)
          : null;

        return {
          ...(await mapBookmarkWithEngagement(ctx, bookmark, authUser._id)),
          folderId: bookmark.folderId ?? null,
          folderName: folder?.name ?? "Unfiled",
          folderVisibility: folder?.visibility ?? "private",
          savedAt: bookmark.savedAt ?? bookmark.lastSyncedAt,
          savedFrom: saver,
        };
      }),
    );
  },
});

export const getSharedBookmarkCount = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return 0;
    }

    const bookmarks = await ctx.db
      .query("syncedBookmarks")
      .withIndex("by_user_and_saved_at", (q) =>
        q.eq("userId", authUser._id).gt("savedAt", 0),
      )
      .take(1000);

    return bookmarks.length;
  },
});

export const searchWorkspace = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return { folders: [], bookmarks: [] };
    }

    const searchQuery = args.query.trim().toLowerCase();
    if (!searchQuery) {
      return { folders: [], bookmarks: [] };
    }

    const limit = Math.max(5, Math.min(args.limit ?? 30, 50));
    const folders = await ctx.db
      .query("folders")
      .withIndex("by_user", (q) => q.eq("userId", authUser._id))
      .collect();

    const folderMap = new Map(folders.map((folder) => [folder._id, folder]));
    const matchedFolders = folders
      .filter((folder) => folder.name.toLowerCase().includes(searchQuery))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 12)
      .map((folder) => ({
        id: folder._id,
        name: folder.name,
      }));

    const bookmarksFromSearch = await ctx.db
      .query("syncedBookmarks")
      .withSearchIndex("search_by_user_document", (q) =>
        q.search("searchDocument", searchQuery).eq("userId", authUser._id),
      )
      .take(limit);

    const legacyRecent = await ctx.db
      .query("syncedBookmarks")
      .withIndex("by_user_and_last_synced_at", (q) =>
        q.eq("userId", authUser._id),
      )
      .order("desc")
      .take(300);

    const legacyMatches = legacyRecent.filter((bookmark) => {
      const folderName = bookmark.folderId
        ? (folderMap.get(bookmark.folderId)?.name ?? "")
        : "unfiled";
      const searchBlob = [
        bookmark.title,
        bookmark.url,
        bookmark.text ?? "",
        bookmark.source,
        `source:${bookmark.source}`,
        folderName,
        ...bookmark.tags,
        ...bookmark.tags.map((tag) => `tag:${tag}`),
      ]
        .join(" ")
        .toLowerCase();
      return searchBlob.includes(searchQuery);
    });

    const matchedFolderIds = new Set(matchedFolders.map((folder) => folder.id));
    const folderMatchBookmarks = (
      await Promise.all(
        [...matchedFolderIds].map((folderId) =>
          ctx.db
            .query("syncedBookmarks")
            .withIndex("by_user_and_folder", (q) =>
              q.eq("userId", authUser._id).eq("folderId", folderId),
            )
            .order("desc")
            .take(8),
        ),
      )
    ).flat();

    const bookmarkById = new Map(
      [...bookmarksFromSearch, ...legacyMatches, ...folderMatchBookmarks].map(
        (bookmark) => [bookmark._id, bookmark],
      ),
    );

    const bookmarks = [...bookmarkById.values()]
      .sort((a, b) => b.lastSyncedAt - a.lastSyncedAt)
      .slice(0, limit)
      .map((bookmark) => ({
        id: bookmark._id,
        title: bookmark.title,
        url: bookmark.url,
        source: bookmark.source,
        tags: bookmark.tags,
        folderId: bookmark.folderId ?? null,
        folderName: bookmark.folderId
          ? (folderMap.get(bookmark.folderId)?.name ?? "Unknown folder")
          : "Unfiled",
      }));

    return {
      folders: matchedFolders,
      bookmarks,
    };
  },
});

export const createFolder = mutation({
  args: {
    name: v.string(),
    icon: v.optional(v.string()),
    visibility: v.optional(visibilityValidator),
    parentFolderId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    const name = args.name.trim();
    if (!name) {
      throw new ConvexError("Folder name cannot be empty.");
    }

    if (args.parentFolderId) {
      const parent = await ctx.db.get(args.parentFolderId);
      if (!parent || parent.userId !== authUser._id) {
        throw new ConvexError("Invalid parent folder.");
      }
    }

    const now = Date.now();
    const id = await ctx.db.insert("folders", {
      userId: authUser._id,
      name,
      icon: args.icon?.trim() || undefined,
      visibility: args.visibility ?? "private",
      parentFolderId: args.parentFolderId,
      createdAt: now,
      updatedAt: now,
    });

    return { id };
  },
});

export const createFolderForUser = internalMutation({
  args: {
    userId: v.string(),
    name: v.string(),
    icon: v.optional(v.string()),
    visibility: v.optional(visibilityValidator),
    parentFolderId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (!name) {
      throw new ConvexError("Folder name cannot be empty.");
    }

    if (args.parentFolderId) {
      const parent = await ctx.db.get(args.parentFolderId);
      if (!parent || parent.userId !== args.userId) {
        throw new ConvexError("Invalid parent folder.");
      }
    }

    const now = Date.now();
    const id = await ctx.db.insert("folders", {
      userId: args.userId,
      name,
      icon: args.icon?.trim() || undefined,
      visibility: args.visibility ?? "private",
      parentFolderId: args.parentFolderId,
      createdAt: now,
      updatedAt: now,
    });

    return { id };
  },
});

export const deleteBookmark = mutation({
  args: {
    bookmarkId: v.id("syncedBookmarks"),
  },
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    const bookmark = await ctx.db.get(args.bookmarkId);
    if (!bookmark || bookmark.userId !== authUser._id) {
      throw new ConvexError("Bookmark not found.");
    }

    await ctx.db.delete(args.bookmarkId);
    return { ok: true as const };
  },
});

export const updateFolderVisibility = mutation({
  args: {
    folderId: v.id("folders"),
    visibility: visibilityValidator,
  },
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.userId !== authUser._id) {
      throw new ConvexError("Folder not found.");
    }

    await ctx.db.patch(folder._id, {
      visibility: args.visibility,
      updatedAt: Date.now(),
    });

    return {
      id: folder._id,
      visibility: args.visibility,
    };
  },
});

export const updateBookmarkVisibility = mutation({
  args: {
    bookmarkId: v.id("syncedBookmarks"),
    visibility: visibilityValidator,
  },
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    const bookmark = await ctx.db.get(args.bookmarkId);
    if (!bookmark || bookmark.userId !== authUser._id) {
      throw new ConvexError("Bookmark not found.");
    }

    if (bookmark.folderId) {
      const folder = await ctx.db.get(bookmark.folderId);
      if (!folder || folder.userId !== authUser._id) {
        throw new ConvexError("Folder not found.");
      }
      if ((folder.visibility ?? "private") !== "public") {
        throw new ConvexError(
          "Bookmark visibility can only be changed inside a public folder.",
        );
      }
    } else {
      throw new ConvexError(
        "Bookmark visibility can only be changed inside a public folder.",
      );
    }

    await ctx.db.patch(bookmark._id, {
      visibility: args.visibility,
      lastSyncedAt: Date.now(),
    });

    return {
      id: bookmark._id,
      visibility: args.visibility,
    };
  },
});

export const moveBookmark = mutation({
  args: {
    bookmarkId: v.id("syncedBookmarks"),
    folderId: v.optional(v.id("folders")), // undefined = Unfiled
  },
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    const bookmark = await ctx.db.get(args.bookmarkId);
    if (!bookmark || bookmark.userId !== authUser._id) {
      throw new ConvexError("Bookmark not found.");
    }

    let destinationIsPublic = false;
    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      if (!folder || folder.userId !== authUser._id) {
        throw new ConvexError("Folder not found.");
      }
      destinationIsPublic = (folder.visibility ?? "private") === "public";
    }

    // No-op guard: moving to the folder the bookmark already lives in.
    if ((bookmark.folderId ?? undefined) === (args.folderId ?? undefined)) {
      return {
        id: bookmark._id,
        folderId: args.folderId ?? null,
        visibility: bookmark.visibility ?? "private",
      };
    }

    // Preserve the invariant that a bookmark may be public only inside a
    // public folder — downgrade to private when the destination is private
    // or Unfiled.
    const nextVisibility = destinationIsPublic
      ? (bookmark.visibility ?? "private")
      : "private";

    await ctx.db.patch(bookmark._id, {
      folderId: args.folderId,
      visibility: nextVisibility,
      lastSyncedAt: Date.now(),
    });

    return {
      id: bookmark._id,
      folderId: args.folderId ?? null,
      visibility: nextVisibility,
    };
  },
});

export const getConnectedSources = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return [];
    }

    const bookmarks = await ctx.db
      .query("syncedBookmarks")
      .withIndex("by_user", (q) => q.eq("userId", authUser._id))
      .collect();

    const counts = new Map<
      "chrome" | "telegram" | "instagram" | "twitter",
      number
    >();

    for (const bookmark of bookmarks) {
      counts.set(bookmark.source, (counts.get(bookmark.source) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
  },
});

export const getTelegramConnectionStatus = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return {
        connected: false,
      } as const;
    }

    const connection = await ctx.db
      .query("telegramConnections")
      .withIndex("by_user", (q) => q.eq("userId", authUser._id))
      .unique();

    if (!connection || connection.status !== "active") {
      return {
        connected: false,
      } as const;
    }

    return {
      connected: true,
      telegramUserId: connection.telegramUserId,
      telegramChatId: connection.telegramChatId,
      telegramUsername: connection.telegramUsername ?? null,
      connectedAt: connection.connectedAt,
    } as const;
  },
});

export const createTelegramLinkToken = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    const now = Date.now();
    const token = generateLinkToken();
    const expiresAt = now + 10 * 60 * 1000;

    await ctx.db.insert("telegramLinkTokens", {
      token,
      userId: authUser._id,
      createdAt: now,
      expiresAt,
    });

    const botUsername = process.env.TELEGRAM_BOT_USERNAME;
    const deepLink = botUsername
      ? `https://t.me/${botUsername}?start=link_${token}`
      : null;

    return {
      token,
      expiresAt,
      deepLink,
    };
  },
});

export const completeTelegramLink = internalMutation({
  args: {
    token: v.string(),
    telegramUserId: v.number(),
    telegramChatId: v.number(),
    telegramUsername: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const linkToken = await ctx.db
      .query("telegramLinkTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!linkToken) {
      throw new ConvexError("Invalid link token.");
    }
    if (linkToken.usedAt) {
      throw new ConvexError("Link token already used.");
    }
    if (linkToken.expiresAt < now) {
      throw new ConvexError("Link token expired.");
    }

    const existingByTelegram = await ctx.db
      .query("telegramConnections")
      .withIndex("by_telegram_user_id", (q) =>
        q.eq("telegramUserId", args.telegramUserId),
      )
      .unique();

    if (
      existingByTelegram &&
      existingByTelegram.userId !== linkToken.userId &&
      existingByTelegram.status === "active"
    ) {
      throw new ConvexError("Telegram account is already linked.");
    }

    const existingByUser = await ctx.db
      .query("telegramConnections")
      .withIndex("by_user", (q) => q.eq("userId", linkToken.userId))
      .unique();

    if (existingByUser) {
      await ctx.db.patch(existingByUser._id, {
        telegramUserId: args.telegramUserId,
        telegramChatId: args.telegramChatId,
        telegramUsername: args.telegramUsername,
        status: "active",
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("telegramConnections", {
        userId: linkToken.userId,
        telegramUserId: args.telegramUserId,
        telegramChatId: args.telegramChatId,
        telegramUsername: args.telegramUsername,
        connectedAt: now,
        updatedAt: now,
        status: "active",
      });
    }

    await ctx.db.patch(linkToken._id, {
      usedAt: now,
    });

    return {
      ok: true,
      userId: linkToken.userId,
    } as const;
  },
});

export const getLinkedUserIdByTelegramUserId = internalQuery({
  args: {
    telegramUserId: v.number(),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("telegramConnections")
      .withIndex("by_telegram_user_id", (q) =>
        q.eq("telegramUserId", args.telegramUserId),
      )
      .unique();

    if (!connection || connection.status !== "active") {
      throw new ConvexError("Telegram account is not linked.");
    }

    return connection.userId;
  },
});
