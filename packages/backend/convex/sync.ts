import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

const sourceValidator = v.union(
  v.literal("chrome"),
  v.literal("telegram"),
  v.literal("instagram"),
  v.literal("twitter"),
);

function normalizeTag(tag: string) {
  return tag.trim().toLowerCase().replace(/\s+/g, "-");
}

function buildDefaultTags(args: {
  source: "chrome" | "telegram" | "instagram" | "twitter";
  url: string;
  capturedAtMs: number;
}) {
  const tags = new Set<string>();
  tags.add(`source:${args.source}`);

  try {
    const hostname = new URL(args.url).hostname.replace(/^www\./, "");
    if (hostname) {
      tags.add(`domain:${hostname}`);
    }
  } catch {
    // Ignore invalid URLs for derived domain tags.
  }

  const month = new Date(args.capturedAtMs).toISOString().slice(0, 7);
  tags.add(`captured:${month}`);

  return [...tags];
}

export const upsertCaptureFromExtension = internalMutation({
  args: {
    userId: v.string(),
    source: sourceValidator,
    folderId: v.optional(v.id("folders")),
    url: v.string(),
    title: v.string(),
    text: v.optional(v.string()),
    tags: v.array(v.string()),
    capturedAt: v.string(),
  },
  handler: async (ctx, args) => {
    const capturedAtMs = Date.parse(args.capturedAt);
    if (Number.isNaN(capturedAtMs)) {
      throw new ConvexError("Invalid capturedAt value.");
    }

    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      if (!folder || folder.userId !== args.userId) {
        throw new ConvexError("Invalid folder for this user.");
      }
    }

    const defaultTags = buildDefaultTags({
      source: args.source,
      url: args.url,
      capturedAtMs,
    });
    const mergedTags = [
      ...new Set(
        [...args.tags, ...defaultTags]
          .map(normalizeTag)
          .filter((tag) => tag.length > 0),
      ),
    ];

    const now = Date.now();
    const existing = await ctx.db
      .query("syncedBookmarks")
      .withIndex("by_user_and_source_and_url", (q) =>
        q
          .eq("userId", args.userId)
          .eq("source", args.source)
          .eq("url", args.url),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        folderId: args.folderId,
        title: args.title,
        text: args.text,
        tags: mergedTags,
        capturedAt: capturedAtMs,
        lastSyncedAt: now,
      });

      return {
        id: existing._id,
        status: "updated" as const,
      };
    }

    const id = await ctx.db.insert("syncedBookmarks", {
      userId: args.userId,
      source: args.source,
      folderId: args.folderId,
      url: args.url,
      title: args.title,
      text: args.text,
      tags: mergedTags,
      capturedAt: capturedAtMs,
      lastSyncedAt: now,
    });

    return {
      id,
      status: "created" as const,
    };
  },
});

export const listFoldersForUser = internalQuery({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const folders = await ctx.db
      .query("folders")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return folders
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((folder) => ({
        id: folder._id,
        name: folder.name,
        parentFolderId: folder.parentFolderId ?? null,
      }));
  },
});
