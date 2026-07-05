import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const lookupCachedTags = internalQuery({
  args: { canonicalUrl: v.string() },
  handler: async (ctx, args) => {
    if (!args.canonicalUrl) return null;

    const cached = await ctx.db
      .query("urlTagCache")
      .withIndex("by_canonical_url", (q) =>
        q.eq("canonicalUrl", args.canonicalUrl),
      )
      .unique();

    return cached?.tags ?? null;
  },
});

export const putCachedTags = internalMutation({
  args: {
    canonicalUrl: v.string(),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.canonicalUrl) return;

    const now = Date.now();
    const existing = await ctx.db
      .query("urlTagCache")
      .withIndex("by_canonical_url", (q) =>
        q.eq("canonicalUrl", args.canonicalUrl),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        tags: args.tags,
        hitCount: existing.hitCount + 1,
        lastSeenAt: now,
      });
    } else {
      await ctx.db.insert("urlTagCache", {
        canonicalUrl: args.canonicalUrl,
        tags: args.tags,
        hitCount: 1,
        lastSeenAt: now,
      });
    }
  },
});
