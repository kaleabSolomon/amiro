/**
 * Heuristic format-type tags for the tagging pipeline.
 *
 * Applies `type:*` tags based on a **short, curated, high-confidence table**
 * of well-known hosts and file extensions. These are format facts anyone would
 * agree on — no fuzzy matching, no "looks like a blog" inference.
 *
 * Everything topical is the AI's job; this function only classifies *format*.
 * Returns `[]` on no match (the bookmark falls through to AI tagging).
 */

// ── Host → type:* mapping ───────────────────────────────────────────────────

/** Map of registrable domain (or full hostname) → type tag. */
const HOST_TYPE_MAP = new Map<string, string>([
  // Code hosting
  ["github.com", "type:code"],
  ["gitlab.com", "type:code"],
  ["bitbucket.org", "type:code"],
  ["codeberg.org", "type:code"],
  ["sr.ht", "type:code"],
  ["npmjs.com", "type:code"],
  ["pypi.org", "type:code"],
  ["crates.io", "type:code"],
  ["pkg.go.dev", "type:code"],

  // Video
  ["youtube.com", "type:video"],
  ["youtu.be", "type:video"],
  ["vimeo.com", "type:video"],
  ["dailymotion.com", "type:video"],
  ["twitch.tv", "type:video"],

  // Academic / papers
  ["arxiv.org", "type:paper"],
  ["scholar.google.com", "type:paper"],
  ["semanticscholar.org", "type:paper"],
  ["pubmed.ncbi.nlm.nih.gov", "type:paper"],
  ["doi.org", "type:paper"],
  ["ieee.org", "type:paper"],
  ["acm.org", "type:paper"],

  // Social / threads
  ["x.com", "type:thread"],
  ["twitter.com", "type:thread"],
  ["threads.net", "type:thread"],
  ["mastodon.social", "type:thread"],
  ["bsky.app", "type:thread"],

  // News
  ["news.ycombinator.com", "type:news"],
  ["reddit.com", "type:news"],
  ["lobste.rs", "type:news"],

  // Documentation
  ["developer.mozilla.org", "type:docs"],
  ["docs.python.org", "type:docs"],
  ["docs.oracle.com", "type:docs"],
  ["docs.microsoft.com", "type:docs"],
  ["learn.microsoft.com", "type:docs"],
  ["docs.aws.amazon.com", "type:docs"],
  ["cloud.google.com", "type:docs"],
  ["docs.convex.dev", "type:docs"],

  // Podcast
  ["podcasts.apple.com", "type:podcast"],
  ["open.spotify.com", "type:podcast"], // could also be music, but podcast is more bookmark-y
]);

/**
 * Subdomain patterns that are well-known documentation hosts.
 * Matched against the full hostname.
 */
const DOCS_SUBDOMAIN_SUFFIXES = [
  ".readthedocs.io",
  ".readthedocs.org",
  ".gitbook.io",
  ".github.io", // many project docs are hosted on github.io
];

// ── Extension → type:* mapping ──────────────────────────────────────────────

const EXTENSION_TYPE_MAP = new Map<string, string>([
  // Documents
  [".pdf", "type:pdf"],

  // Images
  [".png", "type:image"],
  [".jpg", "type:image"],
  [".jpeg", "type:image"],
  [".gif", "type:image"],
  [".webp", "type:image"],
  [".svg", "type:image"],
  [".avif", "type:image"],

  // Audio
  [".mp3", "type:audio"],
  [".wav", "type:audio"],
  [".ogg", "type:audio"],
  [".flac", "type:audio"],
  [".m4a", "type:audio"],
]);

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract the registrable domain (eTLD+1-ish) for host map matching.
 * Takes the last two labels. Good enough for our curated map.
 */
function registrableDomain(hostname: string): string {
  const parts = hostname.split(".");
  if (parts.length <= 2) return hostname;
  return parts.slice(-2).join(".");
}

/**
 * Extract file extension from the pathname, if any.
 * Returns lowercase extension including the dot, e.g. ".pdf".
 */
function extractExtension(pathname: string): string {
  // Only look at the last path segment.
  const lastSlash = pathname.lastIndexOf("/");
  const segment = lastSlash >= 0 ? pathname.slice(lastSlash + 1) : pathname;
  const dotIdx = segment.lastIndexOf(".");
  if (dotIdx <= 0) return ""; // no dot, or hidden file (starts with .)
  return segment.slice(dotIdx).toLowerCase();
}

// ── Main export ─────────────────────────────────────────────────────────────

/**
 * Return high-confidence `type:*` tags for the given URL based on curated
 * heuristics. Returns `[]` when no confident match is found.
 *
 * Multiple tags can be returned (e.g. a .pdf on arxiv.org gets both
 * `type:paper` and `type:pdf`).
 */
export function heuristicTypeTags(url: string): string[] {
  const tags = new Set<string>();

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return [];
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");

  // 1. Check the full hostname first (e.g. "developer.mozilla.org").
  const fullHostTag = HOST_TYPE_MAP.get(hostname);
  if (fullHostTag) {
    tags.add(fullHostTag);
  }

  // 2. Check the registrable domain (e.g. "github.com" from "gist.github.com").
  if (!fullHostTag) {
    const domain = registrableDomain(hostname);
    const domainTag = HOST_TYPE_MAP.get(domain);
    if (domainTag) {
      tags.add(domainTag);
    }
  }

  // 3. Check well-known docs subdomain patterns.
  for (const suffix of DOCS_SUBDOMAIN_SUFFIXES) {
    if (hostname.endsWith(suffix)) {
      tags.add("type:docs");
      break;
    }
  }

  // 4. Check file extension.
  const ext = extractExtension(parsed.pathname);
  if (ext) {
    const extTag = EXTENSION_TYPE_MAP.get(ext);
    if (extTag) {
      tags.add(extTag);
    }
  }

  return [...tags];
}
