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
  userProfiles: defineTable({
    userId: v.string(),
    bio: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
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
    icon: v.optional(v.string()),
    visibility: v.optional(v.union(v.literal("private"), v.literal("public"))),
    parentFolderId: v.optional(v.id("folders")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_parent_folder", ["userId", "parentFolderId"]),
  shares: defineTable({
    publicId: v.string(),
    resourceType: v.union(
      v.literal("bookmark"),
      v.literal("folder"),
      v.literal("group"),
    ),
    resourceId: v.string(),
    sharedBy: v.string(),
    visibility: v.union(v.literal("public"), v.literal("unlisted")),
    campaign: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_public_id", ["publicId"])
    .index("by_shared_by", ["sharedBy"])
    .index("by_shared_by_and_created_at", ["sharedBy", "createdAt"])
    .index("by_resource", ["resourceType", "resourceId"])
    .index("by_shared_by_and_resource", [
      "sharedBy",
      "resourceType",
      "resourceId",
    ]),
  shareEvents: defineTable({
    shareId: v.id("shares"),
    publicId: v.string(),
    eventType: v.union(v.literal("save")),
    resourceType: v.union(
      v.literal("bookmark"),
      v.literal("folder"),
      v.literal("group"),
    ),
    resourceId: v.string(),
    bookmarkId: v.optional(v.id("syncedBookmarks")),
    actorUserId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_share_and_type", ["shareId", "eventType"])
    .index("by_bookmark_and_type", ["bookmarkId", "eventType"])
    .index("by_actor_and_bookmark_and_type", [
      "actorUserId",
      "bookmarkId",
      "eventType",
    ])
    .index("by_actor_and_type", ["actorUserId", "eventType"]),
  shareBookmarkSaveClaims: defineTable({
    bookmarkId: v.id("syncedBookmarks"),
    savedBy: v.string(),
    firstShareId: v.id("shares"),
    firstSharedBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_saved_by_and_bookmark", ["savedBy", "bookmarkId"])
    .index("by_bookmark", ["bookmarkId"])
    .index("by_share", ["firstShareId"])
    .index("by_shared_by", ["firstSharedBy"]),
  bookmarkSaveClaims: defineTable({
    bookmarkId: v.id("syncedBookmarks"),
    savedBy: v.string(),
    source: v.union(v.literal("share"), v.literal("profile")),
    firstShareId: v.optional(v.id("shares")),
    firstSharedBy: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_saved_by_and_bookmark", ["savedBy", "bookmarkId"])
    .index("by_bookmark", ["bookmarkId"])
    .index("by_source", ["source"])
    .index("by_share", ["firstShareId"]),
  shareSaveStats: defineTable({
    shareId: v.id("shares"),
    sharedBy: v.string(),
    totalSaves: v.number(),
    updatedAt: v.number(),
  })
    .index("by_share", ["shareId"])
    .index("by_shared_by_and_total_saves", ["sharedBy", "totalSaves"])
    .index("by_total_saves", ["totalSaves"]),
  bookmarkSaveStats: defineTable({
    bookmarkId: v.id("syncedBookmarks"),
    ownerId: v.string(),
    totalAttributedSaves: v.number(),
    updatedAt: v.number(),
  })
    .index("by_bookmark", ["bookmarkId"])
    .index("by_owner_and_total_attributed_saves", [
      "ownerId",
      "totalAttributedSaves",
    ])
    .index("by_total_attributed_saves", ["totalAttributedSaves"]),
  shareBookmarkSaveStats: defineTable({
    shareId: v.id("shares"),
    bookmarkId: v.id("syncedBookmarks"),
    sharedBy: v.string(),
    bookmarkOwnerId: v.string(),
    totalSaves: v.number(),
    updatedAt: v.number(),
  })
    .index("by_share", ["shareId"])
    .index("by_bookmark", ["bookmarkId"])
    .index("by_share_and_bookmark", ["shareId", "bookmarkId"])
    .index("by_bookmark_and_total_saves", ["bookmarkId", "totalSaves"])
    .index("by_share_and_total_saves", ["shareId", "totalSaves"]),
  curatorSaveStats: defineTable({
    userId: v.string(),
    totalSharesCreated: v.number(),
    totalSavesGenerated: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
  bookmarkStarClaims: defineTable({
    bookmarkId: v.id("syncedBookmarks"),
    starredBy: v.string(),
    bookmarkOwnerId: v.string(),
    createdAt: v.number(),
  })
    .index("by_starred_by_and_bookmark", ["starredBy", "bookmarkId"])
    .index("by_bookmark", ["bookmarkId"])
    .index("by_bookmark_owner", ["bookmarkOwnerId"]),
  bookmarkStarStats: defineTable({
    bookmarkId: v.id("syncedBookmarks"),
    ownerId: v.string(),
    totalStars: v.number(),
    updatedAt: v.number(),
  })
    .index("by_bookmark", ["bookmarkId"])
    .index("by_owner_and_total_stars", ["ownerId", "totalStars"])
    .index("by_total_stars", ["totalStars"]),
  syncedBookmarks: defineTable({
    userId: v.string(),
    source: v.union(
      v.literal("chrome"),
      v.literal("telegram"),
      v.literal("instagram"),
      v.literal("twitter"),
    ),
    folderId: v.optional(v.id("folders")),
    visibility: v.optional(v.union(v.literal("private"), v.literal("public"))),
    // When this bookmark was saved from someone else's shared/public bookmark,
    // these record who it came from and when. The saver fully owns this copy —
    // it is not a hard link to the original. Absent for self-created bookmarks.
    savedFromUserId: v.optional(v.string()),
    savedAt: v.optional(v.number()),
    url: v.string(),
    title: v.string(),
    text: v.optional(v.string()),
    childLinks: v.optional(
      v.array(
        v.object({
          url: v.string(),
          title: v.optional(v.string()),
          siteName: v.optional(v.string()),
          description: v.optional(v.string()),
        }),
      ),
    ),
    searchDocument: v.optional(v.string()),
    tags: v.array(v.string()),
    capturedAt: v.number(),
    lastSyncedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_source_and_url", ["userId", "source", "url"])
    .index("by_user_and_folder", ["userId", "folderId"])
    .index("by_user_and_last_synced_at", ["userId", "lastSyncedAt"])
    .index("by_user_and_saved_at", ["userId", "savedAt"])
    .searchIndex("search_by_user_document", {
      searchField: "searchDocument",
      filterFields: ["userId"],
    }),
  notifications: defineTable({
    recipientId: v.string(),
    type: v.union(
      v.literal("bookmark_saved"),
      v.literal("bookmark_starred"),
      v.literal("new_follower"),
      v.literal("followee_bookmark"),
    ),
    actorId: v.string(),
    actorName: v.string(),
    actorUsername: v.optional(v.string()),
    actorImage: v.optional(v.string()),
    // Related resource refs — optional because not all types use all fields
    bookmarkId: v.optional(v.id("syncedBookmarks")),
    bookmarkTitle: v.optional(v.string()),
    bookmarkUrl: v.optional(v.string()),
    folderId: v.optional(v.id("folders")),
    shareId: v.optional(v.id("shares")),
    // State
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_recipient_and_created_at", ["recipientId", "createdAt"])
    .index("by_recipient_and_read", ["recipientId", "read"]),
});
