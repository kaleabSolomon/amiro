/**
 * Presentation helpers for the two-layer tag model.
 *
 * Tags are facet-prefixed at the source: `type:*` (format, from heuristics) and
 * `topic:*` (subject matter, from AI). This module turns raw tag strings into
 * display-ready chips — stripping the prefix, humanizing the label, and hiding
 * retired legacy chips (`source:` / `domain:` / `captured:`) defensively so old
 * rows never render junk while the backfill drains.
 */

export type TagFacet = "type" | "topic" | "plain";

export type DisplayTag = {
  /** Original tag string — use for React keys, filtering, and equality. */
  raw: string;
  facet: TagFacet;
  /** Human-readable label with the facet prefix stripped. */
  label: string;
};

const LEGACY_TAG_PREFIXES = ["source:", "domain:", "captured:"];

/** Legacy derived chips retired by the two-layer tag model. */
export function isLegacyTag(tag: string): boolean {
  return LEGACY_TAG_PREFIXES.some((prefix) => tag.startsWith(prefix));
}

/** `machine-learning` → `Machine learning`. */
function humanize(body: string): string {
  const spaced = body.replace(/-/g, " ").trim();
  if (!spaced) return body;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Parse a raw tag into its facet + display label, or `null` if it's legacy. */
export function toDisplayTag(tag: string): DisplayTag | null {
  if (isLegacyTag(tag)) return null;
  if (tag.startsWith("type:")) {
    return {
      raw: tag,
      facet: "type",
      label: humanize(tag.slice("type:".length)),
    };
  }
  if (tag.startsWith("topic:")) {
    return {
      raw: tag,
      facet: "topic",
      label: humanize(tag.slice("topic:".length)),
    };
  }
  // User free-form tag — keep the label verbatim.
  return { raw: tag, facet: "plain", label: tag };
}

/** Map a tag list to display tags: legacy stripped, de-duplicated, order kept. */
export function toDisplayTags(tags: string[]): DisplayTag[] {
  const out: DisplayTag[] = [];
  const seen = new Set<string>();
  for (const tag of tags) {
    const display = toDisplayTag(tag);
    if (display && !seen.has(display.raw)) {
      seen.add(display.raw);
      out.push(display);
    }
  }
  return out;
}

/** Tailwind surface classes (border + bg + text) for a facet's chip. */
export function tagFacetClass(facet: TagFacet): string {
  switch (facet) {
    case "type":
      // Format facet — quiet outline.
      return "border-border/70 bg-transparent text-muted-foreground";
    case "topic":
      // Subject facet — solid fill to stand out.
      return "border-transparent bg-foreground/10 text-foreground";
    default:
      return "border-border/70 bg-muted/80 text-muted-foreground";
  }
}
