import {
  isLegacyTag,
  tagFacetClass,
  toDisplayTag,
  toDisplayTags,
} from "./tag-display";

/**
 * Table-driven tests for the two-layer tag display helpers.
 *
 * Run with: bunx tsx apps/web/src/components/dashboard/tag-display.test.ts
 */

let passed = 0;
let failed = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
  } else {
    failed++;
    console.error(`✗ ${name}\n    expected: ${e}\n    actual:   ${a}`);
  }
}

// ── toDisplayTag: facet detection + label humanization ──────────────────────
const singleCases: Array<{
  input: string;
  expected: ReturnType<typeof toDisplayTag>;
}> = [
  {
    input: "type:video",
    expected: { raw: "type:video", facet: "type", label: "Video" },
  },
  {
    input: "topic:machine-learning",
    expected: {
      raw: "topic:machine-learning",
      facet: "topic",
      label: "Machine learning",
    },
  },
  {
    input: "topic:web-dev",
    expected: { raw: "topic:web-dev", facet: "topic", label: "Web dev" },
  },
  // Free-form user tag — kept verbatim, treated as plain facet.
  {
    input: "reading-list",
    expected: { raw: "reading-list", facet: "plain", label: "reading-list" },
  },
  // Legacy chips are hidden entirely.
  { input: "source:chrome", expected: null },
  { input: "domain:youtube.com", expected: null },
  { input: "captured:2024-01-01", expected: null },
];

for (const { input, expected } of singleCases) {
  check(`toDisplayTag(${input})`, toDisplayTag(input), expected);
}

// ── isLegacyTag ─────────────────────────────────────────────────────────────
check("isLegacyTag source", isLegacyTag("source:chrome"), true);
check("isLegacyTag domain", isLegacyTag("domain:x.com"), true);
check("isLegacyTag captured", isLegacyTag("captured:2024"), true);
check("isLegacyTag type", isLegacyTag("type:pdf"), false);
check("isLegacyTag topic", isLegacyTag("topic:ai"), false);
check("isLegacyTag plain", isLegacyTag("misc"), false);

// ── toDisplayTags: legacy stripped, de-duplicated, order preserved ──────────
check(
  "toDisplayTags strips legacy + keeps order",
  toDisplayTags([
    "type:video",
    "source:chrome",
    "topic:ai",
    "domain:youtube.com",
  ]).map((t) => t.raw),
  ["type:video", "topic:ai"],
);

check(
  "toDisplayTags de-duplicates by raw",
  toDisplayTags(["topic:ai", "topic:ai", "type:pdf"]).map((t) => t.raw),
  ["topic:ai", "type:pdf"],
);

check("toDisplayTags all-legacy → empty", toDisplayTags(["source:x"]), []);

// ── tagFacetClass: distinct surfaces per facet ──────────────────────────────
check(
  "type and topic have distinct classes",
  tagFacetClass("type") !== tagFacetClass("topic"),
  true,
);
check(
  "plain has a class",
  typeof tagFacetClass("plain") === "string" &&
    tagFacetClass("plain").length > 0,
  true,
);

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
