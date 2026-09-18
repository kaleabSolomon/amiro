import { env } from "@amiro/env/web";

/**
 * Absolute origin used to build share/profile link previews.
 *
 * Crawlers won't resolve relative URLs, so metadataBase has to be a real
 * origin. NEXT_PUBLIC_SITE_URL is optional so nothing breaks if it's unset —
 * we fall back to Vercel's per-deployment host, then to localhost for dev.
 */
export function getSiteUrl() {
  if (env.NEXT_PUBLIC_SITE_URL) {
    return env.NEXT_PUBLIC_SITE_URL;
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}
