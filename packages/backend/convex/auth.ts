import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { ConvexError, v } from "convex/values";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import authConfig from "./auth.config";
import { sendPasswordResetEmail } from "./email/sendPasswordResetEmail";
import { sendVerificationEmail } from "./email/sendVerificationEmail";

const siteUrl = process.env.SITE_URL || "http://localhost:3000";

export const authComponent = createClient<DataModel>(components.betterAuth);

function createAuth(ctx: GenericCtx<DataModel>) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  return betterAuth({
    baseURL: siteUrl,
    trustedOrigins: [siteUrl],
    database: authComponent.adapter(ctx),
    ...(googleClientId && googleClientSecret
      ? {
          socialProviders: {
            google: {
              clientId: googleClientId,
              clientSecret: googleClientSecret,
            },
          },
        }
      : {}),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        await sendPasswordResetEmail({
          to: user.email,
          userName: user.name,
          resetUrl: url,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendVerificationEmail({
          to: user.email,
          userName: user.name,
          verificationUrl: url,
        });
      },
    },
    session: {
      // Keep persistent sessions for 30 days when rememberMe=true.
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    plugins: [
      convex({
        authConfig,
        jwksRotateOnTokenGenerationError: true,
      }),
      username(),
    ],
  });
}

export { createAuth };

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.safeGetAuthUser(ctx);
  },
});

export const getActiveSessions = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return [];
    }

    const sessionResults = (await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "session",
        paginationOpts: { cursor: null, numItems: 50 },
        where: [{ field: "userId", value: authUser._id }],
      },
    )) as
      | Array<{
          _id: string;
          userAgent?: string | null;
          ipAddress?: string | null;
          createdAt: number;
          expiresAt: number;
        }>
      | {
          page: Array<{
            _id: string;
            userAgent?: string | null;
            ipAddress?: string | null;
            createdAt: number;
            expiresAt: number;
          }>;
        };

    const sessions = Array.isArray(sessionResults)
      ? sessionResults
      : sessionResults.page;

    return sessions
      .filter((session) => session.expiresAt > Date.now())
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((session) => ({
        id: session._id,
        userAgent: session.userAgent ?? null,
        ipAddress: session.ipAddress ?? null,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      }));
  },
});

export const updateProfile = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (!name) {
      throw new ConvexError("Name cannot be empty.");
    }

    const authUser = await authComponent.getAuthUser(ctx);
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: authUser._id }],
        update: { name },
      },
    });

    return { ok: true };
  },
});
