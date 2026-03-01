import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  telegramLinkTokens: defineTable({
    token: v.string(),
    userId: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"])
    .index("by_user_and_used_at", ["userId", "usedAt"]),
  telegramConnections: defineTable({
    userId: v.string(),
    telegramUserId: v.number(),
    telegramChatId: v.number(),
    telegramUsername: v.optional(v.string()),
    connectedAt: v.number(),
    updatedAt: v.number(),
    status: v.union(v.literal("active"), v.literal("revoked")),
  })
    .index("by_user", ["userId"])
    .index("by_telegram_user_id", ["telegramUserId"]),
  folders: defineTable({
    userId: v.string(),
    name: v.string(),
    parentFolderId: v.optional(v.id("folders")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_parent_folder", ["userId", "parentFolderId"]),
  syncedBookmarks: defineTable({
    userId: v.string(),
    source: v.union(
      v.literal("chrome"),
      v.literal("telegram"),
      v.literal("instagram"),
      v.literal("twitter"),
    ),
    folderId: v.optional(v.id("folders")),
    url: v.string(),
    title: v.string(),
    text: v.optional(v.string()),
    tags: v.array(v.string()),
    capturedAt: v.number(),
    lastSyncedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_source_and_url", ["userId", "source", "url"])
    .index("by_user_and_folder", ["userId", "folderId"])
    .index("by_user_and_last_synced_at", ["userId", "lastSyncedAt"]),
});
