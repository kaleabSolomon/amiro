/**
 * URL canonicalization for the tagging pipeline.
 *
 * Produces a stable cache key from a raw URL so that trivially-different
 * variants of the same page collapse to the same canonical string.
 *
 * Rules:
 *  - Lowercase the host, **keep the full subdomain**.
 *  - Drop the `#fragment`.
 *  - Strip tracking params (`utm_*`, `fbclid`, `gclid`, `ref`, `ref_src`, …).
 *  - **Keep content-identifying params** via a per-host allowlist
 *    (`youtube.com?v=`, etc.).
 *  - Sort remaining params alphabetically.
 *  - Trim a single trailing `/` from the pathname (except root `/`).
 *
 * Never throws — returns the raw string trimmed on parse failure.
 */

// ── Tracking params to always strip ─────────────────────────────────────────

const TRACKING_PARAMS = new Set([
  // Google / GA
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "utm_source_platform",
  "utm_creative_format",
  "utm_marketing_tactic",
  "gclid",
  "gclsrc",
  "dclid",
  "gbraid",
  "wbraid",
  // Facebook / Meta
  "fbclid",
  "fb_action_ids",
  "fb_action_types",
  "fb_source",
  "fb_ref",
  // Twitter / X
  "ref_src",
  "ref_url",
  "s", // twitter share param (e.g. ?s=20)
  "t", // twitter t param
  // Generic referral / attribution
  "ref",
  "referrer",
  "source",
  "mc_cid",
  "mc_eid",
  // Misc trackers
  "_ga",
  "_gl",
  "_hsenc",
  "_hsmi",
  "hsa_cam",
  "hsa_grp",
  "hsa_mt",
  "hsa_src",
  "hsa_ad",
  "hsa_acc",
  "hsa_net",
  "hsa_ver",
  "hsa_la",
  "hsa_ol",
  "hsa_kw",
  "hsa_tgt",
  "msclkid",
  "igshid",
  "si", // Spotify / YouTube share ID
]);

// ── Per-host param allowlists (these params identify content, not tracking) ──

type HostAllowlist = ReadonlyMap<string, ReadonlySet<string>>;

const HOST_PARAM_ALLOWLIST: HostAllowlist = new Map([
  ["youtube.com", new Set(["v", "list", "t", "index"])],
  ["youtu.be", new Set(["t"])],
  ["google.com", new Set(["q", "tbm", "tbs"])],
  ["amazon.com", new Set(["dp"])],
  ["open.spotify.com", new Set(["episode", "show"])],
  ["reddit.com", new Set(["sort", "t"])],
  ["stackoverflow.com", new Set(["tab", "answertab"])],
  ["github.com", new Set(["q", "tab", "type"])],
  ["search.brave.com", new Set(["q"])],
  ["duckduckgo.com", new Set(["q"])],
  ["bing.com", new Set(["q"])],
]);

/**
 * Extract the registrable domain (eTLD+1-ish) for allowlist matching.
 * We just take the last two labels, which is good enough for our small map.
 */
function registrableDomain(hostname: string): string {
  const parts = hostname.split(".");
  if (parts.length <= 2) return hostname;
  return parts.slice(-2).join(".");
}

/**
 * Decide whether to keep a search param for the given hostname.
 *
 * A param is kept when:
 *  1. It's NOT in the global tracking-params blocklist, OR
 *  2. It IS in a host-specific allowlist (allowlist wins over blocklist).
 */
function shouldKeepParam(
  paramName: string,
  hostname: string,
  hostAllowlist: HostAllowlist,
): boolean {
  const domain = registrableDomain(hostname);
  const allowed = hostAllowlist.get(domain);

  // If there's a host-specific allowlist and the param is in it, always keep.
  if (allowed?.has(paramName)) return true;

  // Otherwise, strip if it's a known tracker.
  if (TRACKING_PARAMS.has(paramName)) return false;

  // Also strip anything that looks like `utm_*` we might have missed.
  if (paramName.startsWith("utm_")) return false;

  return true;
}

// ── Main export ─────────────────────────────────────────────────────────────

export function canonicalizeUrl(raw: string): {
  canonicalUrl: string;
  hostname: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { canonicalUrl: "", hostname: "" };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    // Unparseable — return as-is so we never throw.
    return { canonicalUrl: trimmed, hostname: "" };
  }

  // Lowercase the host (URL constructor already does this, but be explicit)
  // and strip a leading `www.` — it's near-universally equivalent to the apex,
  // so keeping it would split cache keys for the same page. Other subdomains
  // (blog., experts., docs.) are preserved, since they can be distinct sites.
  let hostname = url.hostname.toLowerCase();
  if (hostname.startsWith("www.") && hostname.length > 4) {
    hostname = hostname.slice(4);
  }
  url.hostname = hostname;

  // Drop fragment.
  url.hash = "";

  // Filter search params: strip trackers, keep content-identifying ones.
  const keptParams: [string, string][] = [];
  for (const [key, value] of url.searchParams) {
    if (shouldKeepParam(key, hostname, HOST_PARAM_ALLOWLIST)) {
      keptParams.push([key, value]);
    }
  }

  // Sort remaining params alphabetically by key for a stable key.
  keptParams.sort((a, b) => a[0].localeCompare(b[0]));

  // Rebuild search string.
  const newSearch = new URLSearchParams(keptParams);
  url.search = newSearch.toString() ? `?${newSearch.toString()}` : "";

  // Trim trailing slash from pathname (but keep root `/`).
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return {
    canonicalUrl: url.toString(),
    hostname,
  };
}
