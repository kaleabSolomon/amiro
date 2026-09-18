"use client";

import { api } from "@amiro/backend/convex/_generated/api";
import { useMutation } from "convex/react";

type StarrableBookmark = {
  id: string;
  totalStars?: number;
  viewerHasStarred?: boolean;
};

/** Flips the star on one bookmark inside a list, leaving the rest untouched. */
function toggleStarIn<T extends StarrableBookmark>(
  bookmarks: readonly T[],
  bookmarkId: string,
): T[] {
  return bookmarks.map((bookmark) => {
    if (bookmark.id !== bookmarkId) {
      return bookmark;
    }
    const starred = bookmark.viewerHasStarred ?? false;
    return {
      ...bookmark,
      viewerHasStarred: !starred,
      totalStars: Math.max(0, (bookmark.totalStars ?? 0) + (starred ? -1 : 1)),
    };
  });
}

/**
 * Star toggle that flips immediately and rolls back on its own if the
 * mutation fails.
 *
 * The same bookmark can be on screen through any of five queries depending on
 * the view, so the optimistic update walks every cached instance of each one
 * rather than guessing which is mounted. Convex discards the optimistic layer
 * as soon as the real query result lands, so there's no stale state to clear.
 */
export function useToggleBookmarkStar() {
  return useMutation(api.sharing.toggleBookmarkStar).withOptimisticUpdate(
    (localStore, args) => {
      const bookmarkId = args.bookmarkId as string;

      for (const { args: queryArgs, value } of localStore.getAllQueries(
        api.dashboard.getBookmarksForFolder,
      )) {
        if (!value) continue;
        localStore.setQuery(
          api.dashboard.getBookmarksForFolder,
          queryArgs,
          toggleStarIn(value, bookmarkId),
        );
      }

      for (const { args: queryArgs, value } of localStore.getAllQueries(
        api.dashboard.getRecentBookmarks,
      )) {
        if (!value) continue;
        localStore.setQuery(
          api.dashboard.getRecentBookmarks,
          queryArgs,
          toggleStarIn(value, bookmarkId),
        );
      }

      for (const { args: queryArgs, value } of localStore.getAllQueries(
        api.dashboard.getSharedBookmarks,
      )) {
        if (!value) continue;
        localStore.setQuery(
          api.dashboard.getSharedBookmarks,
          queryArgs,
          toggleStarIn(value, bookmarkId),
        );
      }

      for (const { args: queryArgs, value } of localStore.getAllQueries(
        api.follows.getFollowingFeed,
      )) {
        if (!value) continue;
        localStore.setQuery(api.follows.getFollowingFeed, queryArgs, {
          ...value,
          bookmarks: toggleStarIn(value.bookmarks, bookmarkId),
        });
      }

      for (const { args: queryArgs, value } of localStore.getAllQueries(
        api.profile.getProfileByUsername,
      )) {
        if (!value) continue;
        localStore.setQuery(api.profile.getProfileByUsername, queryArgs, {
          ...value,
          bookmarks: toggleStarIn(value.bookmarks, bookmarkId),
        });
      }
    },
  );
}
