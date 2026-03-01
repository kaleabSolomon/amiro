import { env } from "@amiro/env/web";
import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

export const {
  handler,
  preloadAuthQuery,
  isAuthenticated,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthNextJs({
  convexUrl: env.NEXT_PUBLIC_CONVEX_URL,
  convexSiteUrl: env.NEXT_PUBLIC_CONVEX_SITE_URL,
});

export async function safeGetToken() {
  try {
    return await getToken();
  } catch (error) {
    console.error("[auth] getToken failed", error);
    return null;
  }
}
