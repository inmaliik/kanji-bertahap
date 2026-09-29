// Content model of schema v2: regions → quests → conversations, plus the
// kanji and kotoba tables they refer to. Everything that links kanji and
// kotoba is derived here from the data, never written twice by the team.
// Pure module: used by the validator (Node) and the UI.

import { parseRuby, alignReading } from "./ruby.js";
import { isKanji } from "./jp-text.js";

/** Region id shown in logs and routes, derived from the Minna chapter: 6 → "B06". */
export const regionId = (chapter) => `B${String(chapter).padStart(2, "0")}`;

/** Review node id of a region: "REV-B06". Quest ids may not start with "REV-". */
export const reviewId = (chapter) => `REV-${regionId(chapter)}`;

// Stable item ids derived from content, never from array positions (D-05).
// The shape of a kanji is one item across all quests: mastering 学 in 学生
// also masters it for 大学 (D-61).
export const itemId = {
  shape: (kanji) => `K:${kanji}:shape`,
  reading: (kotobaId) => `W:${kotobaId}:reading`,
  test: (conversationId) => `C:${conversationId}:test`,
  production: (questId) => `Q:${questId}:production`,
};

/**
 * Split a kotoba's ruby markup into parts with the reading of each kanji.
 * "[食|しょく][堂|どう]" → 食/しょく, 堂/どう; "[食|た]べます" → 食/た, べます.
 * A ruby over several kanji that cannot be split ("[今日|きょう]") stays one
 * part whose `kanji` lists every kanji in it.
 * @returns {Array<{text: string, reading: string|null, kanji: string[]}>|null} null on syntax errors
 */
export function kotobaParts(ruby) {
  let segments;
  try {
    ({ segments } = parseRuby(ruby));
  } catch {
    return null;
  }
  const parts = [];
  for (const seg of segments) {
    if (seg.ruby === null) {
      parts.push({ text: seg.text, reading: null, kanji: Array.from(seg.text).filter(isKanji) });
      continue;
    }
    // "[食べ|たべ]" is split into 食/た and べ by the okurigana.
    const runs = alignReading(seg.text, seg.ruby) ?? [{ text: seg.text, ruby: seg.ruby }];
    for (const run of runs) {
      parts.push({ text: run.text, reading: run.ruby, kanji: Array.from(run.text).filter(isKanji) });
    }
  }
  return parts;
}

/** Reading of one kanji inside a kotoba, or null when it is not written separately. */
export function kanjiReadingIn(kotoba, kanji) {
  const part = (kotobaParts(kotoba.ruby) ?? []).find((p) => p.text === kanji);
  return part ? part.reading : null;
}

/** Plain text of every conversation line: ruby markup removed. */
export function plainLine(line) {
  try {
    return parseRuby(line.ja).plain;
  } catch {
    return line.ja;
  }
}

/** Conversations of a quest with their role. */
export function questConversations(quest) {
  return [
    ...(quest.intro ? [{ role: "intro", conversation: quest.intro }] : []),
    ...(quest.tests ?? []).map((conversation) => ({ role: "test", conversation })),
  ];
}

/**
 * Lookup tables over validated content.
 * @returns {{
 *   regions: object[],               // sorted by chapter, each with `id`
 *   quests: Map<string, object>,     // quest id → { ...quest, region }
 *   kotoba: Map<string, object>,     // kotoba id → kotoba
 *   kanji: Map<string, object>,      // kanji → kanji entry
 *   conversations: Map<string, {conversation: object, quest: object, role: string}>,
 *   kotobaByKanji: Map<string, object[]>, // kanji → kotoba containing it, in data order
 * }}
 */
export function buildModel(content) {
  const regions = [...content.regions]
    .sort((a, b) => a.chapter - b.chapter)
    .map((region) => ({ ...region, id: regionId(region.chapter) }));

  const quests = new Map();
  const conversations = new Map();
  for (const region of regions) {
    for (const quest of region.quests) {
      const entry = { ...quest, region };
      quests.set(quest.id, entry);
      for (const { role, conversation } of questConversations(quest)) {
        conversations.set(conversation.id, { conversation, quest: entry, role });
      }
    }
  }

  const kotoba = new Map(content.kotoba.map((k) => [k.id, k]));
  const kanji = new Map(content.kanji.map((k) => [k.char, k]));

  const kotobaByKanji = new Map();
  for (const k of content.kotoba) {
    for (const ch of new Set(Array.from(k.word).filter(isKanji))) {
      if (!kotobaByKanji.has(ch)) kotobaByKanji.set(ch, []);
      kotobaByKanji.get(ch).push(k);
    }
  }

  return { regions, quests, kotoba, kanji, conversations, kotobaByKanji };
}

/**
 * Scored items of one quest, in stage order: the shape of each target kanji,
 * the reading of the kotoba (not for readingType "special"), and one context
 * test per test conversation (D-60, D-61).
 * @param {ReturnType<typeof buildModel>} model
 * @param {object} quest quest from model.quests
 */
export function buildQuestItems(model, quest) {
  const base = { questId: quest.id };
  const kotoba = model.kotoba.get(quest.kotoba);
  const shape = quest.targetKanji.map((ch) => ({ ...base, id: itemId.shape(ch), stage: "shape", kanji: model.kanji.get(ch) }));
  const reading =
    kotoba.readingType === "special" ? [] : [{ ...base, id: itemId.reading(kotoba.id), stage: "reading", kotoba }];
  const test = quest.tests.map((conversation) => {
    const lineIndex = conversation.lines.findIndex((line) => line.blank);
    const line = conversation.lines[lineIndex];
    const { segments, plain } = parseRuby(line.ja);
    const start = plain.indexOf(line.blank);
    return {
      ...base,
      id: itemId.test(conversation.id),
      stage: "test",
      conversation,
      lineIndex,
      line,
      segments,
      plain,
      blankRange: { start, end: start + line.blank.length },
    };
  });
  return [...shape, ...reading, ...test];
}

/**
 * Other kotoba sharing a kanji with `kanji`, from regions up to `chapter`.
 * Regions open one after another, so every earlier region is already open;
 * this is the kun'yomi–on'yomi contrast across regions (D-56).
 */
export function kotobaWithKanji(model, kanji, chapter, except = null) {
  return (model.kotobaByKanji.get(kanji) ?? []).filter((k) => k !== except && k.chapter <= chapter);
}
