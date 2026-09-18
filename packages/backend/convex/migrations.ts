import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

const BACKFILL_BATCH = 200;

/**
 * One-off backfill for syncedBookmarks.totalStars / totalSaves.
 *
 * Those fields are written going forward by bumpBookmarkStarStats and
 * bumpBookmarkStats, but rows that predate them have neither, and an absent
 * value sorts before 0 in an index — so without this, old bookmarks would
 * cluster at the wrong end of a popularity sort and read back as 0 saves.
 *
 * Self-chunking: pass the returned cursor back in until `isDone` is true, so
 * a large account can't exceed a single mutation's write budget.
 *
 *   npx convex run migrations:backfillBookmarkEngagement '{}'
 */
export const backfillBookmarkEngagement = internalMutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("syncedBookmarks")
      .paginate({ numItems: BACKFILL_BATCH, cursor: args.cursor ?? null });

    let updated = 0;
    for (const bookmark of page.page) {
      if (
        bookmark.totalStars !== undefined &&
        bookmark.totalSaves !== undefined
      ) {
        continue;
      }

      const [saveStats, starStats] = await Promise.all([
        ctx.db
          .query("bookmarkSaveStats")
          .withIndex("by_bookmark", (q) => q.eq("bookmarkId", bookmark._id))
          .unique(),
        ctx.db
          .query("bookmarkStarStats")
          .withIndex("by_bookmark", (q) => q.eq("bookmarkId", bookmark._id))
          .unique(),
      ]);

      await ctx.db.patch(bookmark._id, {
        totalSaves: saveStats?.totalAttributedSaves ?? 0,
        totalStars: starStats?.totalStars ?? 0,
      });
      updated += 1;
    }

    return {
      updated,
      scanned: page.page.length,
      isDone: page.isDone,
      cursor: page.continueCursor,
    };
  },
});
