// Loads data/content.json, validates it, and exposes helpers that turn a
// level into playable items. Only loadContent() touches the network.

import { validateContent, itemId, JLPT_LEVELS } from "./validate.js";
import { parseRuby } from "./ruby.js";

/**
 * Translate a JSON.parse error into an Indonesian message with line/column.
 * Shared with the Node tools.
 */
export function describeJsonError(err, text) {
  const lineCol = /line (\d+) column (\d+)/.exec(err.message);
  let line;
  let column;
  if (lineCol) {
    line = Number(lineCol[1]);
    column = Number(lineCol[2]);
  } else {
    const pos = /position (\d+)/.exec(err.message);
    if (pos) {
      const before = text.slice(0, Number(pos[1])).split("\n");
      line = before.length;
      column = before[before.length - 1].length + 1;
    }
  }
  const where = line ? `baris ${line}, kolom ${column}` : "lokasi tidak diketahui";
  return {
    line,
    column,
    message:
      `Format JSON rusak di ${where}. Penyebab paling sering: koma hilang atau berlebih ` +
      `di akhir baris, atau tanda kutip yang tidak ditutup. (Pesan asli: ${err.message})`,
  };
}

/**
 * @returns {Promise<{content: object|null, errors: Array<object>, warnings: Array<object>}>}
 */
export async function loadContent(url) {
  const fail = (message) => ({
    content: null,
    errors: [{ severity: "error", code: "LOAD_FAILED", where: url, path: "", message, prominent: true }],
    warnings: [],
  });

  let text;
  try {
    // no-cache: edits to content.json show up on a normal reload.
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) return fail(`File tidak bisa diambil (HTTP ${response.status}). Pastikan file ${url} ada.`);
    text = await response.text();
  } catch (err) {
    return fail(`File tidak bisa diambil: ${err.message}`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    return fail(describeJsonError(err, text).message);
  }

  const { errors, warnings } = validateContent(data);
  return { content: errors.length ? null : data, errors, warnings };
}

/**
 * Group levels for the level list: JLPT level, then chapter. Array order is
 * preserved (the validator guarantees it already follows this grouping).
 * @returns {Array<{jlptLevel: string, chapters: Array<{chapter: number|null, levels: object[]}>}>}
 */
export function groupLevels(levels) {
  const groups = [];
  for (const level of levels) {
    let group = groups.find((g) => g.jlptLevel === level.jlptLevel);
    if (!group) {
      group = { jlptLevel: level.jlptLevel, chapters: [] };
      groups.push(group);
    }
    let chapter = group.chapters[group.chapters.length - 1];
    if (!chapter || chapter.chapter !== level.chapter) {
      chapter = { chapter: level.chapter, levels: [] };
      group.chapters.push(chapter);
    }
    chapter.levels.push(level);
  }
  return groups.sort((a, b) => JLPT_LEVELS.indexOf(a.jlptLevel) - JLPT_LEVELS.indexOf(b.jlptLevel));
}

export function jlptLevelsPresent(levels) {
  return JLPT_LEVELS.filter((j) => levels.some((l) => l.jlptLevel === j));
}

/**
 * Derive the items of stages 1–4 for one level. Stage 5 (production) has no
 * scored items.
 */
export function buildLevelItems(level) {
  const shape = [{ id: itemId.shape(level.id), stage: "shape", levelId: level.id }];

  const readingItems = (type) =>
    level.kotoba
      .filter((k) => k.readingType === type)
      .map((k) => ({ id: itemId.reading(level.id, k.word), stage: type, levelId: level.id, kotoba: k }));

  const sentence = level.kotoba.flatMap((k) =>
    k.examples.map((example) => {
      const parsed = parseRuby(example.ja);
      const start = parsed.plain.indexOf(example.blank);
      return {
        id: itemId.sentence(level.id, parsed.plain),
        stage: "sentence",
        levelId: level.id,
        kotoba: k,
        example,
        segments: parsed.segments,
        plain: parsed.plain,
        blankRange: { start, end: start + example.blank.length },
      };
    })
  );

  return { shape, kunyomi: readingItems("kunyomi"), onyomi: readingItems("onyomi"), sentence };
}
