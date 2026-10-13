// Level and experience points, derived from progress (D-105). Pure module.

import { buildQuestItems, reviewId } from "./model.js";
import { isMastered, LEVEL_THRESHOLDS, STATUS, XP_PER_MASTERED_ITEM, XP_PER_QUEST, XP_PER_REVIEW } from "./state.js";

/** @returns {{xp: number, mastered: number, quests: number, reviews: number}} */
export function xpOf(model, progress) {
  const itemIds = new Set([...model.quests.values()].flatMap((q) => buildQuestItems(model, q).map((item) => item.id)));
  const mastered = [...itemIds].filter((id) => isMastered(progress.items[id])).length;
  const quests = [...model.quests.values()].filter((q) => progress.quests[q.id]?.status === STATUS.PASSED).length;
  const reviews = model.regions.filter((r) => progress.quests[reviewId(r.chapter)]?.status === STATUS.PASSED).length;
  return { xp: mastered * XP_PER_MASTERED_ITEM + quests * XP_PER_QUEST + reviews * XP_PER_REVIEW, mastered, quests, reviews };
}

/**
 * @returns {{level: number, floor: number, next: number|null}} level starts at
 *   1; `next` is null at the highest level.
 */
export function levelOf(xp) {
  let index = 0;
  while (index + 1 < LEVEL_THRESHOLDS.length && xp >= LEVEL_THRESHOLDS[index + 1]) index += 1;
  return { level: index + 1, floor: LEVEL_THRESHOLDS[index], next: LEVEL_THRESHOLDS[index + 1] ?? null };
}

/** Share of the whole map explored: passed quests and reviews over all of them. */
export function exploration(model, progress) {
  const quests = [...model.quests.values()];
  const done =
    quests.filter((q) => progress.quests[q.id]?.status === STATUS.PASSED).length +
    model.regions.filter((r) => progress.quests[reviewId(r.chapter)]?.status === STATUS.PASSED).length;
  const total = quests.length + model.regions.length;
  return total ? Math.round((done / total) * 100) : 0;
}
