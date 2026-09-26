import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/**
 * Deletes a bookmark together with everything that points at it.
 *
 * `ctx.db.delete` on its own left rows in seven tables holding a
 * `v.id("syncedBookmarks")` that no longer resolves. That wasn't just untidy:
 * the analytics queries `.take(limit)` then drop the nulls, so top-bookmark
 * lists silently returned fewer rows than asked for and eventually went
 * empty, while the headline counters kept reporting the old totals.
 *
 * Returns what it removed so callers can report it.
 */
export async function cascadeDeleteBookmark(
  ctx: MutationCtx,
  bookmark: Doc<"syncedBookmarks">,
) {
  const bookmarkId = bookmark._id;
  const now = Date.now();

  // Attributed saves have to be read before the stats row is deleted — the
  // curator's lifetime total is decremented by exactly this bookmark's share.
  const saveStats = await ctx.db
    .query("bookmarkSaveStats")
    .withIndex("by_bookmark", (q) => q.eq("bookmarkId", bookmarkId))
    .unique();
  const attributedSaves = saveStats?.totalAttributedSaves ?? 0;

  // Every table below indexes bookmarkId directly.
  const byBookmark = [
    "bookmarkSaveStats",
    "bookmarkStarStats",
    "bookmarkStarClaims",
    "bookmarkSaveClaims",
    "shareBookmarkSaveClaims",
    "shareBookmarkSaveStats",
    "notifications",
  ] as const;

  let removed = 0;
  for (const table of byBookmark) {
    const rows = await ctx.db
      .query(table)
      .withIndex("by_bookmark", (q) => q.eq("bookmarkId", bookmarkId))
      .collect();
    for (const row of rows) {
      await ctx.db.delete(row._id);
      removed += 1;
    }
  }

  // shareEvents has no by_bookmark index, but bookmarkId leads
  // by_bookmark_and_type, so a prefix scan works.
  const events = await ctx.db
    .query("shareEvents")
    .withIndex("by_bookmark_and_type", (q) => q.eq("bookmarkId", bookmarkId))
    .collect();
  for (const event of events) {
    await ctx.db.delete(event._id);
    removed += 1;
  }

  // Share links whose whole subject was this bookmark can never resolve again.
  const shares = await ctx.db
    .query("shares")
    .withIndex("by_resource", (q) =>
      q.eq("resourceType", "bookmark").eq("resourceId", bookmarkId as string),
    )
    .collect();
  for (const share of shares) {
    await ctx.db.delete(share._id);
    removed += 1;
  }

  // Keep the curator's headline number consistent with the list beneath it.
  if (attributedSaves > 0) {
    const curator = await ctx.db
      .query("curatorSaveStats")
      .withIndex("by_user", (q) => q.eq("userId", bookmark.userId))
      .unique();
    if (curator) {
      await ctx.db.patch(curator._id, {
        totalSavesGenerated: Math.max(
          0,
          curator.totalSavesGenerated - attributedSaves,
        ),
        updatedAt: now,
      });
    }
  }

  await ctx.db.delete(bookmarkId as Id<"syncedBookmarks">);

  return { relatedRowsRemoved: removed, revokedShares: shares.length };
}
