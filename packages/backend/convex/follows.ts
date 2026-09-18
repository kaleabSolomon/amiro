import { ConvexError, v } from "convex/values";
import { components } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

/**
 * The follow graph is a content subscription, not a social metric: following a
 * user opts you into their public saves (surfaced via the Following feed).
 * There are no follower counts and no "X followed you" notification.
 */

/* ─── Helpers ─────────────────────────────────────────────── */

// Confirms a Better Auth user id actually exists before we store an edge to it.
async function userExists(ctx: MutationCtx, userId: string) {
  const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "user",
    where: [{ field: "_id", value: userId }],
  });
  return Boolean(user);
}

/* ─── Mutation: followUser ────────────────────────────────── */

export const followUser = mutation({
  args: {
    followeeId: v.string(),
  },
  returns: v.object({ following: v.boolean() }),
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);

    if (args.followeeId === authUser._id) {
      throw new ConvexError("You can't follow yourself.");
    }

    if (!(await userExists(ctx, args.followeeId))) {
      throw new ConvexError("User not found.");
    }

    // Idempotent: if the edge already exists, treat as a no-op success so the
    // Follow button can call this without worrying about double-taps.
    const existing = await ctx.db
      .query("follows")
      .withIndex("by_follower_and_followee", (q) =>
        q.eq("followerId", authUser._id).eq("followeeId", args.followeeId),
      )
      .unique();

    if (existing) {
      return { following: true };
    }

    await ctx.db.insert("follows", {
      followerId: authUser._id,
      followeeId: args.followeeId,
      createdAt: Date.now(),
    });

    return { following: true };
  },
});

/* ─── Mutation: unfollowUser ──────────────────────────────── */

export const unfollowUser = mutation({
  args: {
    followeeId: v.string(),
  },
  returns: v.object({ following: v.boolean() }),
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);

    // Idempotent: delete the edge if present, no-op otherwise.
    const existing = await ctx.db
      .query("follows")
      .withIndex("by_follower_and_followee", (q) =>
        q.eq("followerId", authUser._id).eq("followeeId", args.followeeId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return { following: false };
  },
});

/* ─── Query: isFollowing ──────────────────────────────────── */

// Drives the Follow button state. Returns false when signed out.
export const isFollowing = query({
  args: {
    userId: v.string(),
  },
  returns: v.object({ following: v.boolean() }),
  handler: async (ctx, args) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return { following: false };
    }

    const edge = await ctx.db
      .query("follows")
      .withIndex("by_follower_and_followee", (q) =>
        q.eq("followerId", authUser._id).eq("followeeId", args.userId),
      )
      .unique();

    return { following: Boolean(edge) };
  },
});

/* ─── Query: getFollowing ─────────────────────────────────── */

// The signed-in user's own subscription list (for a "Following" management
// view). Resolves each followee to display info; bounded to your own follows.
export const getFollowing = query({
  args: {},
  returns: v.array(
    v.object({
      userId: v.string(),
      name: v.string(),
      username: v.union(v.string(), v.null()),
      image: v.union(v.string(), v.null()),
      followedAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return [];
    }

    const edges = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", authUser._id))
      .order("desc")
      .collect();

    const people = await Promise.all(
      edges.map(async (edge) => {
        const user = (await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "user",
            where: [{ field: "_id", value: edge.followeeId }],
          },
        )) as {
          _id: string;
          name?: string | null;
          username?: string | null;
          image?: string | null;
        } | null;

        if (!user) {
          // Followee account was deleted — skip the dangling edge.
          return null;
        }

        return {
          userId: edge.followeeId,
          name: user.name ?? "Amiro user",
          username: user.username ?? null,
          image: user.image ?? null,
          followedAt: edge.createdAt,
        };
      }),
    );

    return people.filter(
      (person): person is NonNullable<typeof person> => person !== null,
    );
  },
});

/* ─── Query: getFollowingCount ────────────────────────────── */

// How many people a user follows. Utilitarian (not a public scoreboard) — there
// is intentionally no follower count.
export const getFollowingCount = query({
  args: {
    userId: v.string(),
  },
  returns: v.object({ count: v.number() }),
  handler: async (ctx, args) => {
    const edges = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.userId))
      .collect();

    return { count: edges.length };
  },
});

/* ─── Query: getFollowingFeed ─────────────────────────────── */

// How many recent bookmarks to scan per followed user before filtering to
// public ones. Bounds the fan-in query for the MVP.
const FEED_PER_USER_SCAN = 25;

async function getFeedEngagement(
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

// The payoff: recent PUBLIC bookmarks from everyone you follow, newest first,
// attributed to the person who saved them. A pull query — no notification
// fan-out. Scales fine for modest follow counts; see FEED_PER_USER_SCAN and the
// scaling note in following.md if that changes.
export const getFollowingFeed = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return { bookmarks: [] };
    }

    const limit = Math.max(1, Math.min(args.limit ?? 30, 50));

    const followees = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", authUser._id))
      .collect();

    if (followees.length === 0) {
      return { bookmarks: [] };
    }

    type Candidate = { doc: Doc<"syncedBookmarks">; folderName: string };
    const candidates: Candidate[] = [];

    for (const edge of followees) {
      const folders = await ctx.db
        .query("folders")
        .withIndex("by_user", (q) => q.eq("userId", edge.followeeId))
        .collect();
      const folderById = new Map(folders.map((folder) => [folder._id, folder]));

      const docs = await ctx.db
        .query("syncedBookmarks")
        .withIndex("by_user_and_last_synced_at", (q) =>
          q.eq("userId", edge.followeeId),
        )
        .order("desc")
        .take(FEED_PER_USER_SCAN);

      for (const doc of docs) {
        if ((doc.visibility ?? "private") !== "public") {
          continue;
        }
        const folder = doc.folderId ? folderById.get(doc.folderId) : null;
        // Public bookmarks only surface when Unfiled or inside a public folder
        // (defensive — matches the profile visibility rule).
        if (doc.folderId && (folder?.visibility ?? "private") !== "public") {
          continue;
        }
        candidates.push({ doc, folderName: folder?.name ?? "Unfiled" });
      }
    }

    candidates.sort((a, b) => b.doc.lastSyncedAt - a.doc.lastSyncedAt);
    const top = candidates.slice(0, limit);

    // Resolve each owner once (feed rows are grouped by a small set of authors).
    const ownerIds = [...new Set(top.map((c) => c.doc.userId))];
    const ownerEntries = await Promise.all(
      ownerIds.map(async (id) => {
        const user = (await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "user",
            where: [{ field: "_id", value: id }],
          },
        )) as {
          _id: string;
          name?: string | null;
          username?: string | null;
          image?: string | null;
        } | null;
        return [id, user] as const;
      }),
    );
    const ownerById = new Map(ownerEntries);

    const bookmarks = await Promise.all(
      top.map(async ({ doc, folderName }) => {
        const owner = ownerById.get(doc.userId);
        const engagement = await getFeedEngagement(ctx, doc, authUser._id);
        return {
          id: doc._id,
          url: doc.url,
          title: doc.title,
          text: doc.text ? doc.text.slice(0, 300) : "",
          tags: doc.tags,
          source: doc.source,
          visibility: doc.visibility ?? ("public" as const),
          folderId: doc.folderId ?? null,
          folderName,
          capturedAt: doc.capturedAt,
          lastSyncedAt: doc.lastSyncedAt,
          owner: {
            id: doc.userId,
            name: owner?.name ?? "Amiro user",
            username: owner?.username ?? null,
            image: owner?.image ?? null,
          },
          ...engagement,
        };
      }),
    );

    return { bookmarks };
  },
});
