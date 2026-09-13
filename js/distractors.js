// Choice building for stages 1–4. Every option carries a `type` so the log
// can separate answers by the kind of distractor that was chosen.
//
// Rules (DECISIONS.md):
// - Stages 2–3: manual distractors first, then automatic ones. Automatic
//   candidates are readings of kotoba in OTHER levels with the SAME reading
//   type, preferring similar length. Cross-type distractors (e.g. an on'yomi
//   based reading for a kun'yomi word) exist only as manual entries and are
//   always included, so their effect can be measured consistently.
// - Stage 4: manual distractors only. Code cannot tell whether a distractor
//   also fits the sentence, so nothing is generated.

import { OPTION_COUNT } from "./state.js";
import { shuffle } from "./random.js";

export const OPTION_TYPE = Object.freeze({
  ANSWER: "answer",
  MANUAL: "manual",
  MANUAL_CROSS: "manual-cross", // manual, based on the other reading type
  AUTO: "auto",
});

/** Distractors per question: OPTION_COUNT minus the answer. */
export const DISTRACTORS_NEEDED = OPTION_COUNT - 1;

function uniqueExcluding(values, used) {
  const out = [];
  for (const value of values ?? []) {
    if (typeof value !== "string" || used.has(value)) continue;
    used.add(value);
    out.push(value);
  }
  return out;
}

/**
 * Candidate distractors for a kun'yomi/on'yomi item, grouped by origin.
 * Pure: also used by the validator to warn about thin pools.
 */
export function readingDistractorPool(levels, levelId, kotoba) {
  const used = new Set([kotoba.reading]);
  const cross = uniqueExcluding(kotoba.readingDistractorsCross, used);
  const manual = uniqueExcluding(kotoba.readingDistractors, used);
  const autoSource = [];
  for (const level of levels) {
    if (level?.id === levelId || !Array.isArray(level?.kotoba)) continue;
    for (const other of level.kotoba) {
      if (other?.readingType === kotoba.readingType) autoSource.push(other.reading);
    }
  }
  const auto = uniqueExcluding(autoSource, used);
  return { cross, manual, auto };
}

export function sentenceDistractorPool(example) {
  return uniqueExcluding(example.distractors, new Set([example.blank]));
}

const withType = (values, type) => values.map((value) => ({ value, type }));

/** @returns {Array<{value: string, type: string}>} shuffled, answer included */
export function readingOptions(levels, levelId, kotoba, random = Math.random) {
  const pool = readingDistractorPool(levels, levelId, kotoba);
  const lengthGap = (value) => Math.abs(Array.from(value).length - Array.from(kotoba.reading).length);
  const autoByLength = shuffle(pool.auto, random).sort((a, b) => lengthGap(a) - lengthGap(b));
  const picked = [
    ...withType(shuffle(pool.cross, random), OPTION_TYPE.MANUAL_CROSS),
    ...withType(shuffle(pool.manual, random), OPTION_TYPE.MANUAL),
    ...withType(autoByLength, OPTION_TYPE.AUTO),
  ].slice(0, DISTRACTORS_NEEDED);
  return shuffle([{ value: kotoba.reading, type: OPTION_TYPE.ANSWER }, ...picked], random);
}

export function sentenceOptions(example, random = Math.random) {
  const picked = shuffle(sentenceDistractorPool(example), random).slice(0, DISTRACTORS_NEEDED);
  return shuffle(
    [{ value: example.blank, type: OPTION_TYPE.ANSWER }, ...withType(picked, OPTION_TYPE.MANUAL)],
    random
  );
}

export function shapeOptions(level, random = Math.random) {
  return shuffle(
    level.bushuOptions.map((value) => ({
      value,
      type: value === level.bushu.char ? OPTION_TYPE.ANSWER : OPTION_TYPE.MANUAL,
    })),
    random
  );
}
