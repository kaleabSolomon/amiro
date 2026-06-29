import { ConvexError, v } from "convex/values";
import { components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

/* ─── Types ───────────────────────────────────────────────── */

type NotificationType =
  | "bookmark_saved"
  | "bookmark_starred"
  | "new_follower"
  | "followee_bookmark";

/* ─── Validators ──────────────────────────────────────────── */

const notificationTypeValidator = v.union(
  v.literal("bookmark_saved"),
  v.literal("bookmark_starred"),
  v.literal("new_follower"),
  v.literal("followee_bookmark"),
);

const notificationRowValidator = v.object({
  id: v.id("notifications"),
  type: notificationTypeValidator,
  actorId: v.string(),
  actorName: v.string(),
  actorUsername: v.union(v.string(), v.null()),
  actorImage: v.union(v.string(), v.null()),
  bookmarkId: v.union(v.id("syncedBookmarks"), v.null()),
  bookmarkTitle: v.union(v.string(), v.null()),
  bookmarkUrl: v.union(v.string(), v.null()),
  shareId: v.union(v.id("shares"), v.null()),
  read: v.boolean(),
  createdAt: v.number(),
});

/* ─── Internal helpers ────────────────────────────────────── */

async function getActorInfo(ctx: MutationCtx, actorId: string) {
  const actor = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "user",
    where: [{ field: "_id", value: actorId }],
  })) as {
    _id: string;
    name?: string | null;
    username?: string | null;
    image?: string | null;
  } | null;

  if (!actor) {
    return null;
  }

  return {
    name: actor.name ?? "Amiro user",
    username: actor.username ?? undefined,
    image: actor.image ?? undefined,
  };
}

async function isDuplicate(
  ctx: MutationCtx,
  args: {
    recipientId: string;
    type: NotificationType;
    actorId: string;
    bookmarkId?: Id<"syncedBookmarks">;
  },
) {
  const twentyFourHoursAgo = Date.now() - 86_400_000;

  const recent = await ctx.db
    .query("notifications")
    .withIndex("by_recipient_and_created_at", (q) =>
      q
        .eq("recipientId", args.recipientId)
        .gte("createdAt", twentyFourHoursAgo),
    )
    .collect();

  return recent.some(
    (n) =>
      n.type === args.type &&
      n.actorId === args.actorId &&
      n.bookmarkId === args.bookmarkId,
  );
}

/* ─── Internal mutation: createNotification ───────────────── */

export const createNotification = internalMutation({
  args: {
    recipientId: v.string(),
    type: notificationTypeValidator,
    actorId: v.string(),
    bookmarkId: v.optional(v.id("syncedBookmarks")),
    bookmarkTitle: v.optional(v.string()),
    bookmarkUrl: v.optional(v.string()),
    folderId: v.optional(v.id("folders")),
    shareId: v.optional(v.id("shares")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Self-notification guard
    if (args.recipientId === args.actorId) {
      return null;
    }

    // Resolve actor info (denormalized for fast list reads)
    const actor = await getActorInfo(ctx, args.actorId);
    if (!actor) {
      return null;
    }

    // 24-hour deduplication for save/star events
    if (args.type === "bookmark_saved" || args.type === "bookmark_starred") {
      const duplicate = await isDuplicate(ctx, {
        recipientId: args.recipientId,
        type: args.type,
        actorId: args.actorId,
        bookmarkId: args.bookmarkId,
      });
      if (duplicate) {
        return null;
      }
    }

    await ctx.db.insert("notifications", {
      recipientId: args.recipientId,
      type: args.type,
      actorId: args.actorId,
      actorName: actor.name,
      actorUsername: actor.username,
      actorImage: actor.image,
      bookmarkId: args.bookmarkId,
      bookmarkTitle: args.bookmarkTitle,
      bookmarkUrl: args.bookmarkUrl,
      folderId: args.folderId,
      shareId: args.shareId,
      read: false,
      createdAt: Date.now(),
    });

    return null;
  },
});

/* ─── Query: getUnreadCount ───────────────────────────────── */

export const getUnreadCount = query({
  args: {},
  returns: v.object({ count: v.number() }),
  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return { count: 0 };
    }

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_and_read", (q) =>
        q.eq("recipientId", authUser._id).eq("read", false),
      )
      .collect();

    return { count: unread.length };
  },
});

/* ─── Query: getNotifications ─────────────────────────────── */

export const getNotifications = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.object({
    notifications: v.array(notificationRowValidator),
    unreadCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return { notifications: [], unreadCount: 0 };
    }

    const limit = Math.max(1, Math.min(args.limit ?? 50, 100));

    const [rows, unreadRows] = await Promise.all([
      ctx.db
        .query("notifications")
        .withIndex("by_recipient_and_created_at", (q) =>
          q.eq("recipientId", authUser._id),
        )
        .order("desc")
        .take(limit),
      ctx.db
        .query("notifications")
        .withIndex("by_recipient_and_read", (q) =>
          q.eq("recipientId", authUser._id).eq("read", false),
        )
        .collect(),
    ]);

    const notifications = rows.map((n) => ({
      id: n._id,
      type: n.type,
      actorId: n.actorId,
      actorName: n.actorName,
      actorUsername: n.actorUsername ?? null,
      actorImage: n.actorImage ?? null,
      bookmarkId: n.bookmarkId ?? null,
      bookmarkTitle: n.bookmarkTitle ?? null,
      bookmarkUrl: n.bookmarkUrl ?? null,
      shareId: n.shareId ?? null,
      read: n.read,
      createdAt: n.createdAt,
    }));

    return {
      notifications,
      unreadCount: unreadRows.length,
    };
  },
});

/* ─── Mutation: markAsRead ────────────────────────────────── */

export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new ConvexError("Notification not found.");
    }
    if (notification.recipientId !== authUser._id) {
      throw new ConvexError("Not authorized.");
    }

    await ctx.db.patch(args.notificationId, { read: true });
    return null;
  },
});

/* ─── Mutation: markAllAsRead ─────────────────────────────── */

export const markAllAsRead = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_and_read", (q) =>
        q.eq("recipientId", authUser._id).eq("read", false),
      )
      .collect();

    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { read: true })));
    return null;
  },
});

/* ─── Mutation: deleteNotification ───────────────────────── */

export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new ConvexError("Notification not found.");
    }
    if (notification.recipientId !== authUser._id) {
      throw new ConvexError("Not authorized.");
    }

    await ctx.db.delete(args.notificationId);
    return null;
  },
});
