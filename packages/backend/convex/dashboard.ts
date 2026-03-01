import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
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
