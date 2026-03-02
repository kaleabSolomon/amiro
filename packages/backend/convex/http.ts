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
  parentFolderId: z.string().optional(),
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

    const data = await ctx.runQuery(internal.sync.listFoldersForUser, {
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
