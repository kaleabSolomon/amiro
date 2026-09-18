import { httpRouter } from "convex/server";
import { z } from "zod";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";

import { authComponent, createAuth } from "./auth";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

const syncCaptureSchema = z.object({
  source: z.enum(["chrome", "telegram", "instagram", "twitter"]),
  folderId: z.string().optional(),
  visibility: z.enum(["private", "public"]).optional(),
  url: z.string().url(),
  title: z.string().min(1),
  text: z.string().optional(),
  additionalLinks: z
    .array(
      z.object({
        url: z.string().url(),
        title: z.string().optional(),
        siteName: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .optional(),
  tags: z.array(z.string()).default([]),
  capturedAt: z.string(),
});

const telegramLinkCompleteSchema = z.object({
  token: z.string().min(1),
  telegramUserId: z.number().int(),
  telegramChatId: z.number().int(),
  telegramUsername: z.string().optional(),
});

const telegramFoldersSchema = z.object({
  telegramUserId: z.number().int(),
});

const telegramCreateFolderSchema = z.object({
  telegramUserId: z.number().int(),
  name: z.string().min(1),
  parentFolderId: z.string().optional(),
});

const telegramBookmarksSchema = z.object({
  telegramUserId: z.number().int(),
  folderId: z.string().optional(),
  limit: z.number().int().positive().max(50).optional(),
});

const telegramSyncSchema = z.object({
  telegramUserId: z.number().int(),
  folderId: z.string().optional(),
  url: z.string().url(),
  title: z.string().min(1),
  text: z.string().optional(),
  additionalLinks: z
    .array(
      z.object({
        url: z.string().url(),
        title: z.string().optional(),
        siteName: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .optional(),
  tags: z.array(z.string()).default([]),
  capturedAt: z.string(),
});

const extensionCreateFolderSchema = z.object({
  name: z.string().min(1),
  icon: z.string().optional(),
  visibility: z.enum(["private", "public"]).optional(),
  parentFolderId: z.string().optional(),
});

const extensionDeleteBookmarkSchema = z.object({
  bookmarkId: z.string().min(1),
});

const extensionMoveBookmarkSchema = z.object({
  bookmarkId: z.string().min(1),
  // Absent / "unfiled" means move to Unfiled (no folder).
  folderId: z.string().optional(),
});

const syncCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Content-Type": "application/json",
};

async function getHttpAuthUserOrNull(
  ctx: Parameters<typeof authComponent.safeGetAuthUser>[0],
) {
  try {
    return await authComponent.safeGetAuthUser(ctx);
  } catch {
    // Better Auth can throw on expired/invalid bearer tokens in HTTP actions.
    return null;
  }
}

function unauthorizedBotResponse() {
  return new Response(
    JSON.stringify({ ok: false, error: "Unauthorized bot request." }),
    { status: 401, headers: syncCorsHeaders },
  );
}

function missingBotSecretResponse() {
  return new Response(
    JSON.stringify({
      ok: false,
      error: "Server misconfigured: TELEGRAM_INTERNAL_SECRET missing.",
    }),
    { status: 500, headers: syncCorsHeaders },
  );
}

http.route({
  path: "/api/extension/sync",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: syncCorsHeaders,
    });
  }),
});

http.route({
  path: "/api/extension/sync",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authUser = await getHttpAuthUserOrNull(ctx);
    if (!authUser) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized." }),
        { status: 401, headers: syncCorsHeaders },
      );
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid JSON body." }),
        { status: 400, headers: syncCorsHeaders },
      );
    }

    const parsed = syncCaptureSchema.safeParse(payload);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Invalid sync payload.",
          issues: parsed.error.issues.map((issue) => issue.message),
        }),
        { status: 400, headers: syncCorsHeaders },
      );
    }

    let result:
      | {
          id: Id<"syncedBookmarks">;
          status: "created" | "updated";
        }
      | undefined;
    try {
      result = await ctx.runMutation(internal.sync.upsertCaptureFromExtension, {
        userId: authUser._id,
        source: parsed.data.source,
        folderId: parsed.data.folderId as Id<"folders"> | undefined,
        visibility: parsed.data.visibility,
        url: parsed.data.url,
        title: parsed.data.title,
        text: parsed.data.text,
        additionalLinks: parsed.data.additionalLinks,
        tags: parsed.data.tags,
        capturedAt: parsed.data.capturedAt,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to sync capture.";
      return new Response(JSON.stringify({ ok: false, error: message }), {
        status: 400,
        headers: syncCorsHeaders,
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        data: result,
      }),
      {
        status: 200,
        headers: syncCorsHeaders,
      },
    );
  }),
});

http.route({
  path: "/api/telegram/link/complete",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const internalSecret = process.env.TELEGRAM_INTERNAL_SECRET;
    if (!internalSecret) {
      return missingBotSecretResponse();
    }

    const authHeader = request.headers.get("Authorization");
    const expected = `Bearer ${internalSecret}`;
    if (authHeader !== expected) {
      return unauthorizedBotResponse();
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid JSON body." }),
        { status: 400, headers: syncCorsHeaders },
      );
    }

    const parsed = telegramLinkCompleteSchema.safeParse(payload);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Invalid link completion payload.",
          issues: parsed.error.issues.map((issue) => issue.message),
        }),
        { status: 400, headers: syncCorsHeaders },
      );
    }

    try {
      const result = await ctx.runMutation(
        internal.dashboard.completeTelegramLink,
        {
          token: parsed.data.token,
          telegramUserId: parsed.data.telegramUserId,
          telegramChatId: parsed.data.telegramChatId,
          telegramUsername: parsed.data.telegramUsername,
        },
      );

      return new Response(JSON.stringify({ ok: true, data: result }), {
        status: 200,
        headers: syncCorsHeaders,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to complete link.";
      return new Response(JSON.stringify({ ok: false, error: message }), {
        status: 400,
        headers: syncCorsHeaders,
      });
    }
  }),
});

http.route({
  path: "/api/telegram/folders",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const internalSecret = process.env.TELEGRAM_INTERNAL_SECRET;
    if (!internalSecret) {
      return missingBotSecretResponse();
    }

    const authHeader = request.headers.get("Authorization");
    const expected = `Bearer ${internalSecret}`;
    if (authHeader !== expected) {
      return unauthorizedBotResponse();
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid JSON body." }),
        { status: 400, headers: syncCorsHeaders },
      );
    }

    const parsed = telegramFoldersSchema.safeParse(payload);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Invalid folder request payload.",
          issues: parsed.error.issues.map((issue) => issue.message),
        }),
        { status: 400, headers: syncCorsHeaders },
      );
    }

    try {
      const userId = await ctx.runQuery(
        internal.dashboard.getLinkedUserIdByTelegramUserId,
        {
          telegramUserId: parsed.data.telegramUserId,
        },
      );
      const data = await ctx.runQuery(internal.sync.listFoldersForUser, {
        userId,
      });
      return new Response(JSON.stringify({ ok: true, data }), {
        status: 200,
        headers: syncCorsHeaders,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load folders.";
      return new Response(JSON.stringify({ ok: false, error: message }), {
        status: 400,
        headers: syncCorsHeaders,
      });
    }
  }),
});

http.route({
  path: "/api/telegram/folders/create",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const internalSecret = process.env.TELEGRAM_INTERNAL_SECRET;
    if (!internalSecret) {
      return missingBotSecretResponse();
    }

    const authHeader = request.headers.get("Authorization");
    const expected = `Bearer ${internalSecret}`;
    if (authHeader !== expected) {
      return unauthorizedBotResponse();
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid JSON body." }),
        { status: 400, headers: syncCorsHeaders },
      );
    }

    const parsed = telegramCreateFolderSchema.safeParse(payload);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Invalid create folder payload.",
          issues: parsed.error.issues.map((issue) => issue.message),
        }),
        { status: 400, headers: syncCorsHeaders },
      );
    }

    try {
      const userId = await ctx.runQuery(
        internal.dashboard.getLinkedUserIdByTelegramUserId,
        {
          telegramUserId: parsed.data.telegramUserId,
        },
      );

      const result = await ctx.runMutation(
        internal.dashboard.createFolderForUser,
        {
          userId,
          name: parsed.data.name,
          parentFolderId: parsed.data.parentFolderId as
            | Id<"folders">
            | undefined,
        },
      );

      return new Response(JSON.stringify({ ok: true, data: result }), {
        status: 200,
        headers: syncCorsHeaders,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create folder.";
      return new Response(JSON.stringify({ ok: false, error: message }), {
        status: 400,
        headers: syncCorsHeaders,
      });
    }
  }),
});

http.route({
  path: "/api/telegram/bookmarks",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const internalSecret = process.env.TELEGRAM_INTERNAL_SECRET;
    if (!internalSecret) {
      return missingBotSecretResponse();
    }

    const authHeader = request.headers.get("Authorization");
    const expected = `Bearer ${internalSecret}`;
    if (authHeader !== expected) {
      return unauthorizedBotResponse();
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid JSON body." }),
        { status: 400, headers: syncCorsHeaders },
      );
    }

    const parsed = telegramBookmarksSchema.safeParse(payload);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Invalid bookmarks payload.",
          issues: parsed.error.issues.map((issue) => issue.message),
        }),
        { status: 400, headers: syncCorsHeaders },
      );
    }

    try {
      const userId = await ctx.runQuery(
        internal.dashboard.getLinkedUserIdByTelegramUserId,
        {
          telegramUserId: parsed.data.telegramUserId,
        },
      );

      const data = await ctx.runQuery(
        internal.sync.listBookmarksForUserFolder,
        {
          userId,
          folderId: parsed.data.folderId as Id<"folders"> | undefined,
          limit: parsed.data.limit,
        },
      );

      return new Response(JSON.stringify({ ok: true, data }), {
        status: 200,
        headers: syncCorsHeaders,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load bookmarks.";
      return new Response(JSON.stringify({ ok: false, error: message }), {
        status: 400,
        headers: syncCorsHeaders,
      });
    }
  }),
});

http.route({
  path: "/api/telegram/sync",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const internalSecret = process.env.TELEGRAM_INTERNAL_SECRET;
    if (!internalSecret) {
      return missingBotSecretResponse();
    }

    const authHeader = request.headers.get("Authorization");
    const expected = `Bearer ${internalSecret}`;
    if (authHeader !== expected) {
      return unauthorizedBotResponse();
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid JSON body." }),
        { status: 400, headers: syncCorsHeaders },
      );
    }

    const parsed = telegramSyncSchema.safeParse(payload);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Invalid sync payload.",
          issues: parsed.error.issues.map((issue) => issue.message),
        }),
        { status: 400, headers: syncCorsHeaders },
      );
    }

    try {
      const userId = await ctx.runQuery(
        internal.dashboard.getLinkedUserIdByTelegramUserId,
        {
          telegramUserId: parsed.data.telegramUserId,
        },
      );

      const result = await ctx.runMutation(
        internal.sync.upsertCaptureFromExtension,
        {
          userId,
          source: "telegram",
          folderId: parsed.data.folderId as Id<"folders"> | undefined,
          url: parsed.data.url,
          title: parsed.data.title,
          text: parsed.data.text,
          additionalLinks: parsed.data.additionalLinks,
          tags: parsed.data.tags,
          capturedAt: parsed.data.capturedAt,
        },
      );

      return new Response(JSON.stringify({ ok: true, data: result }), {
        status: 200,
        headers: syncCorsHeaders,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to sync capture.";
      return new Response(JSON.stringify({ ok: false, error: message }), {
        status: 400,
        headers: syncCorsHeaders,
      });
    }
  }),
});

http.route({
  path: "/api/extension/folders",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: syncCorsHeaders,
    });
  }),
});

http.route({
  path: "/api/extension/folders",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const authUser = await getHttpAuthUserOrNull(ctx);
    if (!authUser) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized." }),
        { status: 401, headers: syncCorsHeaders },
      );
    }

    const data = await ctx.runQuery(internal.sync.listFolderTreeForUser, {
      userId: authUser._id,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        data,
      }),
      { status: 200, headers: syncCorsHeaders },
    );
  }),
});

http.route({
  path: "/api/extension/bookmarks",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: syncCorsHeaders,
    });
  }),
});

http.route({
  path: "/api/extension/bookmarks",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const authUser = await getHttpAuthUserOrNull(ctx);
    if (!authUser) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized." }),
        { status: 401, headers: syncCorsHeaders },
      );
    }

    const url = new URL(request.url);
    const folderIdParam = url.searchParams.get("folderId");
    const limitParam = url.searchParams.get("limit");

    // "unfiled" (or an absent param) means bookmarks with no folder.
    const folderId =
      folderIdParam && folderIdParam !== "unfiled"
        ? (folderIdParam as Id<"folders">)
        : undefined;

    const parsedLimit = limitParam
      ? Number.parseInt(limitParam, 10)
      : undefined;
    const limit =
      parsedLimit !== undefined && Number.isFinite(parsedLimit)
        ? parsedLimit
        : undefined;

    try {
      const data = await ctx.runQuery(
        internal.sync.listBookmarksForUserFolder,
        {
          userId: authUser._id,
          folderId,
          limit,
        },
      );

      return new Response(JSON.stringify({ ok: true, data }), {
        status: 200,
        headers: syncCorsHeaders,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load bookmarks.";
      return new Response(JSON.stringify({ ok: false, error: message }), {
        status: 400,
        headers: syncCorsHeaders,
      });
    }
  }),
});

http.route({
  path: "/api/extension/export",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: syncCorsHeaders });
  }),
});

http.route({
  path: "/api/extension/export",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const authUser = await getHttpAuthUserOrNull(ctx);
    if (!authUser) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized." }),
        { status: 401, headers: syncCorsHeaders },
      );
    }

    try {
      const data = await ctx.runQuery(internal.sync.listAllBookmarksForExport, {
        userId: authUser._id,
      });

      return new Response(JSON.stringify({ ok: true, data }), {
        status: 200,
        headers: syncCorsHeaders,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to export bookmarks.";
      return new Response(JSON.stringify({ ok: false, error: message }), {
        status: 400,
        headers: syncCorsHeaders,
      });
    }
  }),
});

http.route({
  path: "/api/extension/bookmarks/delete",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: syncCorsHeaders });
  }),
});

http.route({
  path: "/api/extension/bookmarks/delete",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authUser = await getHttpAuthUserOrNull(ctx);
    if (!authUser) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized." }),
        { status: 401, headers: syncCorsHeaders },
      );
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid JSON body." }),
        { status: 400, headers: syncCorsHeaders },
      );
    }

    const parsed = extensionDeleteBookmarkSchema.safeParse(payload);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Invalid delete payload.",
          issues: parsed.error.issues.map((issue) => issue.message),
        }),
        { status: 400, headers: syncCorsHeaders },
      );
    }

    try {
      const data = await ctx.runMutation(
        internal.dashboard.deleteBookmarkForUser,
        {
          userId: authUser._id,
          bookmarkId: parsed.data.bookmarkId as Id<"syncedBookmarks">,
        },
      );

      return new Response(JSON.stringify({ ok: true, data }), {
        status: 200,
        headers: syncCorsHeaders,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete bookmark.";
      return new Response(JSON.stringify({ ok: false, error: message }), {
        status: 400,
        headers: syncCorsHeaders,
      });
    }
  }),
});

http.route({
  path: "/api/extension/bookmarks/move",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: syncCorsHeaders });
  }),
});

http.route({
  path: "/api/extension/bookmarks/move",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authUser = await getHttpAuthUserOrNull(ctx);
    if (!authUser) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized." }),
        { status: 401, headers: syncCorsHeaders },
      );
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid JSON body." }),
        { status: 400, headers: syncCorsHeaders },
      );
    }

    const parsed = extensionMoveBookmarkSchema.safeParse(payload);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Invalid move payload.",
          issues: parsed.error.issues.map((issue) => issue.message),
        }),
        { status: 400, headers: syncCorsHeaders },
      );
    }

    const folderId =
      parsed.data.folderId && parsed.data.folderId !== "unfiled"
        ? (parsed.data.folderId as Id<"folders">)
        : undefined;

    try {
      const data = await ctx.runMutation(
        internal.dashboard.moveBookmarkForUser,
        {
          userId: authUser._id,
          bookmarkId: parsed.data.bookmarkId as Id<"syncedBookmarks">,
          folderId,
        },
      );

      return new Response(JSON.stringify({ ok: true, data }), {
        status: 200,
        headers: syncCorsHeaders,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to move bookmark.";
      return new Response(JSON.stringify({ ok: false, error: message }), {
        status: 400,
        headers: syncCorsHeaders,
      });
    }
  }),
});

http.route({
  path: "/api/extension/search",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: syncCorsHeaders });
  }),
});

http.route({
  path: "/api/extension/search",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const authUser = await getHttpAuthUserOrNull(ctx);
    if (!authUser) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized." }),
        { status: 401, headers: syncCorsHeaders },
      );
    }

    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";
    const limitParam = url.searchParams.get("limit");
    const parsedLimit = limitParam
      ? Number.parseInt(limitParam, 10)
      : undefined;
    const limit =
      parsedLimit !== undefined && Number.isFinite(parsedLimit)
        ? parsedLimit
        : undefined;

    try {
      const data = await ctx.runQuery(internal.sync.searchBookmarksForUser, {
        userId: authUser._id,
        query,
        limit,
      });

      return new Response(JSON.stringify({ ok: true, data }), {
        status: 200,
        headers: syncCorsHeaders,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to search.";
      return new Response(JSON.stringify({ ok: false, error: message }), {
        status: 400,
        headers: syncCorsHeaders,
      });
    }
  }),
});

http.route({
  path: "/api/extension/folders",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authUser = await getHttpAuthUserOrNull(ctx);
    if (!authUser) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized." }),
        { status: 401, headers: syncCorsHeaders },
      );
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid JSON body." }),
        { status: 400, headers: syncCorsHeaders },
      );
    }

    const parsed = extensionCreateFolderSchema.safeParse(payload);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Invalid folder payload.",
          issues: parsed.error.issues.map((issue) => issue.message),
        }),
        { status: 400, headers: syncCorsHeaders },
      );
    }

    try {
      const result = await ctx.runMutation(
        internal.dashboard.createFolderForUser,
        {
          userId: authUser._id,
          name: parsed.data.name,
          icon: parsed.data.icon,
          visibility: parsed.data.visibility,
          parentFolderId: parsed.data.parentFolderId as
            | Id<"folders">
            | undefined,
        },
      );

      return new Response(JSON.stringify({ ok: true, data: result }), {
        status: 200,
        headers: syncCorsHeaders,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create folder.";
      return new Response(JSON.stringify({ ok: false, error: message }), {
        status: 400,
        headers: syncCorsHeaders,
      });
    }
  }),
});

export default http;
