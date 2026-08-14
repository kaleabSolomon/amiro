import { ConvexError, v } from "convex/values";
import { components } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import { mutation } from "./_generated/server";
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
