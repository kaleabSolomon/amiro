import { v } from "convex/values";
import { components } from "./_generated/api";
import { query } from "./_generated/server";
import { authComponent } from "./auth";

export const getProfileByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    // 1. Find user by username
    const user = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "username", value: args.username }],
    })) as {
      _id: string;
      name: string;
      username?: string | null;
      image?: string | null;
      email: string;
      createdAt: number;
    } | null;

    if (!user) {
      return null;
    }

    // 2. Check if the current logged-in user is the owner
    const authUser = await authComponent.safeGetAuthUser(ctx);
    const isOwner = authUser ? authUser._id === user._id : false;

    // 3. Fetch folders
    const allFolders = await ctx.db
      .query("folders")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // 4. Fetch bookmarks
    const allBookmarks = await ctx.db
      .query("syncedBookmarks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Filter folders and bookmarks based on owner status
    const folders = allFolders
      .filter((folder) => isOwner || folder.visibility === "public")
      .map((folder) => {
        const folderBookmarks = allBookmarks.filter(
          (b) =>
            b.folderId === folder._id && (isOwner || b.visibility === "public"),
        );
        return {
          id: folder._id,
          name: folder.name,
          icon: folder.icon ?? "📁",
          visibility: folder.visibility ?? "private",
          itemCount: folderBookmarks.length,
        };
      });

    const bookmarks = allBookmarks
      .filter((b) => isOwner || b.visibility === "public")
      .map((b) => {
        // Find folder name if folderId exists
        const folder = allFolders.find((f) => f._id === b.folderId);
        return {
          id: b._id,
          url: b.url,
          title: b.title,
          text: b.text ?? "",
          tags: b.tags,
          capturedAt: b.capturedAt,
          lastSyncedAt: b.lastSyncedAt,
          folderId: b.folderId ?? null,
          folderName: folder?.name ?? "Unfiled",
          visibility: b.visibility ?? "private",
          source: b.source,
        };
      });

    return {
      user: {
        id: user._id,
        name: user.name,
        username: user.username ?? null,
        image: user.image ?? null,
        email: isOwner ? user.email : undefined,
        createdAt: user.createdAt,
      },
      folders,
      bookmarks,
      isOwner,
    };
  },
});
