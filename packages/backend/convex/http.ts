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
  tags: z.array(z.string()).default([]),
  capturedAt: z.string(),
});

const syncCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Content-Type": "application/json",
};

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
    const authUser = await authComponent.safeGetAuthUser(ctx);
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
    const authUser = await authComponent.safeGetAuthUser(ctx);
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

export default http;
