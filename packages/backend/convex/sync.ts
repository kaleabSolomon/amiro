import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { authComponent } from "./auth";
import { heuristicTypeTags } from "./lib/heuristic_tags";
import { canonicalizeUrl } from "./lib/url_canonical";

const sourceValidator = v.union(
  v.literal("chrome"),
  v.literal("telegram"),
  v.literal("instagram"),
  v.literal("twitter"),
);
const visibilityValidator = v.union(v.literal("private"), v.literal("public"));

export function normalizeTag(tag: string) {
  return tag.trim().toLowerCase().replace(/\s+/g, "-");
}

function normalizeChildLinks(
  links:
    | Array<{
        url: string;
        title?: string;
        siteName?: string;
        description?: string;
      }>
    | undefined,
) {
  if (!links || links.length === 0) {
    return undefined;
  }

  const deduped = new Map<
    string,
    {
      url: string;
      title?: string;
      siteName?: string;
      description?: string;
    }
  >();
  for (const link of links) {
    const url = link.url.trim();
    if (!url) {
      continue;
    }

    if (!deduped.has(url)) {
      deduped.set(url, {
        url,
        title: link.title?.trim() || undefined,
        siteName: link.siteName?.trim() || undefined,
        description: link.description?.trim() || undefined,
      });
    }
  }

  if (deduped.size === 0) {
    return undefined;
  }

  return [...deduped.values()];
}

export function buildSearchDocument(args: {
  source: "chrome" | "telegram" | "instagram" | "twitter";
  url: string;
  title: string;
  text?: string;
  tags: string[];
  childLinks?: Array<{
    url: string;
    title?: string;
    siteName?: string;
    description?: string;
  }>;
}) {
  const parts: string[] = [
    args.title,
    args.url,
    args.text ?? "",
    args.source,
    `source:${args.source}`,
  ];

  for (const tag of args.tags) {
    parts.push(tag, `tag:${tag}`);
  }

  for (const link of args.childLinks ?? []) {
    parts.push(
      link.url,
      link.title ?? "",
      link.siteName ?? "",
      link.description ?? "",
    );
  }

  return parts.join(" ").toLowerCase();
}

export const upsertCaptureFromExtension = internalMutation({
  args: {
    userId: v.string(),
    source: sourceValidator,
    folderId: v.optional(v.id("folders")),
    url: v.string(),
    title: v.string(),
    text: v.optional(v.string()),
    additionalLinks: v.optional(
      v.array(
        v.object({
          url: v.string(),
          title: v.optional(v.string()),
          siteName: v.optional(v.string()),
          description: v.optional(v.string()),
        }),
      ),
    ),
    tags: v.array(v.string()),
    capturedAt: v.string(),
    visibility: v.optional(visibilityValidator),
  },
  handler: async (ctx, args) => {
    const capturedAtMs = Date.parse(args.capturedAt);
    if (Number.isNaN(capturedAtMs)) {
      throw new ConvexError("Invalid capturedAt value.");
    }

    let folderIsPublic = false;
    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      if (!folder || folder.userId !== args.userId) {
        throw new ConvexError("Invalid folder for this user.");
      }
      folderIsPublic = (folder.visibility ?? "private") === "public";
    }

    const { canonicalUrl } = canonicalizeUrl(args.url);
    const typeTags = heuristicTypeTags(args.url);

    // Check URL tag cache for previously-computed topic:* tags
    let cachedTopicTags: string[] = [];
    let tagStatus: "pending" | "tagged" = "pending";

    if (canonicalUrl) {
      const cached = await ctx.db
        .query("urlTagCache")
        .withIndex("by_canonical_url", (q) =>
          q.eq("canonicalUrl", canonicalUrl),
        )
        .unique();

      if (cached) {
        cachedTopicTags = cached.tags;
        tagStatus = "tagged";
        await ctx.db.patch(cached._id, {
          hitCount: cached.hitCount + 1,
          lastSeenAt: Date.now(),
        });
      }
    }

    const childLinks = normalizeChildLinks(args.additionalLinks);
    const mergedTags = [
      ...new Set(
        [...args.tags, ...typeTags, ...cachedTopicTags]
          .map(normalizeTag)
          .filter((tag) => tag.length > 0),
      ),
    ];
    const searchDocument = buildSearchDocument({
      source: args.source,
      url: args.url,
      title: args.title,
      text: args.text,
      tags: mergedTags,
      childLinks,
    });

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

    // Invariant (mirrors dashboard.moveBookmark / updateBookmarkVisibility):
    // a bookmark may be public only inside a public folder. In Unfiled or a
    // private folder, force private regardless of the requested visibility.
    const requestedVisibility =
      args.visibility ?? existing?.visibility ?? "private";
    const resolvedVisibility =
      folderIsPublic && requestedVisibility === "public" ? "public" : "private";

    if (existing) {
      await ctx.db.patch(existing._id, {
        folderId: args.folderId,
        visibility: resolvedVisibility,
        title: args.title,
        text: args.text,
        childLinks,
        searchDocument,
        tags: mergedTags,
        canonicalUrl: canonicalUrl || undefined,
        tagStatus: existing.tagStatus === "tagged" ? "tagged" : tagStatus,
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
      visibility: resolvedVisibility,
      url: args.url,
      title: args.title,
      text: args.text,
      childLinks,
      searchDocument,
      tags: mergedTags,
      canonicalUrl: canonicalUrl || undefined,
      tagStatus,
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

export const listBookmarksForUserFolder = internalQuery({
  args: {
    userId: v.string(),
    folderId: v.optional(v.id("folders")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 20, 50));

    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      if (!folder || folder.userId !== args.userId) {
        throw new ConvexError("Invalid folder for this user.");
      }
    }

    const docs = await ctx.db
      .query("syncedBookmarks")
      .withIndex("by_user_and_folder", (q) =>
        q.eq("userId", args.userId).eq("folderId", args.folderId),
      )
      .order("desc")
      .take(limit);

    return docs.map((bookmark) => ({
      id: bookmark._id,
      title: bookmark.title,
      url: bookmark.url,
      source: bookmark.source,
      tags: bookmark.tags,
      visibility: bookmark.visibility ?? "private",
      // Short snippet for row previews; full text stays server-side.
      text: bookmark.text ? bookmark.text.slice(0, 200) : "",
      capturedAt: bookmark.capturedAt,
    }));
  },
});

// Folders (plus a synthetic "Unfiled" bucket) with per-folder item counts.
// Mirrors the web app's dashboard.getFolderTree shape for the extension's
// browse-by-folder view. Exposed to the extension via GET /api/extension/folders.
export const listFolderTreeForUser = internalQuery({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const [folders, bookmarks] = await Promise.all([
      ctx.db
        .query("folders")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect(),
      ctx.db
        .query("syncedBookmarks")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect(),
    ]);

    const counts = new Map<string, number>();
    for (const bookmark of bookmarks) {
      const key = bookmark.folderId ?? "unfiled";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const realFolders = folders
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((folder) => ({
        id: folder._id as string,
        name: folder.name,
        icon: folder.icon ?? null,
        visibility: folder.visibility ?? ("private" as const),
        parentFolderId: folder.parentFolderId ?? null,
        itemCount: counts.get(folder._id) ?? 0,
      }));

    const unfiled = {
      id: "unfiled",
      name: "Unfiled",
      icon: "📥",
      visibility: "private" as const,
      parentFolderId: null,
      itemCount: counts.get("unfiled") ?? 0,
    };

    return [unfiled, ...realFolders];
  },
});

export const createBookmark = mutation({
  args: {
    url: v.string(),
    folderId: v.optional(v.id("folders")),
    visibility: v.optional(visibilityValidator),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ id: Id<"syncedBookmarks">; status: "created" | "updated" }> => {
    const authUser = await authComponent.getAuthUser(ctx);

    // For manual creation, we use a simple title and no text/child links for now.
    // In a real app, we might want to fetch the page title/metadata.
    const url = args.url.trim();
    if (!url) {
      throw new ConvexError("URL is required.");
    }

    let title = url;
    try {
      title = new URL(url).hostname;
    } catch {
      // fallback to url if invalid
    }

    return ctx.runMutation(internal.sync.upsertCaptureFromExtension, {
      userId: authUser._id,
      source: "chrome", // Manual bookmarks use chrome source for now
      folderId: args.folderId,
      visibility: args.visibility,
      url,
      title,
      tags: [],
      capturedAt: new Date().toISOString(),
    });
  },
});
