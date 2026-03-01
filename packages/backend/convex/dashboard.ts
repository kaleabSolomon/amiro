import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

type FolderStats = {
  itemCount: number;
  updatedAtMs: number | null;
  tagCounts: Map<string, number>;
};

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

    if (targetFolderId) {
      const folder = await ctx.db.get(targetFolderId);
      if (!folder || folder.userId !== authUser._id) {
        throw new ConvexError("Folder not found.");
      }
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

    return docs.map((bookmark) => ({
      id: bookmark._id,
      url: bookmark.url,
      title: bookmark.title,
      text: bookmark.text ?? "",
      tags: bookmark.tags,
      source: bookmark.source,
      capturedAt: bookmark.capturedAt,
      lastSyncedAt: bookmark.lastSyncedAt,
    }));
  },
});

export const createFolder = mutation({
  args: {
    name: v.string(),
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
      parentFolderId: args.parentFolderId,
      createdAt: now,
      updatedAt: now,
    });

    return { id };
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
