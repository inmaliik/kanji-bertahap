// Content spreadsheet (five CSV files, one per tab, plus the optional hadiah tab) → content.json structure.
// Pure module shared by tools/csv-to-json.mjs (Node) and tools/convert.html
// (browser): no file system, no DOM.
//
// Tabs (DECISIONS D-59):
//   wilayah     one row per region (one Minna chapter)
//   kanji       one row per kanji
//   kotoba      one row per kotoba
//   quest       one row per quest; row order = order inside its region
//   percakapan  one row per conversation line
//   hadiah      optional: one row per reward and its milestone (D-123)
// Each file is recognised by its header row, so file names do not matter.

import { SCHEMA_VERSION, PLAYER_SPEAKER, UNKNOWN_VALUE } from "./validate.js";
import { regionId } from "./model.js";

export const TABS = Object.freeze({
  wilayah: ["chapter", "title", "intro_summary", "intro_points", "pin_segment", "pin_x", "pin_y"],
  kanji: [
    "kanji", "meaning", "jlpt_level", "stroke_count",
    "bushu_char", "bushu_name", "bushu_meaning", "bushu_variants", "bushu_options", "kunyomi", "onyomi",
  ],
  kotoba: [
    "kotoba_id", "word", "word_ruby", "reading", "reading_type", "pos", "meaning", "chapter", "note",
    "reading_distractors", "reading_distractors_cross",
  ],
  quest: [
    "quest_id", "chapter", "kotoba_id", "target_kanji", "intro_conversation", "test_conversations", "production_prompt",
    "cat_name", "cat_body", "cat_pattern", "cat_accessory", "cat_color",
  ],
  percakapan: [
    "conversation_id", "line_no", "speaker", "ja", "translation", "highlight", "blank", "distractors",
    "sentence_chapter", "scene", "placeholder",
  ],
  hadiah: ["reward_id", "title", "text", "requires_chapters", "requires_world"],
});

/** Download order used in README and in the converter page. */
export const TAB_ORDER = ["wilayah", "kanji", "kotoba", "quest", "percakapan", "hadiah"];

/** Tabs the spreadsheet may leave out: no "hadiah" tab means no rewards (D-123). */
export const OPTIONAL_TABS = Object.freeze(["hadiah"]);

/**
 * Columns a tab may leave out of its header row: added after the team's
 * spreadsheets were made, so older files still convert (an absent column is an
 * empty one). The cat columns came with the cats (D-121).
 */
export const OPTIONAL_COLUMNS = Object.freeze({ quest: ["cat_name", "cat_body", "cat_pattern", "cat_accessory", "cat_color"] });

// A column that exists in exactly one tab identifies the file.
const SIGNATURE = { wilayah: "intro_summary", kanji: "bushu_char", kotoba: "word_ruby", quest: "quest_id", percakapan: "conversation_id", hadiah: "reward_id" };

// Conversation-level columns may be written on the first line only.
const CONVERSATION_COLUMNS = ["sentence_chapter", "scene", "placeholder"];

/** Words the team may type in the speaker column for the player's character. */
const PLAYER_WORDS = ["pemain", PLAYER_SPEAKER];
const YES_WORDS = ["ya", "yes", "true", "1"];

// ---------------------------------------------------------------------------
// CSV parsing (RFC 4180: quoted fields, doubled quotes, newlines in quotes)

export function parseCsv(text) {
  const records = [];
  let record = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      record.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (inQuotes) throw new Error("Tanda kutip \" tidak ditutup di akhir file.");
  if (field !== "" || record.length) {
    record.push(field);
    records.push(record);
  }
  return records;
}

// ---------------------------------------------------------------------------
// Problems

class CsvProblems {
  constructor() {
    this.list = [];
  }
  add(tab, rows, message) {
    this.list.push({ tab, rows, message });
  }
}

/** "Tab kotoba, baris 3, 4" */
export const rowLabel = ({ tab, rows }) => {
  const unique = [...new Set(rows)];
  const shown = unique.slice(0, 6).join(", ");
  return `Tab ${tab}, baris ${shown}${unique.length > 6 ? ", …" : ""}`;
};

const splitList = (cell) =>
  cell
    .split(/[;；]/)
    .map((s) => s.trim())
    .filter(Boolean);

// "食", "食;事", "食事" and "食 事" all mean the kanji 食 and 事.
const splitChars = (cell) => Array.from(cell.replace(/[;；,、\s]/g, ""));

function parseInteger(cell, column, tab, rows, problems, { allowDash, allowUnknown = false }) {
  if (allowUnknown && cell === UNKNOWN_VALUE) return UNKNOWN_VALUE; // not checked yet (D-92)
  if (cell === "") {
    problems.add(tab, rows, `Kolom ${column} kosong. Isi angka${allowDash ? ", atau tanda - jika di luar buku" : ""}.`);
    return undefined;
  }
  if (allowDash && cell === "-") return null;
  if (!/^\d+$/.test(cell)) {
    problems.add(tab, rows, `Kolom ${column} berisi "${cell}". Isi angka saja (misalnya 6)${allowDash ? ", atau tanda - jika di luar buku" : ""}.`);
    return undefined;
  }
  return Number(cell);
}

// Accepts 42.5 and 42,5: Indonesian spreadsheets write decimals with a comma.
function parseNumber(cell, column, tab, rows, problems) {
  const normalized = cell.replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    problems.add(tab, rows, `Kolom ${column} berisi "${cell}". Isi angka 0–100, misalnya 42 atau 42,5.`);
    return undefined;
  }
  return Number(normalized);
}

// Merge repeated cells of one entity. Empty cells inherit; differing
// non-empty cells are reported.
function mergeColumns(entries, columns, tab, label, problems) {
  const merged = {};
  for (const col of columns) {
    const values = new Map(); // value -> rows
    for (const { row, cells } of entries) {
      const v = cells[col];
      if (v === "") continue;
      if (!values.has(v)) values.set(v, []);
      values.get(v).push(row);
    }
    if (values.size > 1) {
      const detail = [...values].map(([v, rows]) => `"${v}" (baris ${rows.join(", ")})`).join(" vs ");
      problems.add(tab, entries.map((e) => e.row), `${label}: kolom ${col} berisi nilai berbeda: ${detail}. Samakan isinya.`);
    }
    merged[col] = values.size ? values.keys().next().value : "";
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Files → rows per tab

function readTab(file) {
  let records;
  try {
    records = parseCsv(file.text.replace(/^﻿/, ""));
  } catch (err) {
    return { fatal: `${file.name}: CSV tidak bisa dibaca: ${err.message}` };
  }
  if (!records.length) return { fatal: `${file.name}: file kosong.` };

  const header = records[0].map((h) => h.trim());
  if (header.length === 1 && header[0].includes(";")) {
    return {
      fatal:
        `${file.name}: file ini memakai titik koma (;) sebagai pemisah kolom, bukan koma. Unduh ulang dari Google Sheets ` +
        "lewat File → Download → Comma Separated Values (.csv).",
    };
  }
  if (header.includes("level_id")) {
    return {
      fatal:
        `${file.name}: ini spreadsheet struktur lama (satu lembar, kolom level_id). Versi peta memakai lima tab: ` +
        `${TAB_ORDER.join(", ")}. Lihat README bagian Kolom spreadsheet, atau mulai dari template di tools/templates/.`,
    };
  }
  const tab = TAB_ORDER.find((t) => header.includes(SIGNATURE[t]));
  if (!tab) {
    return {
      fatal:
        `${file.name}: jenis tab tidak dikenali dari baris judulnya. Setiap file harus salah satu tab ` +
        `${TAB_ORDER.join(", ")}, dengan baris judul persis seperti template.`,
    };
  }
  const columns = TABS[tab];
  const unknown = header.filter((h) => h && !columns.includes(h));
  const missing = columns.filter((c) => !header.includes(c) && !(OPTIONAL_COLUMNS[tab] ?? []).includes(c));
  if (unknown.length || missing.length) {
    const parts = [];
    if (missing.length) parts.push(`Kolom yang tidak ditemukan: ${missing.join(", ")}.`);
    if (unknown.length) parts.push(`Kolom yang tidak dikenal (cek salah ketik): ${unknown.join(", ")}.`);
    return { fatal: `${file.name} (tab ${tab}): baris judul (baris 1) tidak sesuai template.\n${parts.join("\n")}` };
  }

  // Collect rows, skipping completely empty ones (spreadsheets export them).
  const rows = [];
  const wide = [];
  records.slice(1).forEach((record, i) => {
    const row = i + 2; // spreadsheet row number
    if (record.every((c) => c.trim() === "")) return;
    const cells = {};
    header.forEach((h, idx) => {
      if (h) cells[h] = (record[idx] ?? "").trim();
    });
    if (record.length > header.length && record.slice(header.length).some((c) => c.trim())) wide.push(row);
    rows.push({ row, cells });
  });
  return { tab, rows, wide };
}

// ---------------------------------------------------------------------------
// Rows → content

/** The cat a mission frees (D-121), or null while all its columns are empty. */
function catOf(cells) {
  const columns = OPTIONAL_COLUMNS.quest.map((c) => cells[c] ?? "");
  if (columns.every((v) => v === "")) return null;
  return {
    name: cells.cat_name ?? "",
    body: cells.cat_body ?? "",
    pattern: cells.cat_pattern ?? "",
    accessory: cells.cat_accessory ?? "",
    color: cells.cat_color ? cells.cat_color : null,
  };
}

/** One reward per row (D-123): its milestone as chapters to finish, a world to complete, or both. */
function buildRewards(rows, problems, rowMap) {
  const rewards = [];
  for (const { row, cells } of rows) {
    const chapters = splitList(cells.requires_chapters).map((c) => parseInteger(c, "requires_chapters", "hadiah", [row], problems, { allowDash: false }));
    const world = cells.requires_world === "" ? null : parseInteger(cells.requires_world, "requires_world", "hadiah", [row], problems, { allowDash: false });
    rowMap.set(`rewards[${rewards.length}]`, { tab: "hadiah", rows: [row] });
    rewards.push({
      id: cells.reward_id,
      title: cells.title,
      text: cells.text,
      requires: { regions: chapters.filter(Number.isInteger).map(regionId), world: world ?? null },
    });
  }
  return rewards;
}

function buildKanji(rows, problems, rowMap) {
  const seen = new Map();
  const kanji = [];
  for (const { row, cells } of rows) {
    if (!cells.kanji) {
      problems.add("kanji", [row], "Kolom kanji kosong. Setiap baris tab kanji berisi satu kanji.");
      continue;
    }
    if (seen.has(cells.kanji)) {
      problems.add("kanji", [seen.get(cells.kanji), row], `Kanji ${cells.kanji} ditulis dua kali. Satu kanji cukup satu baris.`);
      continue;
    }
    seen.set(cells.kanji, row);
    rowMap.set(`kanji[${kanji.length}]`, { tab: "kanji", rows: [row] });
    kanji.push({
      char: cells.kanji,
      meaning: cells.meaning,
      jlptLevel: cells.jlpt_level,
      strokeCount:
        cells.stroke_count === "" ? null : parseInteger(cells.stroke_count, "stroke_count", "kanji", [row], problems, { allowDash: false, allowUnknown: true }) ?? null,
      bushu: {
        char: cells.bushu_char,
        name: cells.bushu_name,
        meaning: cells.bushu_meaning,
        variants: splitList(cells.bushu_variants),
      },
      bushuOptions: splitList(cells.bushu_options),
      readings: { kunyomi: splitList(cells.kunyomi), onyomi: splitList(cells.onyomi) },
      // Stroke-order data waits for the licence decision (D-66).
      strokes: null,
    });
  }
  return kanji;
}

function buildKotoba(rows, problems, rowMap) {
  const kotoba = [];
  for (const { row, cells } of rows) {
    if (!cells.kotoba_id) {
      problems.add("kotoba", [row], "Kolom kotoba_id kosong. Setiap kotoba wajib punya id, misalnya tabemasu.");
      continue;
    }
    rowMap.set(`kotoba[${kotoba.length}]`, { tab: "kotoba", rows: [row] });
    kotoba.push({
      id: cells.kotoba_id,
      word: cells.word,
      ruby: cells.word_ruby,
      reading: cells.reading,
      readingType: cells.reading_type,
      pos: cells.pos,
      meaning: cells.meaning,
      chapter: parseInteger(cells.chapter, "chapter", "kotoba", [row], problems, { allowDash: true }) ?? null,
      note: cells.note,
      readingDistractors: splitList(cells.reading_distractors),
      readingDistractorsCross: splitList(cells.reading_distractors_cross),
    });
  }
  return kotoba;
}

/** @returns {Map<string, {conversation: object, rows: number[], lineRows: number[]}>} */
function buildConversations(rows, problems) {
  const groups = new Map();
  for (const entry of rows) {
    const id = entry.cells.conversation_id;
    if (!id) {
      problems.add("percakapan", [entry.row], "Kolom conversation_id kosong. Setiap baris percakapan wajib diisi id percakapannya.");
      continue;
    }
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(entry);
  }

  const conversations = new Map();
  for (const [id, entries] of groups) {
    const allRows = entries.map((e) => e.row);
    const conv = mergeColumns(entries, CONVERSATION_COLUMNS, "percakapan", `Percakapan ${id}`, problems);
    const numbered = [];
    const lineNumbers = new Map();
    for (const { row, cells } of entries) {
      const n = parseInteger(cells.line_no, "line_no", "percakapan", [row], problems, { allowDash: false });
      if (n === undefined) continue;
      if (lineNumbers.has(n)) {
        problems.add("percakapan", [lineNumbers.get(n), row], `Percakapan ${id}: line_no ${n} dipakai dua kali.`);
        continue;
      }
      lineNumbers.set(n, row);
      numbered.push({ n, row, cells });
    }
    numbered.sort((a, b) => a.n - b.n);

    const lines = numbered.map(({ cells }) => {
      const line = {
        speaker: PLAYER_WORDS.includes(cells.speaker.toLowerCase()) ? PLAYER_SPEAKER : cells.speaker,
        ja: cells.ja,
        translation: cells.translation,
      };
      if (cells.highlight) line.highlight = cells.highlight;
      if (cells.blank) line.blank = cells.blank;
      if (cells.distractors) line.distractors = splitList(cells.distractors);
      return line;
    });

    const conversation = {
      id,
      scene: conv.scene,
      sentenceChapter:
        parseInteger(conv.sentence_chapter, "sentence_chapter", "percakapan", allRows, problems, { allowDash: true, allowUnknown: true }) ?? null,
    };
    if (conv.placeholder) {
      if (YES_WORDS.includes(conv.placeholder.toLowerCase())) conversation.isPlaceholder = true;
      else problems.add("percakapan", allRows, `Percakapan ${id}: kolom placeholder hanya boleh "ya" atau kosong, ditemukan "${conv.placeholder}".`);
    }
    conversation.lines = lines;
    conversations.set(id, { conversation, rows: allRows, lineRows: numbered.map((l) => l.row) });
  }
  return conversations;
}

function buildRegions(wilayahRows, questRows, conversations, problems, rowMap) {
  const regions = new Map(); // chapter → { region, rows }
  for (const { row, cells } of wilayahRows) {
    const chapter = parseInteger(cells.chapter, "chapter", "wilayah", [row], problems, { allowDash: false });
    if (chapter === undefined) continue;
    if (regions.has(chapter)) {
      problems.add("wilayah", [regions.get(chapter).rows[0], row], `Bab ${chapter} ditulis dua kali. Satu bab = satu wilayah = satu baris.`);
      continue;
    }
    let pin = null;
    const pinCells = [cells.pin_segment, cells.pin_x, cells.pin_y];
    if (pinCells.some((c) => c !== "")) {
      if (pinCells.some((c) => c === "")) {
        problems.add("wilayah", [row], "Isi pin_segment, pin_x, dan pin_y bersamaan, atau kosongkan ketiganya.");
      } else {
        const segment = parseInteger(cells.pin_segment, "pin_segment", "wilayah", [row], problems, { allowDash: false });
        const x = parseNumber(cells.pin_x, "pin_x", "wilayah", [row], problems);
        const y = parseNumber(cells.pin_y, "pin_y", "wilayah", [row], problems);
        if (segment !== undefined && x !== undefined && y !== undefined) pin = { segment, x, y };
      }
    }
    regions.set(chapter, {
      rows: [row],
      region: {
        chapter,
        title: cells.title,
        intro: { summary: cells.intro_summary, points: splitList(cells.intro_points) },
        pin,
        quests: [],
      },
      questRows: [],
    });
  }

  const used = new Map(); // conversation id → quest id
  const take = (convId, questId, row) => {
    const found = conversations.get(convId);
    if (!found) {
      problems.add("quest", [row], `Quest ${questId}: percakapan "${convId}" tidak ada di tab percakapan.`);
      return null;
    }
    if (used.has(convId)) {
      problems.add("quest", [row], `Quest ${questId}: percakapan "${convId}" sudah dipakai quest ${used.get(convId)}. Satu percakapan hanya untuk satu quest.`);
      return null;
    }
    used.set(convId, questId);
    return found;
  };

  for (const { row, cells } of questRows) {
    if (!cells.quest_id) {
      problems.add("quest", [row], "Kolom quest_id kosong. Setiap quest wajib punya id, misalnya Q-tabemasu.");
      continue;
    }
    const chapter = parseInteger(cells.chapter, "chapter", "quest", [row], problems, { allowDash: false });
    if (chapter === undefined) continue;
    const target = regions.get(chapter);
    if (!target) {
      problems.add("quest", [row], `Quest ${cells.quest_id} ada di bab ${chapter}, tetapi tab wilayah tidak punya baris untuk bab ${chapter}.`);
      continue;
    }
    if (!cells.intro_conversation) {
      problems.add("quest", [row], `Quest ${cells.quest_id}: kolom intro_conversation kosong.`);
    }
    const intro = cells.intro_conversation ? take(cells.intro_conversation, cells.quest_id, row) : null;
    const tests = splitList(cells.test_conversations)
      .map((id) => take(id, cells.quest_id, row))
      .filter(Boolean);
    target.region.quests.push({
      id: cells.quest_id,
      kotoba: cells.kotoba_id,
      targetKanji: splitChars(cells.target_kanji),
      productionPrompt: cells.production_prompt,
      intro: intro?.conversation ?? null,
      tests: tests.map((t) => t.conversation),
      cat: catOf(cells),
    });
    target.questRows.push({ row, intro, tests });
  }

  for (const [id, { rows }] of conversations) {
    if (!used.has(id)) {
      problems.add("percakapan", rows, `Percakapan ${id} tidak dipakai quest mana pun. Tulis id-nya di kolom intro_conversation atau test_conversations tab quest.`);
    }
  }

  // Regions follow the book: sorted by chapter whatever the row order.
  const sorted = [...regions.values()].sort((a, b) => a.region.chapter - b.region.chapter);
  sorted.forEach(({ region, rows, questRows: qRows }, i) => {
    const regionPath = `regions[${i}]`;
    rowMap.set(regionPath, { tab: "wilayah", rows });
    qRows.forEach(({ row, intro, tests }, j) => {
      const questPath = `${regionPath}.quests[${j}]`;
      rowMap.set(questPath, { tab: "quest", rows: [row] });
      const mapConversation = (found, path) => {
        rowMap.set(path, { tab: "percakapan", rows: found.rows });
        found.lineRows.forEach((r, k) => rowMap.set(`${path}.lines[${k}]`, { tab: "percakapan", rows: [r] }));
      };
      if (intro) mapConversation(intro, `${questPath}.intro`);
      tests.forEach((t, k) => mapConversation(t, `${questPath}.tests[${k}]`));
    });
  });
  return sorted.map((r) => r.region);
}

export function rowsForPath(rowMap, path) {
  let best = null;
  for (const key of rowMap.keys()) {
    const matches = path === key || path.startsWith(`${key}.`) || path.startsWith(`${key}[`);
    if (matches && (!best || key.length > best.length)) best = key;
  }
  return best ? rowMap.get(best) : null;
}

/**
 * Convert the five tab CSV files into content. Callers still run
 * validateContent() on the result.
 * @param {Array<{name: string, text: string}>} files
 * @returns {{
 *   fatal: string|null,       // the files cannot be converted at all
 *   problems: Array<{tab: string, rows: number[], message: string}>, // content must not be used while there are any
 *   recognized: Array<{name: string, tab: string}>,
 *   content?: object, rowMap?: Map,
 * }}
 */
export function convertCsvFilesToContent(files, revision) {
  const fatal = [];
  const tabs = {};
  const recognized = [];
  for (const file of files) {
    const result = readTab(file);
    if (result.fatal) {
      fatal.push(result.fatal);
      continue;
    }
    if (tabs[result.tab]) {
      fatal.push(`Dua file sama-sama berisi tab ${result.tab}: ${tabs[result.tab].name} dan ${file.name}. Pilih salah satu.`);
      continue;
    }
    tabs[result.tab] = { ...result, name: file.name };
    recognized.push({ name: file.name, tab: result.tab });
  }
  const missing = TAB_ORDER.filter((t) => !tabs[t] && !OPTIONAL_TABS.includes(t));
  if (missing.length && !fatal.length) {
    fatal.push(`Tab yang belum dipilih: ${missing.join(", ")}. Unduh setiap tab sebagai CSV, lalu pilih semua file sekaligus.`);
  }
  if (fatal.length) return { fatal: fatal.join("\n\n"), problems: [], recognized };

  const problems = new CsvProblems();
  for (const tab of TAB_ORDER.filter((t) => tabs[t])) {
    if (tabs[tab].wide.length) {
      problems.add(tab, tabs[tab].wide, "Baris ini punya lebih banyak kolom daripada baris judul. Periksa koma di dalam sel yang tidak diberi tanda kutip.");
    }
  }

  const rowMap = new Map(); // JSON path -> { tab, rows }, for error reporting
  const kanji = buildKanji(tabs.kanji.rows, problems, rowMap);
  const kotoba = buildKotoba(tabs.kotoba.rows, problems, rowMap);
  const conversations = buildConversations(tabs.percakapan.rows, problems);
  const regions = buildRegions(tabs.wilayah.rows, tabs.quest.rows, conversations, problems, rowMap);

  const content = { schemaVersion: SCHEMA_VERSION, contentRevision: revision, regions, kanji, kotoba };
  if (tabs.hadiah) content.rewards = buildRewards(tabs.hadiah.rows, problems, rowMap);
  return { fatal: null, problems: problems.list, recognized, content, rowMap };
}

/** "Tab kotoba, baris 3" for a validation issue, or null if it has no CSV location. */
export function csvLocation(rowMap, issue) {
  const found = rowsForPath(rowMap, issue.path);
  return found ? rowLabel(found) : null;
}
