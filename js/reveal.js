// What quest material may appear outside its own quest (D-79, extending
// D-29). Pure module.
//
// Principle: the material of a quest is not shown outside that quest before
// the player has read its intro conversation. After that, the kotoba may be
// shown, but its reading only once the reading question is no longer pending
// (quest passed, or reading mastered).

import { itemId, kotobaParts, plainLine } from "./model.js";
import { STREAK_TO_MASTER } from "./state.js";
import { questIntroduced, questPassed } from "./progression.js";
import { isKanji, toHiragana } from "./jp-text.js";

/** kotoba id → the quest that teaches it */
export function questByKotoba(model) {
  return new Map([...model.quests.values()].map((q) => [q.kotoba, q]));
}

/**
 * May the kotoba itself appear outside its quest (region window, index)?
 * Quest kotoba: once their intro was read. Kotoba that are not a quest: once
 * every quest of their region is passed, because their readings may answer a
 * question of that region (a kotoba with 食 read しょく before the 食堂 quest).
 */
export function kotobaVisible(model, progress, kotoba, byKotoba = questByKotoba(model)) {
  const quest = byKotoba.get(kotoba.id);
  if (quest) return questIntroduced(progress, quest) || questPassed(progress, quest);
  const region = model.regions.find((r) => r.chapter === kotoba.chapter);
  return Boolean(region) && region.quests.every((q) => questPassed(progress, q));
}

/** May the kotoba's reading appear outside its quest? */
export function readingSettled(model, progress, kotoba, byKotoba = questByKotoba(model)) {
  const quest = byKotoba.get(kotoba.id);
  if (!quest) return kotobaVisible(model, progress, kotoba, byKotoba);
  if (questPassed(progress, quest)) return true;
  if (!questIntroduced(progress, quest)) return false;
  if (kotoba.readingType === "special") return true; // taught in the intro, never asked
  return (progress.items[itemId.reading(kotoba.id)] ?? 0) >= STREAK_TO_MASTER;
}

/**
 * Leak test for ruby segments: true for a segment that would show the reading
 * of a kanji as it is read in another quest's kotoba whose reading is not
 * settled, e.g. [飲|の] in a line of the 食べます quest while the 飲みます quest is
 * still ahead. The reading of the same kanji in a different kotoba stays
 * visible ([食|た] while 食堂 is pending), because it does not answer that question.
 * @param {object|null} exceptQuest the quest being played, which has its own rule
 */
export function pendingReadingLeaks(model, progress, exceptQuest = null) {
  const byKotoba = questByKotoba(model);
  const pending = [];
  for (const quest of model.quests.values()) {
    if (exceptQuest && quest.id === exceptQuest.id) continue;
    const kotoba = model.kotoba.get(quest.kotoba);
    if (readingSettled(model, progress, kotoba, byKotoba)) continue;
    for (const part of kotobaParts(kotoba.ruby) ?? []) {
      if (part.reading && part.kanji.length) pending.push({ text: part.text, reading: toHiragana(part.reading) });
    }
  }
  return (seg) => seg.ruby !== null && pending.some((p) => seg.text.includes(p.text) && toHiragana(seg.ruby).includes(p.reading));
}

/** Leak tests combined: a segment leaks if any of them says so. */
export const anyLeak = (...tests) => (seg) => tests.some((test) => test(seg));

/** Kotoba the index may show, in content order. */
export function indexKotoba(model, progress) {
  const byKotoba = questByKotoba(model);
  return [...model.kotoba.values()].filter((k) => kotobaVisible(model, progress, k, byKotoba));
}

/** Kanji of those kotoba, in order of first appearance. */
export function indexKanji(kotobaList) {
  return [...new Set(kotobaList.flatMap((k) => Array.from(k.word).filter(isKanji)))];
}

/**
 * May the bushu of a kanji appear outside a quest? It is the answer of the
 * shape question, so only once that item is mastered, or when no quest asks it.
 */
export function shapeSettled(model, progress, kanji) {
  const asking = [...model.quests.values()].filter((q) => q.targetKanji.includes(kanji));
  if (!asking.length) return true;
  if (asking.every((q) => questPassed(progress, q))) return true;
  return (progress.items[itemId.shape(kanji)] ?? 0) >= STREAK_TO_MASTER;
}

/**
 * Reading types of a kanji that must stay hidden in its readings table: a
 * quest kotoba with this kanji and that reading type still has its reading
 * question ahead (whether or not the quest has started).
 * @returns {string[]} subset of ["kunyomi", "onyomi"]
 */
export function pendingReadingTypes(model, progress, kanji) {
  const byKotoba = questByKotoba(model);
  return ["kunyomi", "onyomi"].filter((type) =>
    [...byKotoba.keys()]
      .map((id) => model.kotoba.get(id))
      .some((k) => k.readingType === type && k.word.includes(kanji) && !readingSettled(model, progress, k, byKotoba))
  );
}

/**
 * Conversation lines the player has already seen that show `kotoba`: lines of
 * intro conversations read to the end, and of test conversations answered at
 * least once. A line qualifies if it contains the word, or highlights or
 * blanks the kotoba of its own quest (conjugated forms such as 食べました).
 * @returns {Array<{line: object, conversation: object, quest: object}>}
 */
export function seenLines(model, progress, kotoba) {
  const out = [];
  for (const quest of model.quests.values()) {
    const ownQuest = quest.kotoba === kotoba.id;
    const conversations = [];
    if (questIntroduced(progress, quest) || questPassed(progress, quest)) conversations.push(quest.intro);
    for (const test of quest.tests) {
      if (questPassed(progress, quest) || progress.items[itemId.test(test.id)] !== undefined) conversations.push(test);
    }
    for (const conversation of conversations) {
      for (const line of conversation.lines) {
        if (plainLine(line).includes(kotoba.word) || (ownQuest && (line.highlight || line.blank))) out.push({ line, conversation, quest });
      }
    }
  }
  return out;
}
