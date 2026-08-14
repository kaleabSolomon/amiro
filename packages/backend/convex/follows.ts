import { ConvexError, v } from "convex/values";
import { components } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
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
