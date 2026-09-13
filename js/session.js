// Question queue for one level. Pure logic: no DOM, no storage. The caller
// persists `entry` whenever onChange() fires.
//
// Flow (decision A6):
//   1. Learning pass: stages 1–4 in order. Each item until answered correctly
//      once. A missed item returns later within the same stage.
//   2. Production (stage 5), if not submitted yet.
//   3. Consolidation: every item not yet mastered, shuffled across stages.
//      A missed item resets to streak 0 and returns REQUEUE_GAP items later.
// Streaks are consecutive correct answers across the whole level, so the
// second correct answer always comes from a later, non-adjacent exposure.

import { STREAK_TO_MASTER, REQUEUE_GAP_MIN, REQUEUE_GAP_MAX, isMastered, evaluateEntry, markPassed } from "./state.js";

export const STAGE_ORDER = ["shape", "kunyomi", "onyomi", "sentence"];

export const PHASE = Object.freeze({
  LEARNING: "learning",
  PRODUCTION: "production",
  CONSOLIDATION: "consolidation",
});

export function shuffle(list, random = Math.random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * @param {object} opts
 * @param {{shape: object[], kunyomi: object[], onyomi: object[], sentence: object[]}} opts.items
 * @param {object} opts.entry level progress entry from state.js (mutated)
 * @param {(stage: string) => boolean} [opts.hasStage] stages that can be played
 * @param {boolean} [opts.hasProduction] whether stage 5 can be played
 * @param {() => number} [opts.random]
 * @param {() => void} [opts.onChange] called after every change to `entry`
 */
export function createLevelSession({
  items,
  entry,
  hasStage = () => true,
  hasProduction = true,
  random = Math.random,
  onChange = () => {},
}) {
  const scored = STAGE_ORDER.flatMap((stage) => items[stage]);
  const playable = STAGE_ORDER.filter(hasStage).flatMap((stage) => items[stage]);
  const missingStages = STAGE_ORDER.filter((stage) => items[stage].length && !hasStage(stage));

  const streakOf = (item) => entry.itemStreaks[item.id] ?? 0;
  const randomGap = () => REQUEUE_GAP_MIN + Math.floor(random() * (REQUEUE_GAP_MAX - REQUEUE_GAP_MIN + 1));

  let phase;
  let queue = [];
  let current = null; // { item, spacer }
  let lastShownId = null;

  function enterLearning() {
    phase = PHASE.LEARNING;
    queue = playable.filter((item) => streakOf(item) < 1); // keeps stage order
  }

  function enterConsolidation() {
    phase = PHASE.CONSOLIDATION;
    queue = shuffle(playable.filter((item) => !isMastered(streakOf(item))), random);
  }

  function afterLearning() {
    if (hasProduction && !entry.productionSubmitted) phase = PHASE.PRODUCTION;
    else enterConsolidation();
  }

  if (!entry.learningDone) enterLearning();
  else afterLearning();

  function progress() {
    const { mastered, total } = evaluateEntry(scored.map((i) => i.id), entry, { requiresProduction: true });
    return { mastered, total };
  }

  function itemStep(item, spacer) {
    current = { item, spacer };
    return { kind: "item", item, phase, spacer, progress: progress() };
  }

  // An already mastered item shown between two exposures of the same item,
  // so the second exposure is never back to back.
  function pickSpacer() {
    const candidates = playable.filter((item) => item.id !== lastShownId && isMastered(streakOf(item)));
    return candidates.length ? candidates[Math.floor(random() * candidates.length)] : null;
  }

  function finish() {
    const result = evaluateEntry(scored.map((i) => i.id), entry, { requiresProduction: true });
    if (result.passed) {
      markPassed(entry);
      onChange();
    }
    return { kind: "done", ...result, missingStages, productionMissing: !hasProduction };
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
        // The level has a single playable item: a repeat cannot be avoided.
      }
    }
    return itemStep(queue[0], false);
  }

  /** @returns {{streak: number, mastered: boolean, willReturn: boolean}} */
  function answer(correct) {
    if (!current) throw new Error("answer() called without a current item");
    const { item, spacer } = current;
    const streak = correct ? streakOf(item) + 1 : 0;
    entry.itemStreaks[item.id] = streak;
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
