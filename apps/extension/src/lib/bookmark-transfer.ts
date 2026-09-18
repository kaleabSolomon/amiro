import type { BookmarkItem } from "../types/messages";
import { isWebUrl } from "./url";

export type BrowserBookmarkEntry = {
  url: string;
  title: string;
  /** Browser folder path, outermost first. */
  path: string[];
};

function fallbackTitle(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Flattens chrome.bookmarks.getTree() into a de-duplicated list of importable
 * bookmarks, remembering the folder path each one came from.
 *
 * The same URL filed in two places collapses to one entry — the backend
 * upserts on (user, source, url) anyway, so a duplicate would only cost a
 * wasted round trip.
 */
export function flattenBookmarkTree(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
): BrowserBookmarkEntry[] {
  const entries: BrowserBookmarkEntry[] = [];
  const seen = new Set<string>();

  const walk = (node: chrome.bookmarks.BookmarkTreeNode, path: string[]) => {
    if (node.url) {
      if (isWebUrl(node.url) && !seen.has(node.url)) {
        seen.add(node.url);
        entries.push({
          url: node.url,
          title: node.title?.trim() || fallbackTitle(node.url),
          path,
        });
      }
      return;
    }

    // A folder. The unnamed root nodes contribute nothing to the path.
    const nextPath = node.title?.trim()
      ? [...path, node.title.trim()]
      : [...path];

    for (const child of node.children ?? []) {
      walk(child, nextPath);
    }
  };

  for (const node of nodes) {
    walk(node, []);
  }

  return entries;
}

/**
 * The amiro folder an imported bookmark belongs in, or null for Unfiled.
 *
 * The outermost segment is the browser's own container ("Bookmarks bar",
 * "Other bookmarks") which carries no meaning here, so it's dropped: a
 * bookmark sitting loose on the bar lands in Unfiled, and deeper nesting is
 * flattened to one folder per distinct path, since amiro's sidebar is flat.
 */
export function folderNameForPath(path: string[]): string | null {
  const meaningful = path.slice(1).filter((segment) => segment.length > 0);
  return meaningful.length > 0 ? meaningful.join(" / ") : null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Builds a Netscape bookmark file — the format Chrome, Firefox, Safari and
 * every other bookmark tool can import. Tags ride along in the TAGS attribute,
 * which Firefox reads and others ignore harmlessly.
 */
export function buildNetscapeHtml(
  groups: Array<{ folderName: string | null; bookmarks: BookmarkItem[] }>,
) {
  const lines: string[] = [
    "<!DOCTYPE NETSCAPE-Bookmark-file-1>",
    "<!-- This is an automatically generated file. Do not edit. -->",
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    "<TITLE>Bookmarks</TITLE>",
    "<H1>Bookmarks</H1>",
    "<DL><p>",
  ];

  const renderBookmark = (bookmark: BookmarkItem, indent: string) => {
    const addDate = Math.floor(bookmark.capturedAt / 1000);
    const tags = bookmark.tags.length
      ? ` TAGS="${escapeHtml(bookmark.tags.join(","))}"`
      : "";
    lines.push(
      `${indent}<DT><A HREF="${escapeHtml(bookmark.url)}" ADD_DATE="${addDate}"${tags}>${escapeHtml(bookmark.title)}</A>`,
    );
  };

  // Unfiled bookmarks sit at the top level; everything else gets a folder.
  for (const group of groups) {
    if (group.bookmarks.length === 0) {
      continue;
    }

    if (group.folderName === null) {
      for (const bookmark of group.bookmarks) {
        renderBookmark(bookmark, "    ");
      }
      continue;
    }

    lines.push(`    <DT><H3>${escapeHtml(group.folderName)}</H3>`);
    lines.push("    <DL><p>");
    for (const bookmark of group.bookmarks) {
      renderBookmark(bookmark, "        ");
    }
    lines.push("    </DL><p>");
  }

  lines.push("</DL><p>", "");
  return lines.join("\n");
}
