// Content validation shared by the browser app and the tools/ scripts.
// Pure module: no DOM, no fetch. All messages are Indonesian because they are
// read by the content team.
//
// Schema v2 (DECISIONS D-57): regions (one per Minna chapter) hold quests;
// a quest teaches one kotoba through an intro conversation and tests it in
// other conversations. Kanji and kotoba are shared tables referred to by
// quests and read by the index.

import { parseRuby, alignReading, RubySyntaxError } from "./ruby.js";
import {
  isKanji,
  isHiragana,
  isKatakana,
  isAllKana,
  isRadicalBlock,
  isSingleChar,
  splitReadingNotation,
  toHiragana,
} from "./jp-text.js";
import { DISTRACTORS_NEEDED, readingDistractorPool, blankDistractorPool } from "./distractors.js";
import { kotobaParts, regionId } from "./model.js";
import { WORLDS, worldOf } from "./worlds.js";

export const SCHEMA_VERSION = 2;
export const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"];
export const READING_TYPES = ["kunyomi", "onyomi", "special"];
export const PARTS_OF_SPEECH = ["verb", "noun", "i-adj", "na-adj", "adverb", "other"];

/**
 * Material scope: the chapters of every world (D-117, replacing D-58's bab
 * 1–12). A region or kotoba chapter belongs to the world whose range holds
 * it; chapters outside every world are errors.
 */
export const SCOPE_CHAPTER_MIN = WORLDS[0].from;
export const SCOPE_CHAPTER_MAX = WORLDS.at(-1).to;
const WORLD_RANGES = WORLDS.map((w) => `Dunia ${w.number} = ${w.book} bab ${w.from}–${w.to}`).join(", ");
/** A sentence may still need a later chapter (warning only), so its range is wider. */
export const SENTENCE_CHAPTER_MAX = 50;

/** Kanji drilled by one quest (D-61). */
export const TARGET_KANJI_MAX = 2;
export const STROKE_COUNT_MAX = 30;

/** Speaker value for lines said by the player's character. */
export const PLAYER_SPEAKER = "player";
/** Speakers per conversation: the player and one other character. */
export const SPEAKERS_PER_CONVERSATION = 2;

// Placeholders left for the team (D-91). «NAMA-…» stands for a name that the
// team must invent (never a name from the book) and is always an error;
// any other «…» is unfinished work: a warning in a draft, an error in a release.
const PLACEHOLDER = /«([^»]*)»/g;
const NAME_PLACEHOLDER = /^NAMA-/;
/** sentenceChapter (and strokeCount) value meaning "not checked yet". */
export const UNKNOWN_VALUE = "?";

const ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const NPC_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const RESERVED_QUEST_ID = /^(REV-|all$)/i;
const STROKES_PATH = /^[A-Za-z0-9_./-]+\.(svg|png|webp)$/;

const ROOT_KEYS = ["schemaVersion", "contentRevision", "regions", "kanji", "kotoba", "rewards"];
const REWARD_KEYS = ["id", "title", "text", "requires"];
const REQUIRES_KEYS = ["regions", "world"];
const REGION_KEYS = ["chapter", "title", "intro", "pin", "quests"];
const REGION_INTRO_KEYS = ["summary", "points"];
const PIN_KEYS = ["segment", "x", "y"];
const QUEST_KEYS = ["id", "kotoba", "targetKanji", "productionPrompt", "intro", "tests", "cat"];
const CAT_KEYS = ["name", "body", "pattern", "accessory", "color"];
const LAYER_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const CONVERSATION_KEYS = ["id", "scene", "sentenceChapter", "isPlaceholder", "lines"];
const LINE_KEYS = ["speaker", "ja", "translation", "highlight", "blank", "distractors"];
const KANJI_KEYS = ["char", "meaning", "jlptLevel", "strokeCount", "bushu", "bushuOptions", "readings", "strokes"];
const BUSHU_KEYS = ["char", "name", "meaning", "variants"];
const READINGS_KEYS = ["kunyomi", "onyomi"];
const KOTOBA_KEYS = [
  "id", "word", "ruby", "reading", "readingType", "pos", "meaning", "chapter", "note",
  "readingDistractors", "readingDistractorsCross",
];

// ---------------------------------------------------------------------------
// Report plumbing

class Context {
  constructor(path, where) {
    this.path = path; // machine path, e.g. regions[0].quests[1].tests[0].lines[2].ja
    this.where = where; // human path, e.g. Wilayah bab 6 › quest Q-tabemasu › percakapan uji "C-2" › baris 3
  }
  child(pathPart, wherePart) {
    const path = pathPart.startsWith("[") || !this.path ? `${this.path}${pathPart}` : `${this.path}.${pathPart}`;
    const where = wherePart ? (this.where ? `${this.where} › ${wherePart}` : wherePart) : this.where;
    return new Context(path, where);
  }
  field(key) {
    return this.child(key, key);
  }
}

class Report {
  constructor() {
    this.draft = false; // contentRevision starts with "draft": incompleteness is a warning, not an error
    this.errors = [];
    this.warnings = [];
    this.notes = []; // information only: never blocks and never counts as a warning
  }
  add(list, severity, ctx, code, message, prominent) {
    list.push({ severity, code, path: ctx.path, where: ctx.where, message, prominent: !!prominent });
  }
  error(ctx, code, message, { prominent = false } = {}) {
    this.add(this.errors, "error", ctx, code, message, prominent);
  }
  warn(ctx, code, message, { prominent = false } = {}) {
    this.add(this.warnings, "warning", ctx, code, message, prominent);
  }
  note(ctx, code, message) {
    this.add(this.notes, "note", ctx, code, message, false);
  }
  /** Something still to be written by the team: a warning in a draft, an error in a release (D-92). */
  incomplete(ctx, code, message) {
    if (this.draft) this.warn(ctx, code, `${message} Boleh selama revisi masih draf; menjadi error saat rilis.`);
    else this.error(ctx, code, `${message} Revisi bukan draf, jadi materi belum boleh dipakai.`);
  }
  result() {
    const byProminence = (a, b) => Number(b.prominent) - Number(a.prominent);
    return {
      errors: [...this.errors].sort(byProminence),
      warnings: [...this.warnings].sort(byProminence),
      notes: this.notes,
    };
  }
}

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const show = (v) => (v === undefined ? "(tidak ada)" : JSON.stringify(v));

function checkKeys(obj, allowed, ctx, report) {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) {
      report.warn(
        ctx.field(key),
        "UNKNOWN_FIELD",
        `Field "${key}" tidak dikenal dan akan diabaikan. Periksa salah ketik. Field yang dikenal: ${allowed.join(", ")}.`
      );
    }
  }
}

function requireString(obj, key, ctx, report) {
  const value = obj[key];
  if (typeof value !== "string" || value.trim() === "") {
    report.error(ctx.field(key), "REQUIRED_STRING", `Wajib diisi teks, ditemukan ${show(value)}.`);
    return undefined;
  }
  return value;
}

function optionalString(obj, key, ctx, report) {
  if (obj[key] === undefined) return undefined;
  if (typeof obj[key] !== "string") {
    report.error(ctx.field(key), "EXPECTED_STRING", `Harus berupa teks, ditemukan ${show(obj[key])}.`);
    return undefined;
  }
  return obj[key];
}

function requireId(obj, key, ctx, report) {
  const id = requireString(obj, key, ctx, report);
  if (id !== undefined && !ID_PATTERN.test(id)) {
    report.error(ctx.field(key), "INVALID_ID", `"${id}" hanya boleh berisi huruf latin, angka, "-" dan "_", tanpa spasi.`);
    return undefined;
  }
  return id;
}

// Returns the array (possibly empty) or undefined when the value is invalid.
function stringArray(obj, key, ctx, report, { required }) {
  const value = obj[key];
  if (value === undefined && !required) return [];
  if (!Array.isArray(value)) {
    const hint = required ? " Tulis [] jika kosong." : "";
    report.error(ctx.field(key), "EXPECTED_ARRAY", `Harus berupa daftar [...], ditemukan ${show(value)}.${hint}`);
    return undefined;
  }
  const bad = value.findIndex((v) => typeof v !== "string" || v.trim() === "");
  if (bad !== -1) {
    report.error(ctx.child(`${key}[${bad}]`, `${key} #${bad + 1}`), "EXPECTED_STRING", `Isi daftar harus teks yang tidak kosong, ditemukan ${show(value[bad])}.`);
    return undefined;
  }
  const dupes = value.filter((v, i) => value.indexOf(v) !== i);
  if (dupes.length) {
    report.warn(ctx.field(key), "DUPLICATE_ENTRY", `Isi ganda di daftar: ${[...new Set(dupes)].join(", ")}.`);
  }
  return value;
}

/** Chapter of a region or kotoba: an integer inside the material scope. */
function scopeChapter(obj, key, ctx, report, what) {
  const value = obj[key];
  if (!Number.isInteger(value)) {
    report.error(ctx.field(key), "INVALID_CHAPTER", `Wajib diisi nomor bab ${SCOPE_CHAPTER_MIN}–${SCOPE_CHAPTER_MAX}, ditemukan ${show(value)}.`);
    return undefined;
  }
  if (value < SCOPE_CHAPTER_MIN || value > SCOPE_CHAPTER_MAX) {
    report.error(
      ctx.field(key),
      "CHAPTER_OUT_OF_SCOPE",
      `Bab ${value} di luar cakupan materi. ${what} hanya boleh dari bab ${SCOPE_CHAPTER_MIN}–${SCOPE_CHAPTER_MAX} ` +
        `(${WORLD_RANGES}). Pindahkan ke catatan terpisah jika ingin disimpan.`,
      { prominent: true }
    );
    return undefined;
  }
  return value;
}

function checkCharForFont(ch, ctx, report) {
  if (isRadicalBlock(ch)) {
    report.warn(
      ctx,
      "RADICAL_BLOCK_CHAR",
      `Karakter "${ch}" (U+${ch.codePointAt(0).toString(16).toUpperCase()}) berasal dari blok "Kangxi Radicals". ` +
        `Di sebagian ponsel tampil sebagai kotak kosong. Gunakan karakter kanji biasa yang bentuknya sama jika ada.`
    );
  }
}

function parseRubyField(text, ctx, report) {
  try {
    return parseRuby(text);
  } catch (err) {
    if (!(err instanceof RubySyntaxError)) throw err;
    report.error(ctx, "RUBY_SYNTAX", `Sintaks furigana salah: ${err.message} Lokasi: ${err.excerpt}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Validation

/**
 * @returns {{errors: Array<object>, warnings: Array<object>, notes: Array<object>}}
 */
export function validateContent(data) {
  const report = new Report();
  const root = new Context("", "");

  if (!isPlainObject(data)) {
    report.error(root, "ROOT_NOT_OBJECT", "Isi file harus berupa objek JSON { ... }.");
    return report.result();
  }

  if (data.schemaVersion !== SCHEMA_VERSION) {
    const old = data.schemaVersion === 1 || Array.isArray(data.levels);
    report.error(
      root.field("schemaVersion"),
      "UNSUPPORTED_SCHEMA",
      old
        ? `Ini materi struktur lama (schemaVersion 1, berbasis level). Versi peta membaca schemaVersion ${SCHEMA_VERSION}: ` +
            "wilayah, quest, dan percakapan. Susun ulang materi dengan lima tab spreadsheet (lihat README, Kolom spreadsheet)."
        : `Aplikasi ini membaca schemaVersion ${SCHEMA_VERSION}, ditemukan ${show(data.schemaVersion)}.`,
      { prominent: true }
    );
    return report.result();
  }
  checkKeys(data, ROOT_KEYS, root, report);
  requireString(data, "contentRevision", root, report);
  report.draft = typeof data.contentRevision === "string" && /^draft/i.test(data.contentRevision);

  const kanji = validateKanjiTable(data.kanji, root, report);
  const kotoba = validateKotobaTable(data.kotoba, kanji, root, report);
  const usage = validateRegions(data.regions, { kanji, kotoba }, root, report);
  if (usage) checkUsage(data, { kanji, kotoba, usage }, root, report);
  checkCats(data, kotoba, root, report);
  checkRewards(data, kotoba, root, report);
  checkPlaceholders(data, root, report);

  return report.result();
}

// ---------------------------------------------------------------------------
// Kanji

/** @returns {Map<string, {entry: object, ctx: Context}>} valid kanji entries by character */
function validateKanjiTable(list, root, report) {
  const table = new Map();
  const ctx = root.field("kanji");
  if (!Array.isArray(list)) {
    report.error(ctx, "EXPECTED_ARRAY", `Harus berupa daftar kanji [...], ditemukan ${show(list)}.`);
    return table;
  }
  list.forEach((entry, i) => {
    const label = isPlainObject(entry) && typeof entry.char === "string" ? `Kanji ${entry.char}` : `Kanji #${i + 1}`;
    const kctx = root.child(`kanji[${i}]`, label);
    const char = validateKanjiEntry(entry, kctx, report);
    if (char === undefined) return;
    if (table.has(char)) {
      report.error(kctx.field("char"), "DUPLICATE_KANJI", `Kanji "${char}" ditulis dua kali di tabel kanji.`);
    } else {
      table.set(char, { entry, ctx: kctx });
    }
  });
  return table;
}

function validateKanjiEntry(entry, ctx, report) {
  if (!isPlainObject(entry)) {
    report.error(ctx, "KANJI_NOT_OBJECT", "Setiap kanji harus berupa objek { ... }.");
    return undefined;
  }
  checkKeys(entry, KANJI_KEYS, ctx, report);

  let validChar;
  const char = requireString(entry, "char", ctx, report);
  if (char !== undefined) {
    if (!isSingleChar(char) || !isKanji(char)) {
      report.error(ctx.field("char"), "INVALID_KANJI", `Harus tepat satu karakter kanji, ditemukan "${char}".`);
    } else {
      validChar = char;
    }
  }

  requireString(entry, "meaning", ctx, report);
  if (!JLPT_LEVELS.includes(entry.jlptLevel)) {
    report.error(ctx.field("jlptLevel"), "INVALID_JLPT", `Harus salah satu dari ${JLPT_LEVELS.join(", ")}. Ditemukan ${show(entry.jlptLevel)}.`);
  }

  if (entry.strokeCount === null || entry.strokeCount === UNKNOWN_VALUE) {
    report.warn(ctx.field("strokeCount"), "STROKE_COUNT_MISSING", "Jumlah guratan belum diisi. Jendela detail kanji akan menulis \"belum diisi\".");
  } else if (!Number.isInteger(entry.strokeCount) || entry.strokeCount < 1 || entry.strokeCount > STROKE_COUNT_MAX) {
    report.error(
      ctx.field("strokeCount"),
      "INVALID_STROKE_COUNT",
      `Harus bilangan bulat 1–${STROKE_COUNT_MAX}, atau null jika belum diisi. Ditemukan ${show(entry.strokeCount)}.`
    );
  }

  // Stroke-order data waits for the licence decision (D-66): only the slot exists.
  if (entry.strokes !== undefined && entry.strokes !== null) {
    if (typeof entry.strokes !== "string" || !STROKES_PATH.test(entry.strokes)) {
      report.error(
        ctx.field("strokes"),
        "INVALID_STROKES",
        `Harus null, atau jalur berkas gambar .svg/.png/.webp di dalam folder aplikasi. Ditemukan ${show(entry.strokes)}.`
      );
    }
  }

  const bushu = validateBushu(entry, ctx, report);
  // A kanji that is its own bushu gets an introduction card instead of the
  // shape question (D-90), so it needs no options.
  if (bushu?.char === undefined || bushu.char !== validChar) validateBushuOptions(entry, bushu, ctx, report);
  validateReadings(entry, ctx, report);
  return validChar;
}

function validateBushu(entry, ctx, report) {
  const bctx = ctx.field("bushu");
  const bushu = entry.bushu;
  if (!isPlainObject(bushu)) {
    report.error(bctx, "INVALID_BUSHU", `Harus berupa objek { "char", "name", "meaning" }, ditemukan ${show(bushu)}.`);
    return null;
  }
  checkKeys(bushu, BUSHU_KEYS, bctx, report);

  const char = requireString(bushu, "char", bctx, report);
  let validChar;
  if (char !== undefined) {
    if (!isSingleChar(char)) {
      report.error(bctx.field("char"), "INVALID_BUSHU_CHAR", `Harus tepat satu karakter, ditemukan "${char}".`);
    } else {
      validChar = char;
      checkCharForFont(char, bctx.field("char"), report);
    }
  }
  requireString(bushu, "name", bctx, report);
  requireString(bushu, "meaning", bctx, report);

  const variants = stringArray(bushu, "variants", bctx, report, { required: false }) ?? [];
  variants.forEach((v, i) => {
    const vctx = bctx.child(`variants[${i}]`, `variants #${i + 1}`);
    if (!isSingleChar(v)) {
      report.error(vctx, "INVALID_VARIANT", `Setiap varian harus tepat satu karakter, ditemukan "${v}".`);
    } else if (v === validChar) {
      report.error(vctx, "VARIANT_EQUALS_CHAR", `Varian "${v}" sama dengan bushu.char.`);
    } else {
      checkCharForFont(v, vctx, report);
    }
  });

  return { char: validChar, variants };
}

function validateBushuOptions(entry, bushu, ctx, report) {
  const octx = ctx.field("bushuOptions");
  const options = stringArray(entry, "bushuOptions", ctx, report, { required: true });
  if (!options) return;
  if (options.length < 2) {
    report.error(octx, "TOO_FEW_OPTIONS", "Minimal dua pilihan (satu benar, satu pengecoh).");
  }
  options.forEach((opt, i) => {
    const ictx = octx.child(`[${i}]`, `pilihan #${i + 1}`);
    if (!isSingleChar(opt)) {
      report.error(ictx, "INVALID_OPTION", `Setiap pilihan harus tepat satu karakter, ditemukan "${opt}".`);
    } else {
      checkCharForFont(opt, ictx, report);
    }
  });
  if (!bushu || bushu.char === undefined) return;
  if (!options.includes(bushu.char)) {
    report.error(octx, "ANSWER_NOT_IN_OPTIONS", `Jawaban benar "${bushu.char}" (bushu.char) tidak ada di bushuOptions.`);
  }
  const ambiguous = options.filter((opt) => bushu.variants.includes(opt));
  if (ambiguous.length) {
    report.error(
      octx,
      "VARIANT_AS_DISTRACTOR",
      `"${ambiguous.join(", ")}" adalah varian dari bushu yang sama (bushu.variants), ` +
        "jadi tidak boleh menjadi pengecoh karena jawabannya bisa dianggap benar."
    );
  }
}

function validateReadings(entry, ctx, report) {
  const rctx = ctx.field("readings");
  const readings = entry.readings;
  if (!isPlainObject(readings)) {
    report.error(rctx, "INVALID_READINGS", `Harus berupa objek { "kunyomi": [...], "onyomi": [...] }, ditemukan ${show(readings)}.`);
    return;
  }
  checkKeys(readings, READINGS_KEYS, rctx, report);
  const kun = stringArray(readings, "kunyomi", rctx, report, { required: true });
  const on = stringArray(readings, "onyomi", rctx, report, { required: true });
  if (kun && on && kun.length === 0 && on.length === 0) {
    report.error(rctx, "NO_READINGS", "kunyomi dan onyomi tidak boleh sama-sama kosong.");
  }

  // Okurigana notation such as た(べる) or た.べる uses brackets, dots and dashes.
  const stripNotation = (s) => Array.from(s.replace(/[()（）.\-・]/g, ""));
  (kun ?? []).forEach((r, i) => {
    if (!stripNotation(r).every(isHiragana)) {
      report.warn(rctx.child(`kunyomi[${i}]`, `kunyomi #${i + 1}`), "KUNYOMI_SCRIPT", `"${r}" biasanya ditulis dengan hiragana.`);
    }
  });
  (on ?? []).forEach((r, i) => {
    if (!stripNotation(r).every(isKatakana)) {
      report.warn(rctx.child(`onyomi[${i}]`, `onyomi #${i + 1}`), "ONYOMI_SCRIPT", `"${r}" biasanya ditulis dengan katakana.`);
    }
  });
}

// ---------------------------------------------------------------------------
// Kotoba

/** @returns {Map<string, {entry: object, ctx: Context, parts: Array|null, chapter: number|undefined}>} */
function validateKotobaTable(list, kanji, root, report) {
  const table = new Map();
  const ctx = root.field("kotoba");
  if (!Array.isArray(list) || list.length === 0) {
    report.error(ctx, "NO_KOTOBA", "Harus berupa daftar yang berisi minimal satu kotoba.");
    return table;
  }
  const byWordReading = new Map();
  list.forEach((entry, i) => {
    const label = isPlainObject(entry) && typeof entry.word === "string" ? `Kotoba "${entry.word}"` : `Kotoba #${i + 1}`;
    const kctx = root.child(`kotoba[${i}]`, label);
    const result = validateKotoba(entry, kctx, report);
    if (!result) return;
    if (result.id !== undefined) {
      if (table.has(result.id)) {
        report.error(kctx.field("id"), "DUPLICATE_KOTOBA_ID", `id "${result.id}" sudah dipakai oleh ${table.get(result.id).ctx.where}.`);
      } else {
        table.set(result.id, { entry, ctx: kctx, parts: result.parts, chapter: result.chapter });
      }
    }
    if (typeof entry.word === "string" && typeof entry.reading === "string") {
      const key = `${entry.word}\u0000${entry.reading}`;
      if (byWordReading.has(key)) {
        report.error(
          kctx.field("word"),
          "DUPLICATE_KOTOBA",
          `Kotoba "${entry.word}" (${entry.reading}) sudah ditulis di ${byWordReading.get(key)}. Satu kotoba cukup ditulis sekali.`
        );
      } else {
        byWordReading.set(key, kctx.where);
      }
    }
  });
  return table;
}

function validateKotoba(entry, ctx, report) {
  if (!isPlainObject(entry)) {
    report.error(ctx, "KOTOBA_NOT_OBJECT", "Setiap kotoba harus berupa objek { ... }.");
    return null;
  }
  checkKeys(entry, KOTOBA_KEYS, ctx, report);

  const id = requireId(entry, "id", ctx, report);
  const word = requireString(entry, "word", ctx, report);
  const reading = requireString(entry, "reading", ctx, report);
  if (reading !== undefined && !isAllKana(reading)) {
    report.error(ctx.field("reading"), "READING_NOT_KANA", `Cara baca harus hiragana/katakana saja, ditemukan "${reading}".`);
  }
  if (word !== undefined && !Array.from(word).some(isKanji)) {
    report.error(ctx.field("word"), "WORD_WITHOUT_KANJI", `Kotoba "${word}" tidak mengandung kanji.`);
  }

  // The ruby spells out which part of the reading belongs to which kanji;
  // the index and the reading contrast are built from it.
  let parts = null;
  const ruby = requireString(entry, "ruby", ctx, report);
  if (ruby !== undefined) {
    const rctx = ctx.field("ruby");
    const parsed = parseRubyField(ruby, rctx, report);
    if (parsed) {
      checkRubySegments(parsed, rctx, report, { requireAll: true });
      if (word !== undefined && parsed.plain !== word) {
        report.error(rctx, "RUBY_WORD_MISMATCH", `Tanpa furigana, ruby menjadi "${parsed.plain}", padahal word "${word}". Keduanya harus sama.`);
      }
      const spelled = parsed.segments.map((s) => s.ruby ?? s.text).join("");
      if (reading !== undefined && toHiragana(spelled) !== toHiragana(reading)) {
        report.error(rctx, "RUBY_READING_MISMATCH", `Furigana di ruby dibaca "${spelled}", padahal reading "${reading}". Periksa salah ketik.`);
      }
      parts = kotobaParts(ruby);
    }
  }

  if (!READING_TYPES.includes(entry.readingType)) {
    report.error(ctx.field("readingType"), "INVALID_READING_TYPE", `Harus salah satu dari ${READING_TYPES.join(", ")}. Ditemukan ${show(entry.readingType)}.`);
  }
  if (!PARTS_OF_SPEECH.includes(entry.pos)) {
    report.error(ctx.field("pos"), "INVALID_POS", `Harus salah satu dari ${PARTS_OF_SPEECH.join(", ")}. Ditemukan ${show(entry.pos)}.`);
  }
  requireString(entry, "meaning", ctx, report);
  // null = outside the book: allowed for index-only kotoba, not for quest kotoba (checked per quest).
  const chapter = entry.chapter === null ? null : scopeChapter(entry, "chapter", ctx, report, "Kotoba");
  optionalString(entry, "note", ctx, report);

  const readingLists = {};
  for (const key of ["readingDistractors", "readingDistractorsCross"]) {
    const list = stringArray(entry, key, ctx, report, { required: false }) ?? [];
    readingLists[key] = list;
    list.forEach((d, i) => {
      const dctx = ctx.child(`${key}[${i}]`, `${key} #${i + 1}`);
      if (!isAllKana(d)) {
        report.error(dctx, "DISTRACTOR_NOT_KANA", `Pengecoh cara baca harus hiragana/katakana, ditemukan "${d}".`);
      } else if (d === reading) {
        report.error(dctx, "DISTRACTOR_IS_ANSWER", `Pengecoh "${d}" sama dengan jawaban benar.`);
      }
    });
  }
  const inBoth = readingLists.readingDistractors.filter((d) => readingLists.readingDistractorsCross.includes(d));
  if (inBoth.length) {
    report.error(
      ctx.field("readingDistractorsCross"),
      "DISTRACTOR_IN_BOTH_LISTS",
      `"${inBoth.join(", ")}" ada di readingDistractors dan readingDistractorsCross sekaligus. ` +
        "Pilih salah satu: lintas jenis bacaan atau sejenis."
    );
  }

  return { id, parts, chapter };
}

// ---------------------------------------------------------------------------
// Regions and quests

/** @returns {{questKotoba: Map<string, string>, targetKanji: Set<string>, regionChapters: Set<number>}|null} */
function validateRegions(list, tables, root, report) {
  const ctx = root.field("regions");
  if (!Array.isArray(list) || list.length === 0) {
    report.error(ctx, "NO_REGIONS", "Harus berupa daftar wilayah yang berisi minimal satu wilayah (satu bab).");
    return null;
  }
  const usage = {
    questKotoba: new Map(), // kotoba id → where it is used
    targetKanji: new Set(),
    regionChapters: new Set(),
    questIds: new Map(),
    conversationIds: new Map(),
  };
  list.forEach((region, i) => validateRegion(region, i, tables, usage, root, report));
  return usage;
}

function validateRegion(region, index, tables, usage, root, report) {
  const label = isPlainObject(region) && Number.isInteger(region.chapter) ? `Wilayah bab ${region.chapter}` : `Wilayah #${index + 1}`;
  const ctx = root.child(`regions[${index}]`, label);
  if (!isPlainObject(region)) {
    report.error(ctx, "REGION_NOT_OBJECT", "Setiap wilayah harus berupa objek { ... }.");
    return;
  }
  checkKeys(region, REGION_KEYS, ctx, report);

  const chapter = scopeChapter(region, "chapter", ctx, report, "Wilayah");
  if (chapter !== undefined) {
    if (usage.regionChapters.has(chapter)) {
      report.error(ctx.field("chapter"), "DUPLICATE_REGION", `Bab ${chapter} sudah punya wilayah. Satu bab = satu wilayah.`);
    }
    usage.regionChapters.add(chapter);
  }
  requireString(region, "title", ctx, report);

  const ictx = ctx.field("intro");
  if (!isPlainObject(region.intro)) {
    report.error(ictx, "INVALID_REGION_INTRO", `Harus berupa objek { "summary", "points" }, ditemukan ${show(region.intro)}.`);
  } else {
    checkKeys(region.intro, REGION_INTRO_KEYS, ictx, report);
    requireString(region.intro, "summary", ictx, report);
    stringArray(region.intro, "points", ictx, report, { required: false });
  }

  validatePin(region, ctx, report);

  const qctx = ctx.field("quests");
  if (!Array.isArray(region.quests) || region.quests.length === 0) {
    report.error(qctx, "NO_QUESTS", "Setiap wilayah harus berisi minimal satu quest.");
    return;
  }
  region.quests.forEach((quest, j) => validateQuest(quest, j, { chapter }, tables, usage, ctx, report));
  checkRegionText(region, tables, ctx, report);
}

// The region window is shown before any quest is played, so its texts must
// not give away the material of its quests (D-79).
function checkRegionText(region, tables, ctx, report) {
  const texts = [
    { value: region.title, ctx: ctx.field("title") },
    { value: region.intro?.summary, ctx: ctx.child("intro.summary", "intro.summary") },
    ...(Array.isArray(region.intro?.points) ? region.intro.points : []).map((value, i) => ({
      value,
      ctx: ctx.child(`intro.points[${i}]`, `intro.points #${i + 1}`),
    })),
  ].filter((t) => typeof t.value === "string");

  for (const quest of region.quests) {
    if (!isPlainObject(quest)) continue;
    const kotoba = tables.kotoba.get(quest.kotoba)?.entry;
    if (!kotoba) continue;
    const giveaways = [kotoba.word, kotoba.reading].filter((v) => typeof v === "string" && v);
    const kanji = Array.isArray(quest.targetKanji) ? quest.targetKanji.filter((ch) => typeof ch === "string") : [];
    for (const text of texts) {
      const found = giveaways.find((g) => text.value.includes(g));
      if (found) {
        report.error(
          text.ctx,
          "REGION_TEXT_LEAKS_KOTOBA",
          `Teks wilayah memuat "${found}", kotoba (atau cara baca kotoba) quest ${quest.id}. Jendela pengantar bab tampil ` +
            "sebelum quest dimainkan, jadi materi quest tidak boleh muncul di sini sebelum percakapan pengantarnya. " +
            "Tulis ringkasan tanpa menyebut kotoba itu."
        );
        continue;
      }
      const shown = kanji.filter((ch) => text.value.includes(ch));
      if (shown.length) {
        report.warn(
          text.ctx,
          "REGION_TEXT_SHOWS_KANJI",
          `Teks wilayah memuat kanji sasaran ${shown.join(", ")} (quest ${quest.id}), yang tampil sebelum quest dimainkan. ` +
            "Pastikan teksnya tidak memberi petunjuk jawaban."
        );
      }
    }
  }
}

function validatePin(region, ctx, report) {
  const pctx = ctx.field("pin");
  if (region.pin === null) {
    report.warn(pctx, "PIN_MISSING", "Posisi lokasi di peta belum diisi (kolom pin_segment, pin_x, pin_y). Lokasi ditaruh di posisi sementara.");
    return;
  }
  if (!isPlainObject(region.pin)) {
    report.error(pctx, "INVALID_PIN", `Harus berupa objek { "segment", "x", "y" } atau null, ditemukan ${show(region.pin)}.`);
    return;
  }
  checkKeys(region.pin, PIN_KEYS, pctx, report);
  // The map is a column of image segments (D-108); the pin names its segment.
  if (!Number.isInteger(region.pin.segment) || region.pin.segment < 1) {
    report.error(pctx.field("segment"), "INVALID_PIN", `Harus nomor potongan peta, 1 untuk potongan paling atas. Ditemukan ${show(region.pin.segment)}.`);
  }
  for (const axis of ["x", "y"]) {
    const v = region.pin[axis];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 100) {
      report.error(
        pctx.field(axis),
        "INVALID_PIN",
        `Harus angka 0–100: posisi lokasi dalam persen lebar (x) atau tinggi (y) potongan peta. Ditemukan ${show(v)}.`
      );
    }
  }
}

function validateQuest(quest, index, region, tables, usage, parentCtx, report) {
  const label = isPlainObject(quest) && typeof quest.id === "string" ? `quest ${quest.id}` : `quest #${index + 1}`;
  const ctx = parentCtx.child(`quests[${index}]`, label);
  if (!isPlainObject(quest)) {
    report.error(ctx, "QUEST_NOT_OBJECT", "Setiap quest harus berupa objek { ... }.");
    return;
  }
  checkKeys(quest, QUEST_KEYS, ctx, report);

  const id = requireId(quest, "id", ctx, report);
  if (id !== undefined) {
    if (RESERVED_QUEST_ID.test(id)) {
      report.error(ctx.field("id"), "RESERVED_QUEST_ID", `"${id}" tidak boleh dipakai: awalan "REV-" dicadangkan untuk ulangan wilayah, dan "all" untuk halaman pratinjau.`);
    } else if (usage.questIds.has(id)) {
      report.error(ctx.field("id"), "DUPLICATE_QUEST_ID", `id "${id}" sudah dipakai oleh ${usage.questIds.get(id)}.`);
    } else {
      usage.questIds.set(id, ctx.where);
    }
  }

  // The kotoba this quest teaches.
  const kotobaId = requireString(quest, "kotoba", ctx, report);
  const kotoba = kotobaId !== undefined ? tables.kotoba.get(kotobaId) : undefined;
  if (kotobaId !== undefined) {
    if (!kotoba) {
      report.error(ctx.field("kotoba"), "UNKNOWN_KOTOBA", `Kotoba dengan id "${kotobaId}" tidak ada di tabel kotoba.`);
    } else {
      if (usage.questKotoba.has(kotobaId)) {
        report.error(ctx.field("kotoba"), "KOTOBA_IN_TWO_QUESTS", `Kotoba "${kotoba.entry.word}" sudah menjadi quest di ${usage.questKotoba.get(kotobaId)}.`);
      } else {
        usage.questKotoba.set(kotobaId, ctx.where);
      }
      if (region.chapter !== undefined && kotoba.chapter !== undefined && kotoba.chapter !== region.chapter) {
        // also catches null: a quest kotoba must be taught in the book
        report.error(
          ctx.field("kotoba"),
          "KOTOBA_CHAPTER_MISMATCH",
          `Kotoba "${kotoba.entry.word}" diajarkan di bab ${kotoba.chapter}, padahal quest ini ada di wilayah bab ${region.chapter}. ` +
            "Pindahkan quest ke wilayah bab yang sama dengan kotobanya."
        );
      }
    }
  }

  const targets = validateTargetKanji(quest, kotoba, tables, usage, ctx, report);
  requireString(quest, "productionPrompt", ctx, report);

  const questInfo = { region, kotoba: kotoba?.entry, targets };
  const intro = validateConversation(quest.intro, "intro", ctx.child("intro", "percakapan pengantar"), questInfo, usage, report);

  const tctx = ctx.field("tests");
  if (!Array.isArray(quest.tests)) {
    report.error(tctx, "EXPECTED_ARRAY", `Harus berupa daftar percakapan uji [...], ditemukan ${show(quest.tests)}.`);
    return;
  }
  if (quest.tests.length === 0) {
    report.incomplete(
      tctx,
      "NO_TESTS",
      "Quest ini belum punya percakapan uji (konteks lain dari percakapan pengantar). Selama draf, quest bisa dimainkan " +
        "dengan langkah uji dilewati dan ditandai belum lengkap."
    );
    return;
  }
  quest.tests.forEach((test, k) => {
    const cctx = ctx.child(`tests[${k}]`, `percakapan uji ${k + 1}`);
    const result = validateConversation(test, "test", cctx, questInfo, usage, report);
    if (!result?.blankPlain || !intro) return;
    if (intro.plains.includes(result.blankPlain)) {
      report.error(
        cctx.child(`lines[${result.blankIndex}]`, `baris ${result.blankIndex + 1}`),
        "TEST_REPEATS_INTRO",
        `Kalimat uji "${result.blankPlain}" sama persis dengan kalimat di percakapan pengantar. Uji harus memakai konteks lain.`
      );
    }
  });
}

/** @returns {string[]} valid target kanji */
function validateTargetKanji(quest, kotoba, tables, usage, ctx, report) {
  const tctx = ctx.field("targetKanji");
  const list = stringArray(quest, "targetKanji", ctx, report, { required: true });
  if (!list) return [];
  if (list.length === 0 || list.length > TARGET_KANJI_MAX) {
    report.error(tctx, "TARGET_KANJI_COUNT", `Isi 1–${TARGET_KANJI_MAX} kanji yang dilatih di quest ini, ditemukan ${list.length}.`);
  }
  const valid = [];
  list.forEach((ch, i) => {
    const ictx = tctx.child(`[${i}]`, `kanji sasaran ${ch}`);
    if (!isSingleChar(ch) || !isKanji(ch)) {
      report.error(ictx, "INVALID_KANJI", `Setiap kanji sasaran harus tepat satu karakter kanji, ditemukan "${ch}".`);
      return;
    }
    valid.push(ch);
    usage.targetKanji.add(ch);
    if (!tables.kanji.has(ch)) {
      report.error(ictx, "MISSING_KANJI_ENTRY", `Kanji sasaran "${ch}" belum ada di tabel kanji. Tambahkan baris untuk ${ch} di tab kanji.`);
    }
    if (!kotoba) return;
    const { word, readingType } = kotoba.entry;
    if (typeof word === "string" && !word.includes(ch)) {
      report.error(ictx, "TARGET_NOT_IN_WORD", `Kanji sasaran "${ch}" tidak ada di kotoba "${word}".`);
      return;
    }
    if (readingType === "special" || !kotoba.parts) return;
    const part = kotoba.parts.find((p) => p.kanji.includes(ch));
    if (!part || part.text !== ch) {
      report.error(
        ictx,
        "TARGET_KANJI_NOT_SEPARATED",
        `Furigana kanji sasaran "${ch}" digabung dengan kanji lain di ruby kotoba "${word}". ` +
          "Tulis satu pasang kurung furigana untuk setiap kanji, bukan satu kurung untuk seluruh kata, supaya bacaan kanji ini bisa ditampilkan tersendiri. " +
          "Jika memang tidak bisa dipisah (jukujikun), isi readingType dengan special."
      );
      return;
    }
    checkTargetReading(ch, part.reading, kotoba.entry, tables.kanji.get(ch)?.entry, ictx, report);
  });
  return valid;
}

// The reading of a target kanji should be one of the readings listed for it,
// of the kotoba's reading type. Sound changes (がっ in 学校) are legitimate,
// so this is a warning.
function checkTargetReading(ch, partReading, kotoba, kanji, ctx, report) {
  if (!kanji || !isPlainObject(kanji.readings) || !partReading) return;
  const listed = (type) =>
    (Array.isArray(kanji.readings[type]) ? kanji.readings[type] : [])
      .filter((r) => typeof r === "string")
      .map((r) => toHiragana(splitReadingNotation(r).kanjiPart.replace(/[-.\u30FB]/g, "")));
  const reading = toHiragana(partReading);
  const other = kotoba.readingType === "kunyomi" ? "onyomi" : "kunyomi";
  if (listed(kotoba.readingType).includes(reading)) return;
  if (listed(other).includes(reading)) {
    report.warn(
      ctx,
      "READING_TYPE_MISMATCH",
      `Di "${kotoba.word}", ${ch} dibaca "${partReading}", yang tercatat sebagai ${other} di tabel kanji, ` +
        `padahal readingType kotoba ini ${kotoba.readingType}. Periksa salah satunya.`
    );
    return;
  }
  report.warn(
    ctx,
    "READING_NOT_LISTED",
    `Di "${kotoba.word}", ${ch} dibaca "${partReading}", yang tidak ada di daftar ${kotoba.readingType} kanji ${ch}. ` +
      "Wajar jika bunyinya berubah di dalam kata (sokuon atau rendaku); jika bukan, periksa salah ketik di ruby atau di tabel kanji."
  );
}

// ---------------------------------------------------------------------------
// Conversations

/**
 * @param {"intro"|"test"} role
 * @returns {{plains: string[], blankPlain?: string, blankIndex?: number}|null}
 */
function validateConversation(conversation, role, ctx, quest, usage, report) {
  if (!isPlainObject(conversation)) {
    report.error(ctx, "CONVERSATION_NOT_OBJECT", `Harus berupa objek percakapan { "id", "lines", ... }, ditemukan ${show(conversation)}.`);
    return null;
  }
  const idText = typeof conversation.id === "string" ? conversation.id : null;
  if (idText) ctx = new Context(ctx.path, `${ctx.where} "${idText}"`);
  checkKeys(conversation, CONVERSATION_KEYS, ctx, report);

  const id = requireId(conversation, "id", ctx, report);
  if (id !== undefined) {
    if (usage.conversationIds.has(id)) {
      report.error(ctx.field("id"), "DUPLICATE_CONVERSATION_ID", `id "${id}" sudah dipakai oleh ${usage.conversationIds.get(id)}.`);
    } else {
      usage.conversationIds.set(id, ctx.where);
    }
  }
  requireString(conversation, "scene", ctx, report);

  const placeholder = conversation.isPlaceholder === true;
  if (conversation.isPlaceholder !== undefined && typeof conversation.isPlaceholder !== "boolean") {
    report.error(ctx.field("isPlaceholder"), "EXPECTED_BOOLEAN", `Harus true atau false, ditemukan ${show(conversation.isPlaceholder)}.`);
  }
  if (placeholder) {
    report.warn(
      ctx,
      "PLACEHOLDER_CONVERSATION",
      "PERCAKAPAN SEMENTARA: disusun pengembang dari contoh kalimat lama hanya supaya aplikasi bisa diuji. " +
        "Tim konten wajib menggantinya dengan percakapan tulisan sendiri sebelum materi dipakai.",
      { prominent: true }
    );
  }

  const lctx = ctx.field("lines");
  if (!Array.isArray(conversation.lines) || conversation.lines.length === 0) {
    report.error(lctx, "NO_LINES", "Percakapan harus berisi minimal satu baris.");
    return null;
  }

  const lines = conversation.lines.map((line, i) => validateLine(line, i, role, ctx, quest, report));
  const plains = lines.map((l) => l?.plain).filter((p) => p !== undefined);
  checkSentenceChapter(conversation, quest.region.chapter, ctx, report);

  // Two people talking, one of them the player (D-62). Placeholder
  // conversations are single sentences and are flagged above instead.
  const speakers = new Set(lines.map((l) => l?.speaker).filter(Boolean));
  if (!placeholder && (speakers.size !== SPEAKERS_PER_CONVERSATION || !speakers.has(PLAYER_SPEAKER))) {
    report.error(
      lctx,
      "CONVERSATION_SPEAKERS",
      `Percakapan harus antara ${SPEAKERS_PER_CONVERSATION} pembicara, salah satunya karakter pemain ("pemain"). ` +
        `Ditemukan: ${[...speakers].join(", ") || "(tidak ada)"}.`
    );
  }

  if (role === "intro") {
    if (!lines.some((l) => l?.hasHighlight)) {
      report.error(lctx, "NO_HIGHLIGHT", "Percakapan pengantar harus menyorot kotoba quest minimal di satu baris (kolom highlight).");
    }
    return { plains };
  }

  const blankIndexes = lines.map((l, i) => (l?.hasBlank ? i : -1)).filter((i) => i !== -1);
  if (blankIndexes.length !== 1) {
    report.error(lctx, "BLANK_COUNT", `Percakapan uji harus punya tepat satu baris dengan bagian kosong (kolom blank), ditemukan ${blankIndexes.length}.`);
    return { plains };
  }
  const blankIndex = blankIndexes[0];
  const blankLine = lines[blankIndex];
  checkBlankLeak(lines, blankIndex, quest.targets, ctx, report);
  return { plains, blankPlain: blankLine.plain, blankIndex };
}

function validateLine(line, index, role, convCtx, quest, report) {
  const ctx = convCtx.child(`lines[${index}]`, `baris ${index + 1}`);
  if (!isPlainObject(line)) {
    report.error(ctx, "LINE_NOT_OBJECT", "Setiap baris percakapan harus berupa objek { ... }.");
    return null;
  }
  checkKeys(line, LINE_KEYS, ctx, report);

  const speaker = requireString(line, "speaker", ctx, report);
  if (speaker !== undefined && speaker !== PLAYER_SPEAKER && !NPC_ID_PATTERN.test(speaker)) {
    report.error(
      ctx.field("speaker"),
      "INVALID_SPEAKER",
      `Pembicara harus "pemain" (di JSON: "player") atau id tokoh dengan huruf kecil latin, angka, dan "-" (misalnya lawan-bicara). Ditemukan "${speaker}".`
    );
  }

  let parsed = null;
  const ja = requireString(line, "ja", ctx, report);
  if (ja !== undefined) {
    const jctx = ctx.field("ja");
    parsed = parseRubyField(ja, jctx, report);
    if (parsed) checkRubySegments(parsed, jctx, report, { requireAll: false });
  }
  requireString(line, "translation", ctx, report);

  const highlight = optionalString(line, "highlight", ctx, report);
  const blank = optionalString(line, "blank", ctx, report);
  const hasHighlight = highlight !== undefined && highlight !== "";
  const hasBlank = blank !== undefined && blank !== "";

  if (role === "intro") {
    if (hasBlank || line.distractors !== undefined) {
      report.error(ctx.field("blank"), "BLANK_IN_INTRO", "Percakapan pengantar tidak boleh punya bagian kosong atau pengecoh. Bagian kosong hanya untuk percakapan uji.");
    }
    if (hasHighlight && parsed) checkSpan(parsed, highlight, "highlight", quest.targets, ctx.field("highlight"), report);
  } else {
    if (hasHighlight) {
      report.error(ctx.field("highlight"), "HIGHLIGHT_IN_TEST", "Sorotan hanya untuk percakapan pengantar. Di percakapan uji, sorotan membocorkan jawaban.");
    }
    if (hasBlank) {
      if (parsed) checkSpan(parsed, blank, "blank", quest.targets, ctx.field("blank"), report);
      checkBlankDistractors(line, blank, parsed, ctx, report);
    } else if (line.distractors !== undefined && line.distractors.length) {
      report.error(ctx.field("distractors"), "DISTRACTORS_WITHOUT_BLANK", "Baris ini punya pengecoh tetapi tidak punya bagian kosong (blank).");
    }
  }

  return { speaker, plain: parsed?.plain, hasHighlight, hasBlank, blank };
}

function checkBlankDistractors(line, blank, parsed, ctx, report) {
  const distractors = stringArray(line, "distractors", ctx, report, { required: true });
  if (!distractors) return;
  distractors.forEach((d, i) => {
    if (d === blank) {
      report.error(ctx.child(`distractors[${i}]`, `distractors #${i + 1}`), "DISTRACTOR_IS_ANSWER", `Pengecoh "${d}" sama dengan jawaban benar (blank).`);
    }
  });
  const usable = blankDistractorPool({ distractors, blank }).length;
  if (usable < DISTRACTORS_NEEDED) {
    const sentenceText = parsed ? `"${parsed.plain}"` : "ini";
    report.error(
      ctx.field("distractors"),
      "BLANK_DISTRACTORS_TOO_FEW",
      `Kalimat ${sentenceText} butuh minimal ${DISTRACTORS_NEEDED} pengecoh manual yang berbeda (kolom distractors), ` +
        `baru ada ${usable}. Uji konteks tidak memakai pengecoh otomatis, karena kode tidak bisa memastikan ` +
        "pengecoh itu salah dalam konteks percakapan."
    );
  }
}

// The answer must not be readable elsewhere in the same test conversation.
function checkBlankLeak(lines, blankIndex, targets, ctx, report) {
  const { blank } = lines[blankIndex];
  lines.forEach((line, i) => {
    if (i === blankIndex || !line?.plain) return;
    const lctx = ctx.child(`lines[${i}]`, `baris ${i + 1}`);
    if (line.plain.includes(blank)) {
      report.error(
        lctx.field("ja"),
        "BLANK_LEAKED",
        `Jawaban "${blank}" tertulis di baris ${i + 1}, jadi bagian kosong di baris ${blankIndex + 1} bisa dijawab dengan menyalin. Ubah salah satu baris.`
      );
      return;
    }
    const shown = targets.filter((ch) => line.plain.includes(ch));
    if (shown.length) {
      report.warn(
        lctx.field("ja"),
        "TARGET_KANJI_ELSEWHERE",
        `Kanji sasaran ${shown.join(", ")} juga muncul di baris ${i + 1}. Pastikan baris itu tidak memberi petunjuk jawaban. ` +
          "Furigana kanji sasaran selalu disembunyikan di percakapan uji."
      );
    }
  });
}

// A conversation should not need vocabulary or grammar from a later chapter
// than its region (D-48, D-58). Only a warning: sometimes unavoidable.
function checkSentenceChapter(conversation, regionChapter, ctx, report) {
  const sctx = ctx.field("sentenceChapter");
  if (!("sentenceChapter" in conversation)) {
    report.error(
      sctx,
      "MISSING_SENTENCE_CHAPTER",
      "Wajib ada: bab Minna tertinggi yang dibutuhkan percakapan ini, dari kosakata maupun pola kalimat semua barisnya " +
        "(kolom sentence_chapter). Isi - jika memakai kata atau pola di luar buku."
    );
    return;
  }
  const value = conversation.sentenceChapter;
  if (value === UNKNOWN_VALUE) {
    report.incomplete(sctx, "SENTENCE_CHAPTER_UNKNOWN", "Bab yang dibutuhkan percakapan ini belum diperiksa (kolom sentence_chapter berisi ?).");
    return;
  }
  if (value === null) {
    report.warn(sctx, "SENTENCE_OUTSIDE_BOOK", "Percakapan ini memakai kata atau pola kalimat di luar buku. Pastikan mahasiswa sudah mengenalnya.");
    return;
  }
  if (!Number.isInteger(value) || value < SCOPE_CHAPTER_MIN || value > SENTENCE_CHAPTER_MAX) {
    report.error(sctx, "INVALID_CHAPTER", `Harus bilangan bulat 1–${SENTENCE_CHAPTER_MAX}, atau null jika di luar buku. Ditemukan ${show(value)}.`);
    return;
  }
  if (Number.isInteger(regionChapter) && value > regionChapter) {
    report.warn(
      sctx,
      "SENTENCE_AHEAD_OF_REGION",
      `Percakapan ini membutuhkan materi sampai bab ${value}, padahal wilayahnya bab ${regionChapter}. ` +
        `Mahasiswa yang baru sampai bab ${regionChapter} bisa terbebani kata atau pola yang belum dipelajari. ` +
        "Pertimbangkan kalimat yang lebih sederhana."
    );
  }
}

function checkRubySegments(parsed, ctx, report, { requireAll }) {
  const unmarked = new Set();
  for (const seg of parsed.segments) {
    if (seg.ruby === null) {
      Array.from(seg.text).filter(isKanji).forEach((ch) => unmarked.add(ch));
      continue;
    }
    if (!isAllKana(seg.ruby)) {
      report.error(ctx, "RUBY_NOT_KANA", `Furigana "[${seg.text}|${seg.ruby}]": bagian setelah "|" harus hiragana/katakana.`);
    } else if (!Array.from(seg.text).some(isKanji)) {
      report.warn(ctx, "RUBY_WITHOUT_KANJI", `Furigana "[${seg.text}|${seg.ruby}]" dipasang pada teks tanpa kanji.`);
    } else if (!alignReading(seg.text, seg.ruby)) {
      report.error(ctx, "RUBY_MISMATCH", `Furigana "[${seg.text}|${seg.ruby}]": bagian kana di dalam kurung tidak cocok dengan furigananya.`);
    }
  }
  if (!unmarked.size) return;
  const list = [...unmarked].join(" ");
  if (requireAll) {
    report.error(ctx, "KANJI_WITHOUT_RUBY", `Kanji tanpa furigana: ${list}. Setiap kanji di kotoba wajib diberi furigana, karena index menampilkan bacaan per kanji.`);
  } else {
    report.warn(ctx, "KANJI_WITHOUT_RUBY", `Kanji tanpa furigana: ${list}. Tulis sebagai [漢字|かんじ] jika mahasiswa belum mengenalnya.`);
  }
}

/** Checks shared by `highlight` (intro) and `blank` (test). */
function checkSpan(parsed, span, field, targets, ctx, report) {
  const { plain, segments } = parsed;
  const first = plain.indexOf(span);
  if (first === -1) {
    report.error(
      ctx,
      "SPAN_NOT_FOUND",
      `"${span}" tidak ditemukan di kalimat "${plain}". Bandingkan dengan kalimat tanpa tanda furigana, termasuk bentuk kata kerjanya.`
    );
    return;
  }
  if (plain.indexOf(span, first + 1) !== -1) {
    report.error(ctx, "SPAN_AMBIGUOUS", `"${span}" muncul lebih dari sekali di kalimat "${plain}", jadi bagian yang dimaksud tidak jelas.`);
    return;
  }
  const end = first + span.length;
  let pos = 0;
  for (const seg of segments) {
    const segEnd = pos + seg.text.length;
    const overlaps = pos < end && segEnd > first;
    const contained = pos >= first && segEnd <= end;
    if (seg.ruby !== null && overlaps && !contained) {
      report.error(
        ctx,
        "SPAN_SPLITS_RUBY",
        `"${span}" memotong furigana "[${seg.text}|${seg.ruby}]". ` +
          `Isi ${field} harus mencakup seluruh isi kurung, atau tidak menyentuhnya sama sekali.`
      );
    }
    pos = segEnd;
  }
  if (targets.length && !targets.some((ch) => span.includes(ch))) {
    report.error(ctx, "SPAN_WITHOUT_TARGET", `"${span}" tidak mengandung kanji sasaran quest ini (${targets.join(", ")}).`);
  }
}

// ---------------------------------------------------------------------------
// Whole-content checks

// A line that contains another quest's kotoba shows it before that quest may
// have been played. The app hides its furigana until then (D-79); the team
// should know that the line will show the kanji without reading.
function checkOtherQuestKotoba(data, kotoba, root, report) {
  const quests = [];
  data.regions.forEach((region, i) => {
    if (!isPlainObject(region) || !Array.isArray(region.quests)) return;
    region.quests.forEach((quest, j) => {
      const entry = isPlainObject(quest) ? kotoba.get(quest.kotoba)?.entry : undefined;
      if (entry && typeof entry.word === "string") quests.push({ quest, word: entry.word, chapter: region.chapter, path: `regions[${i}].quests[${j}]` });
    });
  });
  for (const own of quests) {
    // Intro conversations show every reading (D-100); only test conversations hide them.
    const conversations = Array.isArray(own.quest.tests) ? own.quest.tests.map((t, k) => [`tests[${k}]`, t]) : [];
    for (const [key, conversation] of conversations) {
      if (!isPlainObject(conversation) || !Array.isArray(conversation.lines)) continue;
      conversation.lines.forEach((line, n) => {
        if (!isPlainObject(line) || typeof line.ja !== "string") return;
        let plain;
        try {
          plain = parseRuby(line.ja).plain;
        } catch {
          return;
        }
        for (const other of quests) {
          // Only an earlier chapter of the same world is sure to be played first; worlds open freely (D-117).
          const playedFirst = other.chapter < own.chapter && worldOf(other.chapter) === worldOf(own.chapter);
          if (other === own || playedFirst || !plain.includes(other.word)) continue;
          report.warn(
            root.child(`${own.path}.${key}.lines[${n}].ja`, `quest ${own.quest.id} › percakapan "${conversation.id}" › baris ${n + 1}`),
            "OTHER_QUEST_KOTOBA_IN_LINE",
            `Baris percakapan uji ini memuat "${other.word}", kotoba quest ${other.quest.id}, yang mungkin belum dimainkan. ` +
              "Furigananya disembunyikan sampai cara bacanya dikuasai di quest itu, jadi pemain melihat kanjinya tanpa bacaan."
          );
        }
      });
    }
  }
}

// A reading distractor that is a reading of one of the word's kanji may be a
// valid reading of the word itself (し for 四, なな for 七): the most frequent
// defect of this project (T-12, D-98). A warning only, because a reading of
// the kanji is not always a reading of the word (じん for the word 人).
function checkKanjiReadingDistractors(kotoba, kanji, report) {
  for (const { entry, ctx } of kotoba.values()) {
    if (typeof entry.word !== "string") continue;
    const forms = new Set();
    for (const ch of new Set(Array.from(entry.word).filter(isKanji))) {
      const readings = kanji.get(ch)?.entry.readings;
      if (!isPlainObject(readings)) continue;
      for (const r of [...(readings.kunyomi ?? []), ...(readings.onyomi ?? [])]) {
        if (typeof r !== "string") continue;
        const { kanjiPart, okurigana } = splitReadingNotation(r);
        forms.add(toHiragana(kanjiPart));
        if (okurigana) forms.add(toHiragana(kanjiPart + okurigana));
      }
    }
    for (const key of ["readingDistractors", "readingDistractorsCross"]) {
      (Array.isArray(entry[key]) ? entry[key] : []).forEach((d, i) => {
        if (typeof d === "string" && forms.has(toHiragana(d))) {
          report.warn(
            ctx.child(`${key}[${i}]`, `${key} #${i + 1}`),
            "DISTRACTOR_IS_KANJI_READING",
            `Pengecoh "${d}" adalah salah satu bacaan kanji di tabel kanji. Pastikan ini bukan bacaan sah kata "${entry.word}"; ` +
              "jika sah, pengecoh ini adalah jawaban benar kedua dan harus diganti."
          );
        }
      });
    }
  }
}

function checkUsage(data, { kanji, kotoba, usage }, root, report) {
  checkOtherQuestKotoba(data, kotoba, root, report);
  checkKanjiReadingDistractors(kotoba, kanji, report);
  for (const [char, { ctx }] of kanji) {
    const inKotoba = [...kotoba.values()].some((k) => typeof k.entry.word === "string" && k.entry.word.includes(char));
    if (!usage.targetKanji.has(char) && !inKotoba) {
      report.warn(ctx, "KANJI_UNUSED", `Kanji ${char} tidak dipakai kotoba mana pun, jadi tidak pernah tampil. Hapus, atau tambahkan kotobanya.`);
    }
  }

  const allKotoba = Array.isArray(data.kotoba) ? data.kotoba.filter(isPlainObject) : [];
  for (const [id, { entry, ctx, chapter }] of kotoba) {
    if (Number.isInteger(chapter) && !usage.regionChapters.has(chapter)) {
      report.warn(
        ctx,
        "KOTOBA_WITHOUT_REGION",
        `Kotoba "${entry.word}" ada di bab ${chapter}, tetapi wilayah ${regionId(chapter)} belum dibuat. Kotoba ini belum tampil di mana pun.`
      );
    }
    const inQuest = usage.questKotoba.has(id);
    const hasDistractors = (entry.readingDistractors?.length ?? 0) + (entry.readingDistractorsCross?.length ?? 0) > 0;
    if (!inQuest || entry.readingType === "special") {
      if (hasDistractors) {
        report.warn(
          ctx.field("readingDistractors"),
          "DISTRACTORS_UNUSED",
          inQuest
            ? "Kotoba ber-readingType special tidak punya soal cara baca, jadi pengecoh cara bacanya tidak dipakai."
            : "Kotoba ini bukan quest, jadi tidak punya soal cara baca dan pengecoh cara bacanya tidak dipakai."
        );
      }
      continue;
    }
    if (typeof entry.reading !== "string") continue;
    // Only kotoba of earlier chapters of the same world are sure to be settled
    // when this quest is played; same-chapter quests may still be ahead (D-84),
    // and an earlier world may not have been played at all (D-117).
    const settled = allKotoba.filter(
      (k) => Number.isInteger(k.chapter) && Number.isInteger(entry.chapter) && k.chapter < entry.chapter && worldOf(k.chapter) === worldOf(entry.chapter)
    );
    const { cross, manual, auto } = readingDistractorPool(settled, entry);
    const total = cross.length + manual.length + auto.length;
    if (total < DISTRACTORS_NEEDED) {
      report.warn(
        ctx,
        "READING_DISTRACTORS_TOO_FEW",
        `Soal cara baca "${entry.word}" hanya punya ${total} pengecoh (manual ${cross.length + manual.length}, ` +
          `otomatis ${auto.length}); seharusnya ${DISTRACTORS_NEEDED}. Pengecoh otomatis hanya diambil dari kotoba bab ` +
          "sebelumnya di dunia yang sama, karena bacaan kotoba quest yang belum dimainkan tidak boleh tampil. Soal tetap bisa dimainkan " +
          "dengan pilihan lebih sedikit. Tambahkan pengecoh di kolom reading_distractors."
      );
    }
  }
}

// Every string in the content is scanned for placeholders (D-91).
// ---------------------------------------------------------------------------
// Cats (D-121)

/**
 * Every mission frees one cat. Checked here: the cat is filled in, its layer
 * ids are well formed, no two missions share the same layers, and its name
 * gives nothing away (D-79). Whether the layer ids exist in data/layers.json
 * is checked next to this by catLayerProblems() (js/cats.js).
 *
 * A cat is shown, in the collection and on the map, once its mission is
 * passed. By then every mission of the earlier regions of the same world is
 * passed too, but missions of the same region may not be: the name may hold
 * the kotoba of its own mission and of earlier regions of its world only.
 */
function checkCats(data, kotoba, root, report) {
  if (!Array.isArray(data.regions)) return;
  const byKey = new Map();
  const missions = [];
  data.regions.forEach((region, i) => {
    if (!isPlainObject(region) || !Array.isArray(region.quests)) return;
    region.quests.forEach((quest, j) => {
      if (!isPlainObject(quest)) return;
      const ctx = root.child(`regions[${i}].quests[${j}]`, `Wilayah bab ${region.chapter} › quest ${quest.id}`);
      missions.push({ region, quest, ctx });
      const cat = quest.cat;
      const cctx = ctx.field("cat");
      if (cat === undefined || cat === null) {
        report.incomplete(cctx, "CAT_MISSING", "Kucing misi ini belum diisi (kolom cat_name, cat_body, cat_pattern, cat_accessory, cat_color di tab quest).");
        return;
      }
      if (!isPlainObject(cat)) {
        report.error(cctx, "INVALID_CAT", `Harus berupa objek { "name", "body", "pattern", "accessory", "color" }, ditemukan ${show(cat)}.`);
        return;
      }
      checkKeys(cat, CAT_KEYS, cctx, report);
      requireString(cat, "name", cctx, report);
      let complete = true;
      for (const key of ["body", "pattern", "accessory"]) {
        const value = requireString(cat, key, cctx, report);
        if (value === undefined) complete = false;
        else if (!LAYER_ID_PATTERN.test(value)) {
          report.error(cctx.field(key), "INVALID_CAT_LAYER", `"${value}" harus ID lapisan dari data/layers.json: huruf kecil latin, angka, dan "-".`);
          complete = false;
        }
      }
      if (cat.color !== null && cat.color !== undefined && (typeof cat.color !== "string" || !LAYER_ID_PATTERN.test(cat.color))) {
        report.error(cctx.field("color"), "INVALID_CAT_LAYER", `Harus ID warna dari data/layers.json, atau null. Ditemukan ${show(cat.color)}.`);
        complete = false;
      }
      if (!complete) return;
      const key = [cat.body, cat.pattern, cat.accessory, cat.color ?? ""].join(" / ");
      if (byKey.has(key)) {
        report.warn(
          cctx,
          "CAT_DUPLICATE",
          `Kucing misi ${quest.id} tersusun dari lapisan yang sama dengan kucing misi ${byKey.get(key)} (${key}). ` +
            "Setiap misi sebaiknya membebaskan kucing yang berbeda: ganti tubuh, corak, aksesori, atau warnanya."
        );
      } else {
        byKey.set(key, quest.id);
      }
    });
  });

  // D-79: what the name may show.
  const worldNumber = (chapter) => worldOf(chapter)?.number ?? null;
  for (const { region, quest, ctx } of missions) {
    const name = quest.cat?.name;
    if (typeof name !== "string" || !name) continue;
    const ahead = missions.filter(
      (m) =>
        m.quest !== quest &&
        !(worldNumber(m.region.chapter) === worldNumber(region.chapter) && m.region.chapter < region.chapter)
    );
    for (const other of ahead) {
      const k = kotoba.get(other.quest.kotoba)?.entry;
      if (!k) continue;
      const found = [k.word, k.reading].filter((v) => typeof v === "string" && v).find((g) => name.includes(g));
      if (found) {
        report.error(
          ctx.child("cat.name", "cat.name"),
          "CAT_NAME_LEAKS_KOTOBA",
          `Nama kucing "${name}" memuat "${found}", kotoba (atau cara baca kotoba) quest ${other.quest.id}. Kucing ini tampil ` +
            "di koleksi sebelum pengantar quest itu pasti sudah dilewati. Pilih nama tanpa kotoba itu (D-79)."
        );
        continue;
      }
      const kanji = (Array.isArray(other.quest.targetKanji) ? other.quest.targetKanji : []).filter((ch) => typeof ch === "string" && name.includes(ch));
      if (kanji.length) {
        report.warn(
          ctx.child("cat.name", "cat.name"),
          "CAT_NAME_SHOWS_KANJI",
          `Nama kucing "${name}" memuat kanji sasaran ${kanji.join(", ")} (quest ${other.quest.id}), yang mungkin belum diperkenalkan. ` +
            "Pastikan nama itu tidak memberi petunjuk jawaban."
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Rewards (D-123)

/**
 * Optional: content without rewards has none. Each reward needs a milestone
 * (regions, a world, or both). A milestone the material cannot reach yet is a
 * warning: the team may set it ahead of the chapters. The reward card is on
 * the map before any mission is played, so its texts follow D-79 like the
 * region texts.
 */
function checkRewards(data, kotoba, root, report) {
  if (data.rewards === undefined) return;
  const ctx = root.field("rewards");
  if (!Array.isArray(data.rewards)) {
    report.error(ctx, "EXPECTED_ARRAY", `Harus berupa daftar hadiah [...], ditemukan ${show(data.rewards)}.`);
    return;
  }
  const chapters = new Set((Array.isArray(data.regions) ? data.regions : []).map((r) => r?.chapter));
  const ids = new Set();
  data.rewards.forEach((reward, i) => {
    const label = isPlainObject(reward) && typeof reward.id === "string" ? `Hadiah ${reward.id}` : `Hadiah #${i + 1}`;
    const rctx = root.child(`rewards[${i}]`, label);
    if (!isPlainObject(reward)) {
      report.error(rctx, "REWARD_NOT_OBJECT", "Setiap hadiah harus berupa objek { ... }.");
      return;
    }
    checkKeys(reward, REWARD_KEYS, rctx, report);
    const id = requireId(reward, "id", rctx, report);
    if (id !== undefined) {
      if (ids.has(id)) report.error(rctx.field("id"), "DUPLICATE_REWARD", `Hadiah ${id} ditulis dua kali.`);
      ids.add(id);
    }
    requireString(reward, "title", rctx, report);
    requireString(reward, "text", rctx, report);

    const qctx = rctx.field("requires");
    const req = reward.requires;
    if (!isPlainObject(req)) {
      report.error(qctx, "INVALID_REWARD_REQUIRES", 'Harus berupa { "regions": ["B01", …], "world": 1 } dengan minimal salah satu.');
      return;
    }
    checkKeys(req, REQUIRES_KEYS, qctx, report);
    const regions = req.regions ?? [];
    if (!Array.isArray(regions) || !regions.every((r) => typeof r === "string" && /^B\d{2}$/.test(r))) {
      report.error(qctx.field("regions"), "INVALID_REWARD_REQUIRES", `Harus daftar ID wilayah seperti "B01", ditemukan ${show(req.regions)}.`);
      return;
    }
    const world = req.world ?? null;
    if (world !== null && !WORLDS.some((w) => w.number === world)) {
      report.error(qctx.field("world"), "INVALID_REWARD_REQUIRES", `Harus nomor dunia ${WORLDS.map((w) => w.number).join(" atau ")}, ditemukan ${show(world)}.`);
      return;
    }
    if (!regions.length && world === null) {
      report.error(qctx, "INVALID_REWARD_REQUIRES", "Hadiah butuh tonggak: wilayah yang harus diselesaikan (requires_chapters), dunia yang harus ditamatkan (requires_world), atau keduanya.");
      return;
    }
    const missing = regions.filter((r) => !chapters.has(Number(r.slice(1))));
    if (missing.length) {
      report.warn(
        qctx,
        "REWARD_UNREACHABLE",
        `Tonggak hadiah ini menyebut wilayah yang belum ada di materi: ${missing.join(", ")}. Hadiah belum bisa diraih sampai babnya ditambahkan.`
      );
    }
    if (world !== null) {
      const w = WORLDS.find((x) => x.number === world);
      const absent = [];
      for (let c = w.from; c <= w.to; c++) if (!chapters.has(c)) absent.push(c);
      if (absent.length) {
        report.warn(
          qctx.field("world"),
          "REWARD_UNREACHABLE",
          `Dunia ${world} baru tamat jika semua bab ${w.from}–${w.to} ada di materi dan tuntas; ${absent.length} bab belum ada. ` +
            "Pakai tonggak wilayah untuk hadiah yang bisa diraih sekarang."
        );
      }
    }

    // D-79: the card shows before any mission.
    for (const key of ["title", "text"]) {
      const value = reward[key];
      if (typeof value !== "string") continue;
      for (const [kid, { entry }] of kotoba) {
        const found = [entry.word, entry.reading].filter((v) => typeof v === "string" && v).find((g) => value.includes(g));
        if (!found) continue;
        report.error(
          rctx.field(key),
          "REWARD_TEXT_LEAKS_KOTOBA",
          `Teks hadiah memuat "${found}", kotoba (atau cara baca kotoba) "${kid}". Kartu hadiah tampil di peta sebelum misi ` +
            "dimainkan, jadi materi tidak boleh muncul di sini (D-79)."
        );
        break;
      }
    }
  });
}

function checkPlaceholders(data, root, report) {
  const walk = (value, path) => {
    if (typeof value === "string") {
      for (const [, inner] of value.matchAll(PLACEHOLDER)) {
        const ctx = new Context(path, path);
        if (NAME_PLACEHOLDER.test(inner)) {
          report.error(
            ctx,
            "NAME_PLACEHOLDER",
            `Penanda nama «${inner}» belum diganti. Tim menggantinya dengan nama buatan sendiri, bukan nama tokoh, ` +
              "perusahaan, atau universitas dari buku. Pakai nama yang sama untuk penanda yang sama di semua percakapan."
          );
        } else {
          report.incomplete(ctx, "PLACEHOLDER_TEXT", `Masih ada penanda «${inner}».`);
        }
      }
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => walk(v, `${path}[${i}]`));
    } else if (isPlainObject(value)) {
      for (const [key, v] of Object.entries(value)) walk(v, path ? `${path}.${key}` : key);
    }
  };
  walk(data, root.path);
}
