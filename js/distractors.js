// Choice building for the shape, reading and context-test questions. Every
// option carries a `type` so the log can separate answers by the kind of
// distractor that was chosen.
//
// Rules (DECISIONS.md):
// - Reading: manual distractors first, then automatic ones. Automatic
//   candidates are readings of OTHER kotoba that share no kanji with this one
//   and have the SAME reading type, preferring similar length. Cross-type
//   distractors (e.g. an on'yomi based reading for a kun'yomi word) exist only
//   as manual entries and are always included, so their effect can be
//   measured consistently.
// - Context test (the blank in a conversation line): manual distractors only.
//   Code cannot tell whether a distractor also fits the conversation, so
//   nothing is generated.

import { OPTION_COUNT } from "./state.js";
import { shuffle } from "./random.js";
import { isKanji } from "./jp-text.js";

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

const kanjiOf = (word) => new Set(Array.from(typeof word === "string" ? word : "").filter(isKanji));

/**
 * Candidate distractors for a reading item, grouped by origin.
 * Pure: also used by the validator to warn about thin pools.
 * @param {object[]} allKotoba every kotoba in the content
 */
export function readingDistractorPool(allKotoba, kotoba) {
  const used = new Set([kotoba.reading]);
  const cross = uniqueExcluding(kotoba.readingDistractorsCross, used);
  const manual = uniqueExcluding(kotoba.readingDistractors, used);
  // Kotoba sharing a kanji are left out: their reading of that kanji may be
  // the very contrast the player is learning.
  const own = kanjiOf(kotoba.word);
  const autoSource = (allKotoba ?? [])
    .filter((other) => other && other !== kotoba && other.readingType === kotoba.readingType)
    .filter((other) => ![...kanjiOf(other.word)].some((ch) => own.has(ch)))
    .map((other) => other.reading);
  const auto = uniqueExcluding(autoSource, used);
  return { cross, manual, auto };
}

/** Distractors of the blank line in a test conversation. */
export function blankDistractorPool(line) {
  return uniqueExcluding(line.distractors, new Set([line.blank]));
}

const withType = (values, type) => values.map((value) => ({ value, type }));

/** @returns {Array<{value: string, type: string}>} shuffled, answer included */
export function readingOptions(allKotoba, kotoba, random = Math.random) {
  const pool = readingDistractorPool(allKotoba, kotoba);
  const lengthGap = (value) => Math.abs(Array.from(value).length - Array.from(kotoba.reading).length);
  const autoByLength = shuffle(pool.auto, random).sort((a, b) => lengthGap(a) - lengthGap(b));
  const picked = [
    ...withType(shuffle(pool.cross, random), OPTION_TYPE.MANUAL_CROSS),
    ...withType(shuffle(pool.manual, random), OPTION_TYPE.MANUAL),
    ...withType(autoByLength, OPTION_TYPE.AUTO),
  ].slice(0, DISTRACTORS_NEEDED);
  return shuffle([{ value: kotoba.reading, type: OPTION_TYPE.ANSWER }, ...picked], random);
}

export function blankOptions(line, random = Math.random) {
  const picked = shuffle(blankDistractorPool(line), random).slice(0, DISTRACTORS_NEEDED);
  return shuffle([{ value: line.blank, type: OPTION_TYPE.ANSWER }, ...withType(picked, OPTION_TYPE.MANUAL)], random);
}

/** @param {object} kanji kanji entry with bushu and bushuOptions */
export function shapeOptions(kanji, random = Math.random) {
  return shuffle(
    kanji.bushuOptions.map((value) => ({
      value,
      type: value === kanji.bushu.char ? OPTION_TYPE.ANSWER : OPTION_TYPE.MANUAL,
    })),
    random
  );
}
