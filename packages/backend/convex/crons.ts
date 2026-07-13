import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// AI topical tagging batch worker (Phase 3). Every 10 minutes it drains pending
// bookmarks through the URL cache + a single batched Gemini request. At this
// cadence we make ~144 requests/day — comfortably under the free-tier 500 RPD /
// 15 RPM ceilings — and topics land within ~10 min of a save.
crons.interval(
  "ai-topic-tagging",
  { minutes: 10 },
  internal.tagging.runTaggingBatch,
  {},
);

export default crons;
