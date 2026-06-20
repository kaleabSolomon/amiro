import { ConvexError, v } from "convex/values";
import { components, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

const resourceTypeValidator = v.union(
  v.literal("bookmark"),
  v.literal("folder"),
  v.literal("group"),
);
const shareVisibilityValidator = v.union(
  v.literal("public"),
  v.literal("unlisted"),
);

const bookmarkSourceValidator = v.union(
  v.literal("chrome"),
  v.literal("telegram"),
  v.literal("instagram"),
  v.literal("twitter"),
);
const bookmarkVisibilityValidator = v.union(
  v.literal("private"),
  v.literal("public"),
);
const nullableStringValidator = v.union(v.string(), v.null());
const publicBookmarkValidator = v.object({
  id: v.id("syncedBookmarks"),
  url: v.string(),
  title: v.string(),
  text: v.string(),
  childLinks: v.array(
    v.object({
      url: v.string(),
      title: v.optional(v.string()),
      siteName: v.optional(v.string()),
      description: v.optional(v.string()),
    }),
  ),
  tags: v.array(v.string()),
  source: bookmarkSourceValidator,
  visibility: bookmarkVisibilityValidator,
  capturedAt: v.number(),
  lastSyncedAt: v.number(),
});
const ownerValidator = v.union(
  v.null(),
  v.object({
    id: v.string(),
    name: v.string(),
    username: nullableStringValidator,
    image: nullableStringValidator,
  }),
);
const shareSummaryValidator = v.object({
  id: v.id("shares"),
  publicId: v.string(),
  resourceType: resourceTypeValidator,
  visibility: shareVisibilityValidator,
  campaign: nullableStringValidator,
  createdAt: v.number(),
  expiresAt: v.union(v.number(), v.null()),
});
const resolveShareReturnValidator = v.object({
  share: shareSummaryValidator,
  owner: ownerValidator,
  resource: v.union(
    v.object({
      type: v.literal("bookmark"),
      bookmark: publicBookmarkValidator,
    }),
    v.object({
      type: v.literal("folder"),
      folder: v.object({
        id: v.id("folders"),
        name: v.string(),
        icon: v.string(),
        visibility: bookmarkVisibilityValidator,
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
      bookmarks: v.array(publicBookmarkValidator),
    }),
  ),
});
const topPerformingShareValidator = v.object({
  publicId: v.string(),
  resourceType: resourceTypeValidator,
  totalSaves: v.number(),
});
const topPerformingBookmarkValidator = v.object({
  id: v.id("syncedBookmarks"),
  title: v.string(),
  url: v.string(),
  totalAttributedSaves: v.number(),
});
const topStarredBookmarkValidator = v.object({
  id: v.id("syncedBookmarks"),
  title: v.string(),
  url: v.string(),
  totalStars: v.number(),
});

type ReadCtx = QueryCtx | MutationCtx;

type PublicBookmark = {
  id: Id<"syncedBookmarks">;
  url: string;
  title: string;
  text: string;
  childLinks: Array<{
    url: string;
    title?: string;
    siteName?: string;
    description?: string;
  }>;
  tags: string[];
  source: "chrome" | "telegram" | "instagram" | "twitter";
  visibility: "private" | "public";
  capturedAt: number;
  lastSyncedAt: number;
};

function generatePublicId() {
  return `shr_${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`;
}

function mapBookmark(bookmark: Doc<"syncedBookmarks">): PublicBookmark {
  return {
    id: bookmark._id,
    url: bookmark.url,
    title: bookmark.title,
    text: bookmark.text ?? "",
    childLinks: bookmark.childLinks ?? [],
    tags: bookmark.tags,
    source: bookmark.source,
    visibility: bookmark.visibility ?? "private",
    capturedAt: bookmark.capturedAt,
    lastSyncedAt: bookmark.lastSyncedAt,
  };
}

async function getOwner(ctx: ReadCtx, userId: string) {
  const owner = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "user",
    where: [{ field: "_id", value: userId }],
  })) as {
    _id: string;
    name?: string | null;
    username?: string | null;
    image?: string | null;
  } | null;

  if (!owner) {
    return null;
  }

  return {
    id: owner._id,
    name: owner.name ?? "Amiro user",
    username: owner.username ?? null,
    image: owner.image ?? null,
  };
}

async function getShareByPublicId(ctx: ReadCtx, publicId: string) {
  const share = await ctx.db
    .query("shares")
    .withIndex("by_public_id", (q) => q.eq("publicId", publicId))
    .unique();

  if (!share) {
    throw new ConvexError("Share not found.");
  }

  if (share.expiresAt && share.expiresAt <= Date.now()) {
    throw new ConvexError("This share has expired.");
  }

  return share;
}

async function assertBookmarkCanBeShared(
  ctx: ReadCtx,
  bookmark: Doc<"syncedBookmarks">,
) {
  if ((bookmark.visibility ?? "private") !== "public") {
    throw new ConvexError("This bookmark is private.");
  }

  if (!bookmark.folderId) {
    return;
  }

  const folder = await ctx.db.get(bookmark.folderId);
  if (!folder || (folder.visibility ?? "private") !== "public") {
    throw new ConvexError("This bookmark belongs to a private folder.");
  }
}

async function getShareBookmark(
  ctx: ReadCtx,
  bookmarkId: Id<"syncedBookmarks">,
) {
  const bookmark = await ctx.db.get(bookmarkId);
  if (!bookmark) {
    throw new ConvexError("Bookmark not found.");
  }

  await assertBookmarkCanBeShared(ctx, bookmark);
  return bookmark;
}

async function getShareFolder(ctx: ReadCtx, folderId: Id<"folders">) {
  const folder = await ctx.db.get(folderId);
  if (!folder) {
    throw new ConvexError("Folder not found.");
  }

  if ((folder.visibility ?? "private") !== "public") {
    throw new ConvexError("This folder is private.");
  }

  return folder;
}

async function getPublicFolderBookmarks(ctx: ReadCtx, folder: Doc<"folders">) {
  const bookmarks = await ctx.db
    .query("syncedBookmarks")
    .withIndex("by_user_and_folder", (q) =>
      q.eq("userId", folder.userId).eq("folderId", folder._id),
    )
    .collect();

  return bookmarks.filter(
    (bookmark) => (bookmark.visibility ?? "private") === "public",
  );
}

async function ensureUniquePublicId(ctx: MutationCtx) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const publicId = generatePublicId();
    const existing = await ctx.db
      .query("shares")
      .withIndex("by_public_id", (q) => q.eq("publicId", publicId))
      .unique();

    if (!existing) {
      return publicId;
    }
  }

  throw new ConvexError("Could not generate a unique share id.");
}

async function bumpCuratorStats(
  ctx: MutationCtx,
  userId: string,
  field: "totalSharesCreated" | "totalSavesGenerated",
  amount: number,
  now: number,
) {
  const stats = await ctx.db
    .query("curatorSaveStats")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();

  if (stats) {
    await ctx.db.patch(stats._id, {
      [field]: stats[field] + amount,
      updatedAt: now,
    });
    return;
  }

  await ctx.db.insert("curatorSaveStats", {
    userId,
    totalSharesCreated: field === "totalSharesCreated" ? amount : 0,
    totalSavesGenerated: field === "totalSavesGenerated" ? amount : 0,
    updatedAt: now,
  });
}

async function bumpShareStats(
  ctx: MutationCtx,
  share: Doc<"shares">,
  amount: number,
  now: number,
) {
  const stats = await ctx.db
    .query("shareSaveStats")
    .withIndex("by_share", (q) => q.eq("shareId", share._id))
    .unique();

  if (stats) {
    await ctx.db.patch(stats._id, {
      totalSaves: stats.totalSaves + amount,
      updatedAt: now,
    });
    return;
  }

  await ctx.db.insert("shareSaveStats", {
    shareId: share._id,
    sharedBy: share.sharedBy,
    totalSaves: amount,
    updatedAt: now,
  });
}

async function bumpBookmarkStats(
  ctx: MutationCtx,
  bookmark: Doc<"syncedBookmarks">,
  amount: number,
  now: number,
) {
  const stats = await ctx.db
    .query("bookmarkSaveStats")
    .withIndex("by_bookmark", (q) => q.eq("bookmarkId", bookmark._id))
    .unique();

  if (stats) {
    await ctx.db.patch(stats._id, {
      totalAttributedSaves: stats.totalAttributedSaves + amount,
      updatedAt: now,
    });
    return;
  }

  await ctx.db.insert("bookmarkSaveStats", {
    bookmarkId: bookmark._id,
    ownerId: bookmark.userId,
    totalAttributedSaves: amount,
    updatedAt: now,
  });
}

async function bumpBookmarkStarStats(
  ctx: MutationCtx,
  bookmark: Doc<"syncedBookmarks">,
  amount: number,
  now: number,
) {
  const stats = await ctx.db
    .query("bookmarkStarStats")
    .withIndex("by_bookmark", (q) => q.eq("bookmarkId", bookmark._id))
    .unique();

  if (stats) {
    await ctx.db.patch(stats._id, {
      totalStars: Math.max(0, stats.totalStars + amount),
      updatedAt: now,
    });
    return;
  }

  if (amount <= 0) {
    return;
  }

  await ctx.db.insert("bookmarkStarStats", {
    bookmarkId: bookmark._id,
    ownerId: bookmark.userId,
    totalStars: amount,
    updatedAt: now,
  });
}

async function bumpShareBookmarkStats(
  ctx: MutationCtx,
  share: Doc<"shares">,
  bookmark: Doc<"syncedBookmarks">,
  amount: number,
  now: number,
) {
  const stats = await ctx.db
    .query("shareBookmarkSaveStats")
    .withIndex("by_share_and_bookmark", (q) =>
      q.eq("shareId", share._id).eq("bookmarkId", bookmark._id),
    )
    .unique();

  if (stats) {
    await ctx.db.patch(stats._id, {
      totalSaves: stats.totalSaves + amount,
      updatedAt: now,
    });
    return;
  }

  await ctx.db.insert("shareBookmarkSaveStats", {
    shareId: share._id,
    bookmarkId: bookmark._id,
    sharedBy: share.sharedBy,
    bookmarkOwnerId: bookmark.userId,
    totalSaves: amount,
    updatedAt: now,
  });
}

async function recordSaveAttribution(
  ctx: MutationCtx,
  args: {
    share: Doc<"shares">;
    bookmark: Doc<"syncedBookmarks">;
    savedBy: string;
    now: number;
  },
) {
  const existingClaim = await ctx.db
    .query("shareBookmarkSaveClaims")
    .withIndex("by_saved_by_and_bookmark", (q) =>
      q.eq("savedBy", args.savedBy).eq("bookmarkId", args.bookmark._id),
    )
    .unique();

  if (existingClaim) {
    return false;
  }

  await ctx.db.insert("shareBookmarkSaveClaims", {
    bookmarkId: args.bookmark._id,
    savedBy: args.savedBy,
    firstShareId: args.share._id,
    firstSharedBy: args.share.sharedBy,
    createdAt: args.now,
  });

  await ctx.db.insert("shareEvents", {
    shareId: args.share._id,
    publicId: args.share.publicId,
    eventType: "save",
    resourceType: args.share.resourceType,
    resourceId: args.share.resourceId,
    bookmarkId: args.bookmark._id,
    actorUserId: args.savedBy,
    createdAt: args.now,
  });

  await bumpShareStats(ctx, args.share, 1, args.now);
  await bumpBookmarkStats(ctx, args.bookmark, 1, args.now);
  await bumpShareBookmarkStats(ctx, args.share, args.bookmark, 1, args.now);
  await bumpCuratorStats(
    ctx,
    args.share.sharedBy,
    "totalSavesGenerated",
    1,
    args.now,
  );

  return true;
}

export const createShare = mutation({
  args: {
    resourceType: resourceTypeValidator,
    resourceId: v.string(),
    visibility: v.optional(shareVisibilityValidator),
    campaign: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  returns: v.object({
    id: v.id("shares"),
    publicId: v.string(),
    shareUrlPath: v.string(),
  }),
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    const now = Date.now();

    if (args.expiresAt && args.expiresAt <= now) {
      throw new ConvexError("Share expiration must be in the future.");
    }

    if (args.resourceType === "bookmark") {
      const bookmark = await getShareBookmark(
        ctx,
        args.resourceId as Id<"syncedBookmarks">,
      );
      if (bookmark.userId !== authUser._id) {
        throw new ConvexError("You can only share your own bookmarks.");
      }
    } else if (args.resourceType === "folder") {
      const folder = await getShareFolder(
        ctx,
        args.resourceId as Id<"folders">,
      );
      if (folder.userId !== authUser._id) {
        throw new ConvexError("You can only share your own folders.");
      }
    } else {
      throw new ConvexError("Bookmark groups are not available yet.");
    }

    const publicId = await ensureUniquePublicId(ctx);
    const id = await ctx.db.insert("shares", {
      publicId,
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      sharedBy: authUser._id,
      visibility: args.visibility ?? "unlisted",
      campaign: args.campaign,
      expiresAt: args.expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    await bumpCuratorStats(ctx, authUser._id, "totalSharesCreated", 1, now);

    return {
      id,
      publicId,
      shareUrlPath: `/share/${publicId}`,
    };
  },
});

export const resolveShare = query({
  args: {
    publicId: v.string(),
  },
  returns: resolveShareReturnValidator,
  handler: async (ctx, args) => {
    const share = await getShareByPublicId(ctx, args.publicId);
    const owner = await getOwner(ctx, share.sharedBy);

    if (share.resourceType === "bookmark") {
      const bookmark = await getShareBookmark(
        ctx,
        share.resourceId as Id<"syncedBookmarks">,
      );

      return {
        share: {
          id: share._id,
          publicId: share.publicId,
          resourceType: share.resourceType,
          visibility: share.visibility,
          campaign: share.campaign ?? null,
          createdAt: share.createdAt,
          expiresAt: share.expiresAt ?? null,
        },
        owner,
        resource: {
          type: "bookmark" as const,
          bookmark: mapBookmark(bookmark),
        },
      };
    }

    if (share.resourceType === "folder") {
      const folder = await getShareFolder(
        ctx,
        share.resourceId as Id<"folders">,
      );
      const bookmarks = await getPublicFolderBookmarks(ctx, folder);

      return {
        share: {
          id: share._id,
          publicId: share.publicId,
          resourceType: share.resourceType,
          visibility: share.visibility,
          campaign: share.campaign ?? null,
          createdAt: share.createdAt,
          expiresAt: share.expiresAt ?? null,
        },
        owner,
        resource: {
          type: "folder" as const,
          folder: {
            id: folder._id,
            name: folder.name,
            icon: folder.icon ?? "📁",
            visibility: folder.visibility ?? "private",
            createdAt: folder.createdAt,
            updatedAt: folder.updatedAt,
          },
          bookmarks: bookmarks.map(mapBookmark),
        },
      };
    }

    throw new ConvexError("Bookmark groups are not available yet.");
  },
});

export const saveFromShare = mutation({
  args: {
    publicId: v.string(),
    bookmarkId: v.optional(v.id("syncedBookmarks")),
    destinationFolderId: v.optional(v.id("folders")),
  },
  returns: v.object({
    savedCount: v.number(),
    attributedCount: v.number(),
    skippedDuplicateCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    const share = await getShareByPublicId(ctx, args.publicId);
    const now = Date.now();

    if (args.destinationFolderId) {
      const destinationFolder = await ctx.db.get(args.destinationFolderId);
      if (!destinationFolder || destinationFolder.userId !== authUser._id) {
        throw new ConvexError("Invalid destination folder.");
      }
    }

    let bookmarks: Array<Doc<"syncedBookmarks">> = [];

    if (share.resourceType === "bookmark") {
      const bookmark = await getShareBookmark(
        ctx,
        share.resourceId as Id<"syncedBookmarks">,
      );
      if (args.bookmarkId && args.bookmarkId !== bookmark._id) {
        throw new ConvexError("Bookmark is not part of this share.");
      }
      bookmarks = [bookmark];
    } else if (share.resourceType === "folder") {
      const folder = await getShareFolder(
        ctx,
        share.resourceId as Id<"folders">,
      );
      const folderBookmarks = await getPublicFolderBookmarks(ctx, folder);
      bookmarks = args.bookmarkId
        ? folderBookmarks.filter((bookmark) => bookmark._id === args.bookmarkId)
        : folderBookmarks;

      if (args.bookmarkId && bookmarks.length === 0) {
        throw new ConvexError("Bookmark is not part of this share.");
      }
    } else {
      throw new ConvexError("Bookmark groups are not available yet.");
    }

    let attributedCount = 0;
    for (const bookmark of bookmarks) {
      await ctx.runMutation(internal.sync.upsertCaptureFromExtension, {
        userId: authUser._id,
        source: bookmark.source,
        folderId: args.destinationFolderId,
        url: bookmark.url,
        title: bookmark.title,
        text: bookmark.text,
        additionalLinks: bookmark.childLinks,
        tags: bookmark.tags,
        capturedAt: new Date(now).toISOString(),
        visibility: "private",
      });

      const attributed = await recordSaveAttribution(ctx, {
        share,
        bookmark,
        savedBy: authUser._id,
        now,
      });
      if (attributed) {
        attributedCount += 1;
      }
    }

    return {
      savedCount: bookmarks.length,
      attributedCount,
      skippedDuplicateCount: bookmarks.length - attributedCount,
    };
  },
});

export const toggleBookmarkStar = mutation({
  args: {
    bookmarkId: v.id("syncedBookmarks"),
  },
  returns: v.object({
    bookmarkId: v.id("syncedBookmarks"),
    starred: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    const bookmark = await getShareBookmark(ctx, args.bookmarkId);
    const now = Date.now();

    const existingClaim = await ctx.db
      .query("bookmarkStarClaims")
      .withIndex("by_starred_by_and_bookmark", (q) =>
        q.eq("starredBy", authUser._id).eq("bookmarkId", bookmark._id),
      )
      .unique();

    if (existingClaim) {
      await ctx.db.delete(existingClaim._id);
      await bumpBookmarkStarStats(ctx, bookmark, -1, now);
      return {
        bookmarkId: bookmark._id,
        starred: false as const,
      };
    }

    await ctx.db.insert("bookmarkStarClaims", {
      bookmarkId: bookmark._id,
      starredBy: authUser._id,
      bookmarkOwnerId: bookmark.userId,
      createdAt: now,
    });
    await bumpBookmarkStarStats(ctx, bookmark, 1, now);

    return {
      bookmarkId: bookmark._id,
      starred: true as const,
    };
  },
});

export const getBookmarkStarState = query({
  args: {
    bookmarkId: v.id("syncedBookmarks"),
  },
  returns: v.object({
    totalStars: v.number(),
    viewerHasStarred: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    const bookmark = await getShareBookmark(ctx, args.bookmarkId);
    const stats = await ctx.db
      .query("bookmarkStarStats")
      .withIndex("by_bookmark", (q) => q.eq("bookmarkId", bookmark._id))
      .unique();

    const claim = authUser
      ? await ctx.db
          .query("bookmarkStarClaims")
          .withIndex("by_starred_by_and_bookmark", (q) =>
            q.eq("starredBy", authUser._id).eq("bookmarkId", bookmark._id),
          )
          .unique()
      : null;

    return {
      totalStars: stats?.totalStars ?? 0,
      viewerHasStarred: Boolean(claim),
    };
  },
});

export const getShareAnalytics = query({
  args: {
    publicId: v.string(),
  },
  returns: v.object({
    totalSaves: v.number(),
  }),
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    const share = await getShareByPublicId(ctx, args.publicId);
    if (share.sharedBy !== authUser._id) {
      throw new ConvexError("You can only view analytics for your own shares.");
    }

    const stats = await ctx.db
      .query("shareSaveStats")
      .withIndex("by_share", (q) => q.eq("shareId", share._id))
      .unique();

    return {
      totalSaves: stats?.totalSaves ?? 0,
    };
  },
});

export const getBookmarkAnalytics = query({
  args: {
    bookmarkId: v.id("syncedBookmarks"),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    totalAttributedSaves: v.number(),
    totalStars: v.number(),
    viewerHasStarred: v.boolean(),
    topPerformingShares: v.array(topPerformingShareValidator),
  }),
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    const bookmark = await ctx.db.get(args.bookmarkId);
    if (!bookmark || bookmark.userId !== authUser._id) {
      throw new ConvexError("Bookmark not found.");
    }

    const limit = Math.max(1, Math.min(args.limit ?? 5, 25));
    const [stats, starStats, starClaim] = await Promise.all([
      ctx.db
        .query("bookmarkSaveStats")
        .withIndex("by_bookmark", (q) => q.eq("bookmarkId", args.bookmarkId))
        .unique(),
      ctx.db
        .query("bookmarkStarStats")
        .withIndex("by_bookmark", (q) => q.eq("bookmarkId", args.bookmarkId))
        .unique(),
      ctx.db
        .query("bookmarkStarClaims")
        .withIndex("by_starred_by_and_bookmark", (q) =>
          q.eq("starredBy", authUser._id).eq("bookmarkId", args.bookmarkId),
        )
        .unique(),
    ]);
    const shareStats = await ctx.db
      .query("shareBookmarkSaveStats")
      .withIndex("by_bookmark_and_total_saves", (q) =>
        q.eq("bookmarkId", args.bookmarkId),
      )
      .order("desc")
      .take(limit);

    const topPerformingShares = await Promise.all(
      shareStats.map(async (shareStat) => {
        const share = await ctx.db.get(shareStat.shareId);
        return share
          ? {
              publicId: share.publicId,
              resourceType: share.resourceType,
              totalSaves: shareStat.totalSaves,
            }
          : null;
      }),
    );

    return {
      totalAttributedSaves: stats?.totalAttributedSaves ?? 0,
      totalStars: starStats?.totalStars ?? 0,
      viewerHasStarred: Boolean(starClaim),
      topPerformingShares: topPerformingShares.filter(
        (share) => share !== null,
      ),
    };
  },
});

export const getFolderAnalytics = query({
  args: {
    folderId: v.id("folders"),
  },
  returns: v.object({
    totalAttributedSaves: v.number(),
  }),
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.userId !== authUser._id) {
      throw new ConvexError("Folder not found.");
    }

    const bookmarks = await ctx.db
      .query("syncedBookmarks")
      .withIndex("by_user_and_folder", (q) =>
        q.eq("userId", authUser._id).eq("folderId", args.folderId),
      )
      .collect();

    let totalAttributedSaves = 0;
    for (const bookmark of bookmarks) {
      const stats = await ctx.db
        .query("bookmarkSaveStats")
        .withIndex("by_bookmark", (q) => q.eq("bookmarkId", bookmark._id))
        .unique();
      totalAttributedSaves += stats?.totalAttributedSaves ?? 0;
    }

    return { totalAttributedSaves };
  },
});

export const getGroupAnalytics = query({
  args: {
    groupId: v.string(),
  },
  returns: v.object({
    totalAttributedSaves: v.number(),
  }),
  handler: async () => {
    throw new ConvexError("Bookmark groups are not available yet.");
  },
});

export const getUserAnalytics = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.object({
    totalSharesCreated: v.number(),
    totalSavesGenerated: v.number(),
    topPerformingShares: v.array(
      v.object({
        publicId: v.string(),
        resourceType: resourceTypeValidator,
        resourceId: v.string(),
        totalSaves: v.number(),
      }),
    ),
    topPerformingBookmarks: v.array(topPerformingBookmarkValidator),
    topStarredBookmarks: v.array(topStarredBookmarkValidator),
  }),
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    const limit = Math.max(1, Math.min(args.limit ?? 5, 25));

    const [curatorStats, shareStats, bookmarkStats, starredBookmarkStats] =
      await Promise.all([
        ctx.db
          .query("curatorSaveStats")
          .withIndex("by_user", (q) => q.eq("userId", authUser._id))
          .unique(),
        ctx.db
          .query("shareSaveStats")
          .withIndex("by_shared_by_and_total_saves", (q) =>
            q.eq("sharedBy", authUser._id),
          )
          .order("desc")
          .take(limit),
        ctx.db
          .query("bookmarkSaveStats")
          .withIndex("by_owner_and_total_attributed_saves", (q) =>
            q.eq("ownerId", authUser._id),
          )
          .order("desc")
          .take(limit),
        ctx.db
          .query("bookmarkStarStats")
          .withIndex("by_owner_and_total_stars", (q) =>
            q.eq("ownerId", authUser._id),
          )
          .order("desc")
          .take(limit),
      ]);

    const topPerformingShares = await Promise.all(
      shareStats.map(async (stats) => {
        const share = await ctx.db.get(stats.shareId);
        return share
          ? {
              publicId: share.publicId,
              resourceType: share.resourceType,
              resourceId: share.resourceId,
              totalSaves: stats.totalSaves,
            }
          : null;
      }),
    );
    const topPerformingBookmarks = await Promise.all(
      bookmarkStats.map(async (stats) => {
        const bookmark = await ctx.db.get(stats.bookmarkId);
        return bookmark
          ? {
              id: bookmark._id,
              title: bookmark.title,
              url: bookmark.url,
              totalAttributedSaves: stats.totalAttributedSaves,
            }
          : null;
      }),
    );
    const topStarredBookmarks = await Promise.all(
      starredBookmarkStats.map(async (stats) => {
        const bookmark = await ctx.db.get(stats.bookmarkId);
        return bookmark
          ? {
              id: bookmark._id,
              title: bookmark.title,
              url: bookmark.url,
              totalStars: stats.totalStars,
            }
          : null;
      }),
    );

    return {
      totalSharesCreated: curatorStats?.totalSharesCreated ?? 0,
      totalSavesGenerated: curatorStats?.totalSavesGenerated ?? 0,
      topPerformingShares: topPerformingShares.filter(
        (share) => share !== null,
      ),
      topPerformingBookmarks: topPerformingBookmarks.filter(
        (bookmark) => bookmark !== null,
      ),
      topStarredBookmarks: topStarredBookmarks.filter(
        (bookmark) => bookmark !== null,
      ),
    };
  },
});
