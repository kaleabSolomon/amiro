import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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
