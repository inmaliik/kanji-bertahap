// Region order, locking, completion, and review sampling on the map.
// Pure module: reads content (model) and progress, never writes storage.
//
// Play order (D-55, D-63): region, its review (復習), next region, its
// review, … Regions follow Minna chapter order. A region opens when the
// review of the region before it has passed; its review opens when all its
// quests are passed. Quests inside an open region are free to play in any
// order (D-71). Lock state is derived, never stored (D-23).
//
// Worlds (D-117) open freely: each world's first region is open from the
// start, and the order above runs inside one world only.

import { buildQuestItems, reviewId } from "./model.js";
import { worldChapters } from "./worlds.js";
import { STATUS, computeStatuses, sampleReviewItems, REVIEW_ITEM_COUNT, REVIEW_CURRENT_SHARE } from "./state.js";

export const questPassed = (progress, quest) => progress.quests[quest.id]?.status === STATUS.PASSED;
export const questStarted = (progress, quest) => Boolean(progress.quests[quest.id]);
/** The quest's intro conversation was read to the end: its material may now appear outside it (D-79). */
export const questIntroduced = (progress, quest) => progress.quests[quest.id]?.introDone === true;

/** Play order of one world, or of every region: [{type: "region"|"review", id, region}] */
export function playNodes(model, regions = model.regions) {
  return regions.flatMap((region) => [
    { type: "region", id: region.id, region },
    { type: "review", id: reviewId(region.chapter), region },
  ]);
}

/**
 * @returns {Map<string, string>} node id → STATUS value. A region node counts
 *   as passed when all its quests are passed, which opens its review.
 */
export function nodeStatuses(model, progress) {
  const nodes = new Map(playNodes(model).map((n) => [n.id, n]));
  const stored = (id) => {
    const node = nodes.get(id);
    if (node.type === "review") return progress.quests[id]?.status;
    const { quests } = node.region;
    if (quests.every((q) => questPassed(progress, q))) return STATUS.PASSED;
    if (quests.some((q) => questStarted(progress, q))) return STATUS.IN_PROGRESS;
    return undefined;
  };
  // Each world is its own chain, so every world's first region is open (D-117).
  const statuses = new Map();
  for (const world of model.worlds) {
    for (const [id, status] of computeStatuses(playNodes(model, world.regions), stored)) statuses.set(id, status);
  }
  return statuses;
}

/**
 * A world on the map. `complete` needs every chapter of the world's range in
 * the material and done, so a world with material for only part of its book
 * is never complete; its closing scene waits for the rest (D-116).
 */
export function worldSummary(model, progress, world, statuses = nodeStatuses(model, progress)) {
  const regions = world.regions.map((region) => regionSummary(model, progress, region, statuses));
  const present = new Set(world.regions.map((r) => r.chapter));
  const missing = worldChapters(world).filter((c) => !present.has(c));
  const done = regions.filter((r) => r.state === "done").length;
  return { world, regions, done, total: regions.length, missing, complete: !missing.length && done === regions.length };
}

/**
 * The world the map shows: the one the player last looked at, else the first
 * world with material.
 */
export function currentWorld(model, progress) {
  return model.worlds.find((w) => w.number === progress.world) ?? model.worlds[0];
}

/**
 * Everything the map and the region window show about one region.
 * `percent` counts quests only; the review is a separate mark (D-71).
 */
export function regionSummary(model, progress, region, statuses = nodeStatuses(model, progress)) {
  const passed = region.quests.filter((q) => questPassed(progress, q)).length;
  const total = region.quests.length;
  const reviewStatus = statuses.get(reviewId(region.chapter));
  const regionStatus = statuses.get(region.id);
  const reviewPassed = reviewStatus === STATUS.PASSED;
  let state;
  if (regionStatus === STATUS.LOCKED) state = "locked";
  else if (reviewPassed) state = "done";
  else if (passed === total) state = "review";
  else if (regionStatus === STATUS.IN_PROGRESS) state = "in_progress";
  else state = "available";
  return { region, passed, total, percent: Math.round((passed / total) * 100), reviewStatus, reviewPassed, state };
}

/**
 * Items of a region review: REVIEW_CURRENT_SHARE from the region's quests,
 * the rest from earlier regions of its world, each part balanced across quests. When one
 * side has too few items, the other fills the gap.
 */
export function sampleRegionReview(model, region, random = Math.random, count = REVIEW_ITEM_COUNT) {
  // A shape item shared by several quests (D-61) is sampled at most once.
  const seen = new Set();
  const itemsOf = (quests) =>
    quests.map((q) =>
      buildQuestItems(model, model.quests.get(q.id)).filter((item) => !seen.has(item.id) && seen.add(item.id))
    );
  const current = itemsOf(region.quests);
  // Earlier regions of the same world only: an earlier world may not have been played (D-117).
  const earlier = itemsOf(model.regions.filter((r) => r.world === region.world && r.chapter < region.chapter).flatMap((r) => r.quests));
  const available = (groups) => groups.reduce((n, g) => n + g.length, 0);

  let earlierCount = available(earlier) ? Math.round(count * (1 - REVIEW_CURRENT_SHARE)) : 0;
  let currentCount = count - earlierCount;
  if (available(current) < currentCount) {
    earlierCount = Math.min(available(earlier), earlierCount + currentCount - available(current));
    currentCount = available(current);
  }
  if (available(earlier) < earlierCount) {
    currentCount = Math.min(available(current), currentCount + earlierCount - available(earlier));
    earlierCount = available(earlier);
  }
  return [...sampleReviewItems(current, random, currentCount), ...sampleReviewItems(earlier, random, earlierCount)];
}
