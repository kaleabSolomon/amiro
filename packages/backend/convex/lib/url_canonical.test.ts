import { canonicalizeUrl } from "./url_canonical";

/**
 * Table-driven tests for URL canonicalization.
 *
 * Run with: npx tsx packages/backend/convex/lib/url_canonical.test.ts
 */

type TestCase = {
  name: string;
  input: string;
  expected: { canonicalUrl: string; hostname: string };
};

const cases: TestCase[] = [
  // ── Basic normalization ────────────────────────────────────────────
  {
    name: "lowercases host",
    input: "https://Example.COM/path",
    expected: {
      canonicalUrl: "https://example.com/path",
      hostname: "example.com",
    },
  },
  {
    name: "drops fragment",
    input: "https://example.com/page#section-3",
    expected: {
      canonicalUrl: "https://example.com/page",
      hostname: "example.com",
    },
  },
  {
    name: "trims trailing slash",
    input: "https://example.com/path/",
    expected: {
      canonicalUrl: "https://example.com/path",
      hostname: "example.com",
    },
  },
  {
    name: "keeps root slash",
    input: "https://example.com/",
    expected: {
      canonicalUrl: "https://example.com/",
      hostname: "example.com",
    },
  },

  // ── Tracking params stripped ────────────────────────────────────────
  {
    name: "strips utm_* params",
    input:
      "https://example.com/article?utm_source=twitter&utm_medium=social&id=123",
    expected: {
      canonicalUrl: "https://example.com/article?id=123",
      hostname: "example.com",
    },
  },
  {
    name: "strips fbclid",
    input: "https://example.com/page?fbclid=abc123&key=value",
    expected: {
      canonicalUrl: "https://example.com/page?key=value",
      hostname: "example.com",
    },
  },
  {
    name: "strips gclid",
    input: "https://example.com/page?gclid=xyz789",
    expected: {
      canonicalUrl: "https://example.com/page",
      hostname: "example.com",
    },
  },
  {
    name: "strips ref and ref_src",
    input: "https://example.com/page?ref=homepage&ref_src=twsrc",
    expected: {
      canonicalUrl: "https://example.com/page",
      hostname: "example.com",
    },
  },
  {
    name: "strips mc_cid and mc_eid",
    input: "https://example.com/page?mc_cid=abc&mc_eid=def",
    expected: {
      canonicalUrl: "https://example.com/page",
      hostname: "example.com",
    },
  },
  {
    name: "strips igshid",
    input: "https://instagram.com/p/abc123?igshid=xyz",
    expected: {
      canonicalUrl: "https://instagram.com/p/abc123",
      hostname: "instagram.com",
    },
  },

  // ── Content-identifying params kept ────────────────────────────────
  {
    name: "keeps YouTube ?v= param (and strips www.)",
    input:
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&utm_source=share&si=abc123",
    expected: {
      canonicalUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ",
      hostname: "youtube.com",
    },
  },
  {
    name: "keeps YouTube ?list= param",
    input: "https://youtube.com/watch?v=abc&list=PLdef&utm_campaign=winter",
    expected: {
      canonicalUrl: "https://youtube.com/watch?list=PLdef&v=abc",
      hostname: "youtube.com",
    },
  },
  {
    name: "keeps Google ?q= param (and strips www.)",
    input: "https://www.google.com/search?q=convex+database&gclid=xyz&tbm=isch",
    expected: {
      canonicalUrl: "https://google.com/search?q=convex+database&tbm=isch",
      hostname: "google.com",
    },
  },

  // ── www. stripped, other subdomains preserved ──────────────────────
  {
    name: "strips leading www.",
    input: "https://www.example.com/path",
    expected: {
      canonicalUrl: "https://example.com/path",
      hostname: "example.com",
    },
  },
  {
    name: "www. and apex collapse to the same key",
    input: "https://www.example.com/article?utm_source=x",
    expected: {
      canonicalUrl: "https://example.com/article",
      hostname: "example.com",
    },
  },
  {
    name: "does not strip non-www subdomains (www2.)",
    input: "https://www2.example.com/path",
    expected: {
      canonicalUrl: "https://www2.example.com/path",
      hostname: "www2.example.com",
    },
  },

  // ── Subdomains preserved ───────────────────────────────────────────
  {
    name: "preserves subdomain - experts.xyz.com",
    input: "https://experts.xyz.com/jobs/123",
    expected: {
      canonicalUrl: "https://experts.xyz.com/jobs/123",
      hostname: "experts.xyz.com",
    },
  },
  {
    name: "preserves subdomain - blog.xyz.com",
    input: "https://blog.xyz.com/posts/456",
    expected: {
      canonicalUrl: "https://blog.xyz.com/posts/456",
      hostname: "blog.xyz.com",
    },
  },
  {
    name: "different subdomains produce different keys",
    input: "https://docs.example.com/api",
    expected: {
      canonicalUrl: "https://docs.example.com/api",
      hostname: "docs.example.com",
    },
  },

  // ── Two tracking-only variants collapse to the same key ────────────
  {
    name: "variant A of same article (with utm_source=twitter)",
    input:
      "https://blog.example.com/post/123?utm_source=twitter&utm_medium=social",
    expected: {
      canonicalUrl: "https://blog.example.com/post/123",
      hostname: "blog.example.com",
    },
  },
  {
    name: "variant B of same article (with utm_source=newsletter & fbclid)",
    input:
      "https://blog.example.com/post/123?utm_source=newsletter&fbclid=abc123",
    expected: {
      canonicalUrl: "https://blog.example.com/post/123",
      hostname: "blog.example.com",
    },
  },

  // ── Params are sorted for stability ────────────────────────────────
  {
    name: "sorts params alphabetically",
    input: "https://example.com/search?z=last&a=first&m=middle",
    expected: {
      canonicalUrl: "https://example.com/search?a=first&m=middle&z=last",
      hostname: "example.com",
    },
  },

  // ── Edge cases ─────────────────────────────────────────────────────
  {
    name: "empty string",
    input: "",
    expected: { canonicalUrl: "", hostname: "" },
  },
  {
    name: "whitespace-only string",
    input: "   ",
    expected: { canonicalUrl: "", hostname: "" },
  },
  {
    name: "unparseable URL returns trimmed raw",
    input: "not-a-url",
    expected: { canonicalUrl: "not-a-url", hostname: "" },
  },
  {
    name: "URL with leading/trailing whitespace",
    input: "  https://example.com/page  ",
    expected: {
      canonicalUrl: "https://example.com/page",
      hostname: "example.com",
    },
  },
  {
    name: "URL with only tracking params has clean search removed",
    input: "https://example.com/article?utm_source=twitter&fbclid=abc",
    expected: {
      canonicalUrl: "https://example.com/article",
      hostname: "example.com",
    },
  },
];

// ── Runner ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

for (const tc of cases) {
  const result = canonicalizeUrl(tc.input);
  const urlMatch = result.canonicalUrl === tc.expected.canonicalUrl;
  const hostMatch = result.hostname === tc.expected.hostname;

  if (urlMatch && hostMatch) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${tc.name}`);
    if (!urlMatch) {
      console.error("  canonicalUrl:");
      console.error(`    expected: ${tc.expected.canonicalUrl}`);
      console.error(`    got:      ${result.canonicalUrl}`);
    }
    if (!hostMatch) {
      console.error("  hostname:");
      console.error(`    expected: ${tc.expected.hostname}`);
      console.error(`    got:      ${result.hostname}`);
    }
  }
}

// Verify the two tracking variants collapse to the same key.
const variantA = canonicalizeUrl(
  "https://blog.example.com/post/123?utm_source=twitter&utm_medium=social",
);
const variantB = canonicalizeUrl(
  "https://blog.example.com/post/123?utm_source=newsletter&fbclid=abc123",
);
if (variantA.canonicalUrl === variantB.canonicalUrl) {
  passed++;
} else {
  failed++;
  console.error("FAIL: two tracking variants should collapse to the same key");
  console.error(`  A: ${variantA.canonicalUrl}`);
  console.error(`  B: ${variantB.canonicalUrl}`);
}

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
