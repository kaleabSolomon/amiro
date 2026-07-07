import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { classifyTopics, RateLimitedError, type TagItem } from "./ai/gemini";
import { heuristicTypeTags } from "./lib/heuristic_tags";
import { canonicalizeUrl } from "./lib/url_canonical";
import { buildSearchDocument, normalizeTag } from "./sync";

// How many pending bookmarks one cron tick pulls. One batch → one AI request.
const BATCH_SIZE = 40;
// Chars of body text sent per item as context.
const SNIPPET_MAX = 300;
// Daily safety cap on AI batch requests (well under the primary's 500 RPD).
const DEFAULT_DAILY_CAP = 450;

// ── URL tag cache ────────────────────────────────────────────────────────────

/** Upsert cached topic tags for a canonical URL, bumping the hit counter. */
async function writeUrlTagCache(
  ctx: MutationCtx,
  canonicalUrl: string,
  tags: string[],
) {
  if (!canonicalUrl) return;

  const now = Date.now();
  const existing = await ctx.db
    .query("urlTagCache")
    .withIndex("by_canonical_url", (q) => q.eq("canonicalUrl", canonicalUrl))
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, {
      tags,
      hitCount: existing.hitCount + 1,
      lastSeenAt: now,
    });
  } else {
    await ctx.db.insert("urlTagCache", {
      canonicalUrl,
      tags,
      hitCount: 1,
      lastSeenAt: now,
    });
  }
}

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
    await writeUrlTagCache(ctx, args.canonicalUrl, args.tags);
  },
});

// ── Daily quota ──────────────────────────────────────────────────────────────

function dayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

function dailyCap(): number {
  const raw = process.env.GEMINI_DAILY_CAP;
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_DAILY_CAP;
}

export const quotaRemaining = internalQuery({
  args: {},
  handler: async (ctx) => {
    const key = dayKey(Date.now());
    const doc = await ctx.db
      .query("taggingQuota")
      .withIndex("by_day", (q) => q.eq("dayKey", key))
      .unique();
    const used = doc?.requestCount ?? 0;
    return Math.max(0, dailyCap() - used);
  },
});

export const incrementQuota = internalMutation({
  args: { count: v.number() },
  handler: async (ctx, args) => {
    if (args.count <= 0) return;
    const key = dayKey(Date.now());
    const doc = await ctx.db
      .query("taggingQuota")
      .withIndex("by_day", (q) => q.eq("dayKey", key))
      .unique();
    if (doc) {
      await ctx.db.patch(doc._id, {
        requestCount: doc.requestCount + args.count,
      });
    } else {
      await ctx.db.insert("taggingQuota", {
        dayKey: key,
        requestCount: args.count,
      });
    }
  },
});

// ── Worker queries / mutations ───────────────────────────────────────────────

/** Bookmarks awaiting AI topical tagging. */
export const listPending = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("syncedBookmarks")
      .withIndex("by_tag_status", (q) => q.eq("tagStatus", "pending"))
      .take(args.limit);

    return rows.map((b) => ({
      id: b._id,
      title: b.title,
      url: b.url,
      canonicalUrl: b.canonicalUrl ?? "",
      snippet: (b.text ?? "").slice(0, SNIPPET_MAX),
    }));
  },
});

/**
 * Apply topic tags to bookmarks and update the URL cache.
 *
 * `topics` are already normalized `topic:*` tags. An entry with empty topics
 * marks the bookmark `skipped` (we attempted it — don't re-queue), so the batch
 * always makes forward progress.
 */
export const applyTags = internalMutation({
  args: {
    items: v.array(
      v.object({
        bookmarkId: v.id("syncedBookmarks"),
        topics: v.array(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    for (const item of args.items) {
      const bookmark = await ctx.db.get(item.bookmarkId);
      if (!bookmark) continue;

      const mergedTags = [
        ...new Set(
          [...bookmark.tags, ...item.topics]
            .map(normalizeTag)
            .filter((t) => t.length > 0),
        ),
      ];

      const hasTopic = mergedTags.some((t) => t.startsWith("topic:"));
      const searchDocument = buildSearchDocument({
        source: bookmark.source,
        url: bookmark.url,
        title: bookmark.title,
        text: bookmark.text,
        tags: mergedTags,
        childLinks: bookmark.childLinks,
      });

      await ctx.db.patch(item.bookmarkId, {
        tags: mergedTags,
        searchDocument,
        tagStatus: hasTopic ? "tagged" : "skipped",
      });

      // Cache only real topical results, keyed by the bookmark's canonical URL.
      if (item.topics.length > 0 && bookmark.canonicalUrl) {
        await writeUrlTagCache(ctx, bookmark.canonicalUrl, item.topics);
      }
    }
  },
});

// ── Batch cron orchestrator ──────────────────────────────────────────────────

type PendingRow = {
  id: Id<"syncedBookmarks">;
  title: string;
  url: string;
  canonicalUrl: string;
  snippet: string;
};

export const runTaggingBatch = internalAction({
  args: {},
  handler: async (ctx) => {
    const remaining = await ctx.runQuery(internal.tagging.quotaRemaining, {});
    if (remaining < 1) {
      return { status: "quota-exhausted" as const, tagged: 0 };
    }

    const pending: PendingRow[] = await ctx.runQuery(
      internal.tagging.listPending,
      { limit: BATCH_SIZE },
    );
    if (pending.length === 0) {
      return { status: "idle" as const, tagged: 0 };
    }

    // Group bookmarks by dedup key (canonical URL, falling back to raw URL).
    const groups = new Map<
      string,
      { rep: PendingRow; ids: Id<"syncedBookmarks">[]; canonicalUrl: string }
    >();
    for (const row of pending) {
      const key = row.canonicalUrl || row.url;
      const g = groups.get(key);
      if (g) {
        g.ids.push(row.id);
      } else {
        groups.set(key, {
          rep: row,
          ids: [row.id],
          canonicalUrl: row.canonicalUrl,
        });
      }
    }

    const applyItems: Array<{
      bookmarkId: Id<"syncedBookmarks">;
      topics: string[];
    }> = [];
    const toClassify: TagItem[] = [];

    // Cache recheck: a concurrent save may have populated the cache since the
    // rows were marked pending. Reuse it instead of spending an AI call.
    for (const [key, g] of groups) {
      let cached: string[] | null = null;
      if (g.canonicalUrl) {
        cached = await ctx.runQuery(internal.tagging.lookupCachedTags, {
          canonicalUrl: g.canonicalUrl,
        });
      }
      if (cached) {
        for (const id of g.ids)
          applyItems.push({ bookmarkId: id, topics: cached });
      } else {
        toClassify.push({
          id: key,
          title: g.rep.title,
          url: g.rep.url,
          snippet: g.rep.snippet,
        });
      }
    }

    let requestsMade = 0;
    if (toClassify.length > 0) {
      try {
        const results = await classifyTopics(toClassify);
        requestsMade = 1;

        const topicsByKey = new Map<string, string[]>();
        for (const r of results) topicsByKey.set(r.id, r.topics);

        // Every group we sent gets an apply entry — matched topics or [] (which
        // marks it skipped) — so nothing loops forever.
        for (const item of toClassify) {
          const g = groups.get(item.id);
          if (!g) continue;
          const topics = topicsByKey.get(item.id) ?? [];
          for (const id of g.ids) applyItems.push({ bookmarkId: id, topics });
        }
      } catch (err) {
        if (err instanceof RateLimitedError) {
          // Leave the uncached rows pending; next tick retries. Still apply any
          // cache hits gathered above.
          console.warn("Tagging batch rate-limited; deferring to next tick.");
        } else {
          throw err;
        }
      }
    }

    if (applyItems.length > 0) {
      await ctx.runMutation(internal.tagging.applyTags, { items: applyItems });
    }
    if (requestsMade > 0) {
      await ctx.runMutation(internal.tagging.incrementQuota, {
        count: requestsMade,
      });
    }

    return {
      status: "ok" as const,
      pending: pending.length,
      groups: groups.size,
      applied: applyItems.length,
      requestsMade,
    };
  },
});

// ── One-time backfill / cleanup migration ────────────────────────────────────

// Legacy chip prefixes retired by the two-layer tag model. Stripped on backfill.
const LEGACY_TAG_PREFIXES = ["source:", "domain:", "captured:"];
const BACKFILL_PAGE_SIZE = 100;

/**
 * One-time migration to bring existing bookmarks onto the two-layer tag model.
 *
 * For each row it: strips legacy `source:`/`domain:`/`captured:` chips, recomputes
 * `canonicalUrl` + heuristic `type:*` tags, rebuilds `searchDocument`, and requeues
 * `tagStatus: "pending"` for rows that have no `topic:*` yet (so the cron enriches
 * them over time, throttled by the daily quota). Rows already carrying a `topic:*`
 * become `tagged`; rows already in the pipeline keep their status.
 *
 * Paginated and idempotent: unchanged rows are not rewritten, so it's safe to run
 * repeatedly. Pass `autoContinue: true` (the default) to self-schedule through the
 * whole table from a single kickoff; the response also returns the cursor for
 * manual paging.
 *
 * Kick off from the dashboard / CLI:
 *   npx convex run tagging:backfillTags
 */
export const backfillTags = internalMutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
    batchSize: v.optional(v.number()),
    autoContinue: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const numItems = args.batchSize ?? BACKFILL_PAGE_SIZE;
    const autoContinue = args.autoContinue ?? true;

    const page = await ctx.db
      .query("syncedBookmarks")
      .paginate({ cursor: args.cursor ?? null, numItems });

    let updated = 0;
    for (const bookmark of page.page) {
      const kept = bookmark.tags.filter(
        (t) => !LEGACY_TAG_PREFIXES.some((p) => t.startsWith(p)),
      );
      const { canonicalUrl } = canonicalizeUrl(bookmark.url);
      const typeTags = heuristicTypeTags(bookmark.url);

      const mergedTags = [
        ...new Set(
          [...kept, ...typeTags].map(normalizeTag).filter((t) => t.length > 0),
        ),
      ];

      const hasTopic = mergedTags.some((t) => t.startsWith("topic:"));
      // Has a topic → tagged. Otherwise keep any status already assigned by the
      // pipeline (don't churn `skipped`/`pending`); legacy rows (no status) get
      // queued as `pending` so the cron can enrich them.
      const nextStatus: "pending" | "tagged" | "skipped" = hasTopic
        ? "tagged"
        : (bookmark.tagStatus ?? "pending");

      const nextCanonical = canonicalUrl || undefined;
      const tagsChanged =
        mergedTags.length !== bookmark.tags.length ||
        mergedTags.some((t, i) => t !== bookmark.tags[i]);
      const canonicalChanged =
        (bookmark.canonicalUrl ?? undefined) !== nextCanonical;
      const statusChanged = (bookmark.tagStatus ?? undefined) !== nextStatus;

      // searchDocument is derived from tags — only recompute/write when something
      // actually changed, so reruns over clean rows are free.
      if (!(tagsChanged || canonicalChanged || statusChanged)) {
        continue;
      }

      const searchDocument = buildSearchDocument({
        source: bookmark.source,
        url: bookmark.url,
        title: bookmark.title,
        text: bookmark.text,
        tags: mergedTags,
        childLinks: bookmark.childLinks,
      });

      await ctx.db.patch(bookmark._id, {
        tags: mergedTags,
        canonicalUrl: nextCanonical,
        tagStatus: nextStatus,
        searchDocument,
      });
      updated++;
    }

    if (!page.isDone && autoContinue) {
      await ctx.scheduler.runAfter(0, internal.tagging.backfillTags, {
        cursor: page.continueCursor,
        batchSize: numItems,
        autoContinue: true,
      });
    }

    return {
      processed: page.page.length,
      updated,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});
