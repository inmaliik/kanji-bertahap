// Question queue for one quest or one region review. Pure logic: no DOM, no
// storage. The caller persists `streaks` and `entry` whenever onChange() fires.
//
// Flow (A6, D-60):
//   1. Learning pass: items in stage order (shape → reading → test). Each item
//      until answered correctly once. A missed item returns later within the
//      same stage.
//   2. Production, if not submitted yet.
//   3. Consolidation: every item not yet mastered, shuffled across stages.
//      A missed item resets to streak 0 and returns REQUEUE_GAP items later.
// Streaks are consecutive correct answers per item across the whole game, so
// the second correct answer always comes from a later, non-adjacent exposure,
// and a kanji shape mastered in one quest counts as mastered in the next (D-61).
//
// Resuming: nothing about the queue is stored. On reopening, the learning pass
// continues with the items not yet answered correctly, and consolidation with
// the items not yet mastered, so the player continues where they left off.

import { STREAK_TO_MASTER, REQUEUE_GAP_MIN, REQUEUE_GAP_MAX, isMastered, evaluateEntry, markPassed } from "./state.js";
import { shuffle } from "./random.js";

export const STAGE_ORDER = ["shape", "reading", "test"];

export const PHASE = Object.freeze({
  LEARNING: "learning",
  PRODUCTION: "production",
  CONSOLIDATION: "consolidation",
});

/**
 * @param {object} opts
 * @param {Array<{id: string, stage: string}>} opts.items scored items
 * @param {Object<string, number>} opts.streaks item id → streak, shared by all quests (mutated)
 * @param {object} opts.entry quest or review progress entry from state.js (mutated)
 * @param {boolean} [opts.hasProduction] false for reviews
 * @param {boolean} [opts.skipLearning] start directly with the shuffled consolidation queue (reviews)
 * @param {() => number} [opts.random]
 * @param {() => void} [opts.onChange] called after every change to `streaks` or `entry`
 */
export function createSession({
  items,
  streaks,
  entry,
  hasProduction = true,
  skipLearning = false,
  random = Math.random,
  onChange = () => {},
}) {
  const scored = STAGE_ORDER.flatMap((stage) => items.filter((item) => item.stage === stage));
  const scoredIds = scored.map((i) => i.id);

  const streakOf = (item) => streaks[item.id] ?? 0;
  const randomGap = () => REQUEUE_GAP_MIN + Math.floor(random() * (REQUEUE_GAP_MAX - REQUEUE_GAP_MIN + 1));

  let phase;
  let queue = [];
  let current = null; // { item, spacer }
  let lastShownId = null;

  function enterLearning() {
    phase = PHASE.LEARNING;
    queue = scored.filter((item) => streakOf(item) < 1); // keeps stage order
  }

  function enterConsolidation() {
    phase = PHASE.CONSOLIDATION;
    queue = shuffle(scored.filter((item) => !isMastered(streakOf(item))), random);
  }

  function afterLearning() {
    if (hasProduction && !entry.productionSubmitted) phase = PHASE.PRODUCTION;
    else enterConsolidation();
  }

  if (!skipLearning && !entry.learningDone) enterLearning();
  else afterLearning();

  const evaluate = () => evaluateEntry(scoredIds, streaks, entry, { requiresProduction: hasProduction });

  function progress() {
    const { mastered, total } = evaluate();
    return { mastered, total };
  }

  function itemStep(item, spacer) {
    current = { item, spacer };
    return { kind: "item", item, phase, spacer, progress: progress() };
  }

  // An already mastered item shown between two exposures of the same item,
  // so the second exposure is never back to back.
  function pickSpacer() {
    const candidates = scored.filter((item) => item.id !== lastShownId && isMastered(streakOf(item)));
    return candidates.length ? candidates[Math.floor(random() * candidates.length)] : null;
  }

  function finish() {
    const result = evaluate();
    if (result.passed) {
      markPassed(entry);
      onChange();
    }
    return { kind: "done", ...result };
  }

  /** @returns {{kind: "item"|"production"|"done", ...}} */
  function next() {
    if (current) return itemStep(current.item, current.spacer); // not answered yet

    if (phase === PHASE.LEARNING) {
      if (queue.length) return itemStep(queue[0], false);
      entry.learningDone = true;
      onChange();
      afterLearning();
      return next();
    }

    if (phase === PHASE.PRODUCTION) return { kind: "production", phase, progress: progress() };

    if (!queue.length) return finish();
    if (queue[0].id === lastShownId) {
      if (queue.length > 1) {
        queue.splice(1, 0, queue.shift());
      } else {
        const spacer = pickSpacer();
        if (spacer) return itemStep(spacer, true);
        // Only one playable item: a repeat cannot be avoided.
      }
    }
    return itemStep(queue[0], false);
  }

  /** @returns {{streak: number, mastered: boolean, willReturn: boolean}} */
  function answer(correct) {
    if (!current) throw new Error("answer() called without a current item");
    const { item, spacer } = current;
    const streak = correct ? streakOf(item) + 1 : 0;
    streaks[item.id] = streak;
    lastShownId = item.id;
    if (!spacer) queue.shift();

    let willReturn = false;
    if (phase === PHASE.LEARNING) {
      if (!correct) {
        // Return later, but within the same stage.
        let lastSameStage = -1;
        queue.forEach((queued, i) => {
          if (queued.stage === item.stage) lastSameStage = i;
        });
        queue.splice(Math.min(randomGap(), lastSameStage + 1), 0, item);
        willReturn = true;
      }
    } else if (!isMastered(streak)) {
      queue.splice(Math.min(randomGap(), queue.length), 0, item);
      willReturn = true;
    }

    current = null;
    onChange();
    return { streak, mastered: isMastered(streak), willReturn };
  }

  function submitProduction() {
    if (phase !== PHASE.PRODUCTION) throw new Error("submitProduction() outside the production phase");
    entry.productionSubmitted = true;
    onChange();
    enterConsolidation();
  }

  return {
    next,
    answer,
    submitProduction,
    get phase() {
      return phase;
    },
    streakToMaster: STREAK_TO_MASTER,
  };
}
