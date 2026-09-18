"use client";

import { api } from "@amiro/backend/convex/_generated/api";
import type { OptimisticLocalStore } from "convex/browser";
import { useMutation } from "convex/react";

function applyFollowState(following: boolean) {
  return (localStore: OptimisticLocalStore, args: { followeeId: string }) => {
    const followArgs = { userId: args.followeeId };

    const current = localStore.getQuery(api.follows.isFollowing, followArgs);
    if (current !== undefined) {
      localStore.setQuery(api.follows.isFollowing, followArgs, {
        ...current,
        following,
      });
    }

    const count = localStore.getQuery(
      api.follows.getFollowingCount,
      followArgs,
    );
    if (count !== undefined) {
      localStore.setQuery(api.follows.getFollowingCount, followArgs, {
        ...count,
        count: Math.max(0, count.count + (following ? 1 : -1)),
      });
    }
  };
}

/**
 * Follow/unfollow that updates the button and the subscriber count before the
 * round trip completes.
 *
 * Replaces a hand-rolled `optimisticFollowing` state that never released:
 * once set it took precedence over the server value forever, so a change made
 * elsewhere could never correct the button. Convex drops its optimistic layer
 * the moment the real query updates, and rolls back by itself on failure.
 */
export function useToggleFollow() {
  return {
    follow: useMutation(api.follows.followUser).withOptimisticUpdate(
      applyFollowState(true),
    ),
    unfollow: useMutation(api.follows.unfollowUser).withOptimisticUpdate(
      applyFollowState(false),
    ),
  };
}
