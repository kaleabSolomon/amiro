import { heuristicTypeTags } from "./heuristic_tags";

/**
 * Table-driven tests for heuristic format tags.
 *
 * Run with: npx -y tsx packages/backend/convex/lib/heuristic_tags.test.ts
 */

type TestCase = {
  name: string;
  input: string;
  expected: string[];
};

const cases: TestCase[] = [
  // ── Code hosting ───────────────────────────────────────────────────
  {
    name: "github.com → type:code",
    input: "https://github.com/user/repo",
    expected: ["type:code"],
  },
  {
    name: "gist.github.com → type:code (via registrable domain)",
    input: "https://gist.github.com/user/abc123",
    expected: ["type:code"],
  },
  {
    name: "gitlab.com → type:code",
    input: "https://gitlab.com/group/project",
    expected: ["type:code"],
  },
  {
    name: "bitbucket.org → type:code",
    input: "https://bitbucket.org/team/repo",
    expected: ["type:code"],
  },
  {
    name: "npmjs.com → type:code",
    input: "https://www.npmjs.com/package/convex",
    expected: ["type:code"],
  },
  {
    name: "pypi.org → type:code",
    input: "https://pypi.org/project/requests/",
    expected: ["type:code"],
  },

  // ── Video ──────────────────────────────────────────────────────────
  {
    name: "youtube.com → type:video",
    input: "https://www.youtube.com/watch?v=abc123",
    expected: ["type:video"],
  },
  {
    name: "youtu.be → type:video",
    input: "https://youtu.be/abc123",
    expected: ["type:video"],
  },
  {
    name: "vimeo.com → type:video",
    input: "https://vimeo.com/123456",
    expected: ["type:video"],
  },
  {
    name: "twitch.tv → type:video",
    input: "https://www.twitch.tv/streamer",
    expected: ["type:video"],
  },

  // ── Papers ─────────────────────────────────────────────────────────
  {
    name: "arxiv.org → type:paper",
    input: "https://arxiv.org/abs/2301.12345",
    expected: ["type:paper"],
  },
  {
    name: "arxiv.org PDF gets both type:paper and type:pdf",
    input: "https://arxiv.org/pdf/2301.12345.pdf",
    expected: ["type:paper", "type:pdf"],
  },
  {
    name: "scholar.google.com → type:paper",
    input: "https://scholar.google.com/scholar?q=machine+learning",
    expected: ["type:paper"],
  },
  {
    name: "doi.org → type:paper",
    input: "https://doi.org/10.1000/xyz123",
    expected: ["type:paper"],
  },

  // ── Social / threads ──────────────────────────────────────────────
  {
    name: "x.com → type:thread",
    input: "https://x.com/user/status/123",
    expected: ["type:thread"],
  },
  {
    name: "twitter.com → type:thread",
    input: "https://twitter.com/user/status/123",
    expected: ["type:thread"],
  },
  {
    name: "bsky.app → type:thread",
    input: "https://bsky.app/profile/user.bsky.social/post/abc",
    expected: ["type:thread"],
  },

  // ── News ───────────────────────────────────────────────────────────
  {
    name: "news.ycombinator.com → type:news",
    input: "https://news.ycombinator.com/item?id=12345",
    expected: ["type:news"],
  },
  {
    name: "reddit.com → type:news",
    input: "https://www.reddit.com/r/programming/comments/abc/title",
    expected: ["type:news"],
  },
  {
    name: "lobste.rs → type:news",
    input: "https://lobste.rs/s/abc123/title",
    expected: ["type:news"],
  },

  // ── Documentation ─────────────────────────────────────────────────
  {
    name: "developer.mozilla.org → type:docs",
    input: "https://developer.mozilla.org/en-US/docs/Web/API/fetch",
    expected: ["type:docs"],
  },
  {
    name: "readthedocs.io → type:docs",
    input: "https://flask.readthedocs.io/en/latest/",
    expected: ["type:docs"],
  },
  {
    name: "gitbook.io → type:docs",
    input: "https://myproject.gitbook.io/docs/getting-started",
    expected: ["type:docs"],
  },
  {
    name: "docs.convex.dev → type:docs",
    input: "https://docs.convex.dev/database/schemas",
    expected: ["type:docs"],
  },

  // ── File extensions ───────────────────────────────────────────────
  {
    name: ".pdf → type:pdf",
    input: "https://example.com/paper.pdf",
    expected: ["type:pdf"],
  },
  {
    name: ".png → type:image",
    input: "https://example.com/screenshot.png",
    expected: ["type:image"],
  },
  {
    name: ".jpg → type:image",
    input: "https://example.com/photo.jpg",
    expected: ["type:image"],
  },
  {
    name: ".svg → type:image",
    input: "https://example.com/logo.svg",
    expected: ["type:image"],
  },
  {
    name: ".mp3 → type:audio",
    input: "https://example.com/podcast.mp3",
    expected: ["type:audio"],
  },

  // ── Unknown hosts → empty ─────────────────────────────────────────
  {
    name: "unknown host returns []",
    input: "https://randomsite.io/page",
    expected: [],
  },
  {
    name: "unknown host with no extension returns []",
    input: "https://myblog.com/2024/01/cool-post",
    expected: [],
  },

  // ── Edge cases ────────────────────────────────────────────────────
  {
    name: "invalid URL returns []",
    input: "not-a-url",
    expected: [],
  },
  {
    name: "empty string returns []",
    input: "",
    expected: [],
  },
  {
    name: "www. prefix is stripped before matching",
    input: "https://www.github.com/user/repo",
    expected: ["type:code"],
  },
];

// ── Runner ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

for (const tc of cases) {
  const result = heuristicTypeTags(tc.input);
  const resultSorted = [...result].sort();
  const expectedSorted = [...tc.expected].sort();

  const match =
    resultSorted.length === expectedSorted.length &&
    resultSorted.every((tag, i) => tag === expectedSorted[i]);

  if (match) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${tc.name}`);
    console.error(`  expected: [${tc.expected.join(", ")}]`);
    console.error(`  got:      [${result.join(", ")}]`);
  }
}

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
