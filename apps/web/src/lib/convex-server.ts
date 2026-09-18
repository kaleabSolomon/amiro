import { env } from "@amiro/env/web";
import { ConvexHttpClient } from "convex/browser";
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
} from "convex/server";

const client = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);

/**
 * Runs a *public* Convex query from the server, with no viewer identity.
 *
 * Only for queries that are safe to run unauthenticated — the result is what an
 * anonymous visitor would see, which is exactly right for link previews.
 *
 * Returns null instead of throwing: resolveShare raises a ConvexError for a
 * missing or expired share, and generateMetadata must never take a page down
 * over a preview it couldn't build.
 */
export async function fetchPublicQuery<
  Query extends FunctionReference<"query">,
>(
  query: Query,
  args: FunctionArgs<Query>,
): Promise<FunctionReturnType<Query> | null> {
  try {
    return await client.query(query, args);
  } catch {
    return null;
  }
}
