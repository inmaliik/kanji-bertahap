// Which furigana a player sees (D-29, D-65). Pure module.
//
// Two rules stack:
// 1. The player's setting: always / after answering / never.
// 2. Anti-leak (D-29): the reading of a target kanji stays hidden while its
//    reading question is still ahead. This always wins over the setting.
// The intro conversation is a teaching moment: target readings may show, and
// "after answering" behaves like "always" because nothing is asked there.

import { FURIGANA_MODE } from "./state.js";
import { hideRuby } from "./ruby.js";

/**
 * @param {Array<{text: string, ruby: string|null}>} segments
 * @param {object} opts
 * @param {string} opts.mode FURIGANA_MODE value
 * @param {boolean} [opts.answered] the question on screen was answered (or there is none)
 * @param {(segment: object) => boolean} [opts.leaks] segments whose reading would give away a pending answer
 * @param {boolean} [opts.intro] intro conversation
 */
export function visibleSegments(segments, { mode, answered = true, leaks = () => false, intro = false }) {
  if (mode === FURIGANA_MODE.NEVER) return hideRuby(segments, () => true);
  if (intro) return segments;
  if (mode === FURIGANA_MODE.AFTER && !answered) return hideRuby(segments, () => true);
  return hideRuby(segments, leaks);
}

/** A leak test for segments containing any of the kanji. */
export const containsAny = (kanji) => (segment) => kanji.some((ch) => segment.text.includes(ch));
