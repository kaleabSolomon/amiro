/**
 * Gemini client for AI topical tagging.
 *
 * Sends a batch of bookmarks to Gemini and returns per-item `topic:*` tags.
 * Uses the REST API via `fetch` (works in Convex's default action runtime — no
 * `"use node"` and no extra dependency) with native structured output so the
 * response is already valid JSON matching our schema.
 *
 * Rate-limit handling lives here: an ordered model list is walked on
 * 429 / RESOURCE_EXHAUSTED (and transient 5xx). Each model is a *separate* free
 * quota bucket, so falling through stacks their daily allowances. If every model
 * is exhausted, `classifyTopics` throws `RateLimitedError` so the caller can
 * leave the bookmarks `pending` for the next tick.
 */

import { v } from "convex/values";
import { internalAction } from "../_generated/server";

export type TagItem = {
  id: string;
  title: string;
  url: string;
  snippet: string;
};

export type TagResult = {
  id: string;
  /** Normalized `topic:*` tags. */
  topics: string[];
};

/** Thrown when every model in the cascade is rate-limited. */
export class RateLimitedError extends Error {
  constructor(message = "All Gemini models are rate-limited") {
    super(message);
    this.name = "RateLimitedError";
  }
}

// Ordered by preference: primary first, then the +20 RPD overflow buckets.
// Override with GEMINI_MODELS (comma-separated) if the exact ids differ.
const DEFAULT_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-3-flash",
  "gemini-2.5-flash",
];

const MAX_TOPICS_PER_ITEM = 5;
const MAX_TOPIC_LEN = 40;
const SNIPPET_MAX = 300;
const TITLE_MAX = 200;

function getModels(): string[] {
  const raw = process.env.GEMINI_MODELS;
  if (raw) {
    const list = raw
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
    if (list.length > 0) return list;
  }
  return DEFAULT_MODELS;
}

/** Normalize a raw model topic string to a `topic:<kebab>` tag, or null. */
function normalizeTopic(raw: string): string | null {
  let t = raw.trim().toLowerCase();
  if (t.startsWith("topic:")) {
    t = t.slice("topic:".length);
  }
  // Collapse anything non-alphanumeric to single dashes; trim stray dashes.
  t = t.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!t || t.length > MAX_TOPIC_LEN) return null;
  return `topic:${t}`;
}

function normalizeTopics(topics: unknown): string[] {
  if (!Array.isArray(topics)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of topics) {
    if (typeof raw !== "string") continue;
    const n = normalizeTopic(raw);
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(n);
      if (out.length >= MAX_TOPICS_PER_ITEM) break;
    }
  }
  return out;
}

// Gemini structured-output schema (OpenAPI subset; uppercase type names).
const RESPONSE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      id: { type: "STRING" },
      topics: { type: "ARRAY", items: { type: "STRING" } },
    },
    required: ["id", "topics"],
    propertyOrdering: ["id", "topics"],
  },
} as const;

function buildPrompt(items: TagItem[]): string {
  const payload = items.map((it) => ({
    id: it.id,
    title: (it.title ?? "").slice(0, TITLE_MAX),
    url: it.url,
    snippet: (it.snippet ?? "").slice(0, SNIPPET_MAX),
  }));

  return [
    "You are a topical tagger for a bookmarking app.",
    "For each bookmark, output 1 to 5 concise topic tags describing its SUBJECT MATTER.",
    "",
    "Rules:",
    "- Tags name topics/subjects (e.g. machine-learning, personal-finance, rust, climate-change), NOT the format. Never output 'video', 'article', 'pdf', 'website'.",
    "- Lowercase; prefer a single well-known word or a short hyphenated phrase.",
    "- Do NOT include the site name, author, or generic filler (news, blog, online, official).",
    "- If you cannot confidently tag an item, return an empty topics array for it.",
    "- Return exactly one entry per input id, echoing the id verbatim.",
    "",
    "Bookmarks (JSON):",
    JSON.stringify(payload),
  ].join("\n");
}

type CallOutcome =
  | { kind: "ok"; results: TagResult[] }
  | { kind: "rate-limited" };

async function callGemini(
  model: string,
  apiKey: string,
  items: TagItem[],
): Promise<CallOutcome> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: buildPrompt(items) }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });

  // Treat quota and transient server errors as "try the next model".
  if (res.status === 429 || res.status >= 500) {
    return { kind: "rate-limited" };
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Gemini ${model} error ${res.status}: ${body.slice(0, 300)}`,
    );
  }

  const data = (await res.json().catch(() => null)) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  } | null;
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") return { kind: "ok", results: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { kind: "ok", results: [] };
  }
  if (!Array.isArray(parsed)) return { kind: "ok", results: [] };

  const results: TagResult[] = [];
  for (const entry of parsed) {
    if (
      entry &&
      typeof entry === "object" &&
      typeof (entry as { id?: unknown }).id === "string"
    ) {
      results.push({
        id: (entry as { id: string }).id,
        topics: normalizeTopics((entry as { topics?: unknown }).topics),
      });
    }
  }
  return { kind: "ok", results };
}

/**
 * Classify a batch of bookmarks into `topic:*` tags.
 *
 * Walks the model cascade on rate-limit/transient errors. Returns per-id topic
 * arrays (empty array for items the model declined). Throws `RateLimitedError`
 * only when *every* model is exhausted, and throws on hard/config errors
 * (missing key, 4xx other than 429).
 */
export async function classifyTopics(items: TagItem[]): Promise<TagResult[]> {
  if (items.length === 0) return [];

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const models = getModels();
  let anyRateLimited = false;

  for (const model of models) {
    const outcome = await callGemini(model, apiKey, items);
    if (outcome.kind === "rate-limited") {
      anyRateLimited = true;
      continue; // fall through to the next model's separate quota bucket
    }
    return outcome.results;
  }

  if (anyRateLimited) {
    throw new RateLimitedError();
  }
  return [];
}

/**
 * Thin internalAction wrapper so the classifier can be exercised directly from
 * the Convex dashboard (e.g. for manual testing / debugging). The batch cron
 * calls `classifyTopics` in-process rather than through this hop.
 */
export const classifyTopicsAction = internalAction({
  args: {
    items: v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        url: v.string(),
        snippet: v.string(),
      }),
    ),
  },
  handler: async (_ctx, args) => {
    return await classifyTopics(args.items);
  },
});
