// Content validation shared by the browser app and tools/validate-content.mjs.
// Pure module: no DOM, no fetch. All messages are Indonesian because they are
// read by the content team.

import { parseRuby, alignReading, RubySyntaxError } from "./ruby.js";
import {
  isKanji,
  isHiragana,
  isKatakana,
  isAllKana,
  isRadicalBlock,
  isSingleChar,
} from "./jp-text.js";
import { DISTRACTORS_NEEDED, readingDistractorPool, sentenceDistractorPool } from "./distractors.js";
import { levelChapter } from "./chapters.js";

export const SCHEMA_VERSION = 1;
export const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"]; // display and unlock order
export const READING_TYPES = ["kunyomi", "onyomi", "special"];
export const PARTS_OF_SPEECH = ["verb", "noun", "i-adj", "na-adj", "adverb", "other"];
export const CHAPTER_MIN = 1;
export const CHAPTER_MAX = 50;

// Review levels are generated at runtime with ids like "R01"; "all" is the
// preview route that shows every level.
const RESERVED_LEVEL_ID = /^(R\d+|all)$/i;
const LEVEL_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

const ROOT_KEYS = ["schemaVersion", "contentRevision", "levels"];
const LEVEL_KEYS = [
  "id", "kanji", "meaning", "jlptLevel", "chapter", "bushu", "bushuOptions",
  "readings", "kotoba", "productionPrompt",
];
const BUSHU_KEYS = ["char", "name", "meaning", "variants"];
const READINGS_KEYS = ["kunyomi", "onyomi"];
const KOTOBA_KEYS = [
  "word", "reading", "readingType", "pos", "meaning", "chapter", "note",
  "readingDistractors", "readingDistractorsCross", "examples",
];
const EXAMPLE_KEYS = ["ja", "blank", "translation", "sentenceChapter", "distractors"];

// Stable item ids derived from content, never from array positions, so that
// reordering rows during revisions keeps progress and logs comparable.
export const itemId = {
  shape: (levelId) => `${levelId}:shape`,
  reading: (levelId, word) => `${levelId}:reading:${word}`,
  sentence: (levelId, plainSentence) => `${levelId}:sentence:${plainSentence}`,
  production: (levelId) => `${levelId}:production`,
};

// ---------------------------------------------------------------------------
// Report plumbing

class Context {
  constructor(path, where) {
    this.path = path; // machine path, e.g. levels[0].kotoba[1].examples[0].ja
    this.where = where; // human path, e.g. Level L01 (食) › kotoba "食事" › contoh #1
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
  warn(ctx, code, message) {
    this.add(this.warnings, "warning", ctx, code, message, false);
  }
  note(ctx, code, message) {
    this.add(this.notes, "note", ctx, code, message, false);
  }
  result() {
    const byProminence = (a, b) => Number(b.prominent) - Number(a.prominent);
    return {
      errors: [...this.errors].sort(byProminence),
      warnings: this.warnings,
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
  if (obj[key] === undefined) return;
  if (typeof obj[key] !== "string") {
    report.error(ctx.field(key), "EXPECTED_STRING", `Harus berupa teks, ditemukan ${show(obj[key])}.`);
  }
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

function checkChapter(obj, ctx, report, key = "chapter") {
  const value = obj[key];
  if (value === null) return null;
  if (!Number.isInteger(value) || value < CHAPTER_MIN || value > CHAPTER_MAX) {
    report.error(
      ctx.field(key),
      "INVALID_CHAPTER",
      `Harus bilangan bulat ${CHAPTER_MIN}–${CHAPTER_MAX}, atau null jika tidak ada di buku. Ditemukan ${show(value)}.`
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
  checkKeys(data, ROOT_KEYS, root, report);

  if (data.schemaVersion !== SCHEMA_VERSION) {
    report.error(
      root.field("schemaVersion"),
      "UNSUPPORTED_SCHEMA",
      `Aplikasi ini membaca schemaVersion ${SCHEMA_VERSION}, ditemukan ${show(data.schemaVersion)}.`
    );
  }
  requireString(data, "contentRevision", root, report);

  if (!Array.isArray(data.levels) || data.levels.length === 0) {
    report.error(root.field("levels"), "NO_LEVELS", "Harus berupa daftar level yang berisi minimal satu level.");
    return report.result();
  }

  const seen = { ids: new Map(), kanji: new Map() };
  data.levels.forEach((level, i) => validateLevel(level, i, root, report, seen));
  checkLevelOrder(data.levels, root, report);
  checkReadingPools(data.levels, root, report);

  return report.result();
}

function levelLabel(level, index) {
  const id = isPlainObject(level) && typeof level.id === "string" ? level.id : `#${index + 1}`;
  const kanji = isPlainObject(level) && typeof level.kanji === "string" ? ` (${level.kanji})` : "";
  return `Level ${id}${kanji}`;
}

function validateLevel(level, index, root, report, seen) {
  const ctx = root.child(`levels[${index}]`, levelLabel(level, index));
  if (!isPlainObject(level)) {
    report.error(ctx, "LEVEL_NOT_OBJECT", "Setiap level harus berupa objek { ... }.");
    return;
  }
  checkKeys(level, LEVEL_KEYS, ctx, report);

  const id = requireString(level, "id", ctx, report);
  if (id !== undefined) {
    if (!LEVEL_ID_PATTERN.test(id)) {
      report.error(ctx.field("id"), "INVALID_LEVEL_ID", `"${id}" hanya boleh berisi huruf latin, angka, "-" dan "_".`);
    } else if (RESERVED_LEVEL_ID.test(id)) {
      report.error(ctx.field("id"), "RESERVED_LEVEL_ID", `"${id}" tidak boleh dipakai: format R + angka dicadangkan untuk level ulangan, dan "all" untuk halaman pratinjau semua level.`);
    }
    if (seen.ids.has(id)) {
      report.error(ctx.field("id"), "DUPLICATE_LEVEL_ID", `id "${id}" sudah dipakai oleh level urutan #${seen.ids.get(id) + 1}.`);
    } else {
      seen.ids.set(id, index);
    }
  }

  const kanji = requireString(level, "kanji", ctx, report);
  let levelKanji;
  if (kanji !== undefined) {
    if (!isSingleChar(kanji) || !isKanji(kanji)) {
      report.error(ctx.field("kanji"), "INVALID_KANJI", `Harus tepat satu karakter kanji, ditemukan "${kanji}".`);
    } else {
      levelKanji = kanji;
      if (seen.kanji.has(kanji)) {
        report.error(ctx.field("kanji"), "DUPLICATE_KANJI", `Kanji "${kanji}" sudah ada di level urutan #${seen.kanji.get(kanji) + 1}.`);
      } else {
        seen.kanji.set(kanji, index);
      }
    }
  }

  requireString(level, "meaning", ctx, report);

  if (!JLPT_LEVELS.includes(level.jlptLevel)) {
    report.error(ctx.field("jlptLevel"), "INVALID_JLPT", `Harus salah satu dari ${JLPT_LEVELS.join(", ")}. Ditemukan ${show(level.jlptLevel)}.`);
  }

  if ("chapter" in level) {
    report.warn(
      ctx.field("chapter"),
      "LEVEL_CHAPTER_IGNORED",
      "chapter level tidak dipakai lagi dan diabaikan: bab level dihitung otomatis dari chapter kotobanya. Hapus field ini."
    );
  }

  const bushu = validateBushu(level, ctx, report);
  validateBushuOptions(level, bushu, ctx, report);
  validateReadings(level, ctx, report);

  const kotobaCtx = ctx.field("kotoba");
  if (!Array.isArray(level.kotoba) || level.kotoba.length === 0) {
    report.error(kotobaCtx, "NO_KOTOBA", "Harus berupa daftar yang berisi minimal satu kotoba.");
  } else {
    const words = new Map();
    const sentenceIds = new Map();
    let exampleCount = 0;

    level.kotoba.forEach((kotoba, j) => {
      const result = validateKotoba(kotoba, j, { id, levelKanji }, ctx.child("kotoba", ""), report, sentenceIds);
      if (!result) return;
      exampleCount += result.exampleCount;
      if (result.word !== undefined) {
        if (words.has(result.word)) {
          report.error(result.ctx.field("word"), "DUPLICATE_WORD", `Kotoba "${result.word}" muncul dua kali di level ini.`);
        }
        words.set(result.word, j);
      }
    });

    if (exampleCount === 0) {
      report.warn(kotobaCtx, "NO_EXAMPLES", "Level ini tidak punya contoh kalimat, jadi tahap Kotoba dalam Kalimat akan dilewati.");
    }
  }

  requireString(level, "productionPrompt", ctx, report);
}

function validateBushu(level, ctx, report) {
  const bctx = ctx.field("bushu");
  const bushu = level.bushu;
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

function validateBushuOptions(level, bushu, ctx, report) {
  const octx = ctx.field("bushuOptions");
  const options = stringArray(level, "bushuOptions", ctx, report, { required: true });
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

function validateReadings(level, ctx, report) {
  const rctx = ctx.field("readings");
  const readings = level.readings;
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

// Returns null if the kotoba is not an object; otherwise a summary used by
// level-wide checks. `chapter` is undefined when invalid.
function validateKotoba(kotoba, index, level, parentCtx, report, sentenceIds) {
  const label = isPlainObject(kotoba) && typeof kotoba.word === "string" ? `kotoba "${kotoba.word}"` : `kotoba #${index + 1}`;
  const ctx = parentCtx.child(`[${index}]`, label);
  if (!isPlainObject(kotoba)) {
    report.error(ctx, "KOTOBA_NOT_OBJECT", "Setiap kotoba harus berupa objek { ... }.");
    return null;
  }
  checkKeys(kotoba, KOTOBA_KEYS, ctx, report);

  const word = requireString(kotoba, "word", ctx, report);
  if (word !== undefined && level.levelKanji && !word.includes(level.levelKanji)) {
    report.error(ctx.field("word"), "WORD_WITHOUT_KANJI", `Kotoba "${word}" tidak mengandung kanji level ini (${level.levelKanji}).`);
  }

  const reading = requireString(kotoba, "reading", ctx, report);
  if (reading !== undefined) {
    if (!isAllKana(reading)) {
      report.error(ctx.field("reading"), "READING_NOT_KANA", `Cara baca harus hiragana/katakana saja, ditemukan "${reading}".`);
    } else if (word !== undefined && !alignReading(word, reading)) {
      report.error(
        ctx.field("reading"),
        "READING_MISMATCH",
        `Cara baca "${reading}" tidak cocok dengan bagian kana di "${word}". Periksa salah ketik okurigana.`
      );
    }
  }

  if (!READING_TYPES.includes(kotoba.readingType)) {
    report.error(ctx.field("readingType"), "INVALID_READING_TYPE", `Harus salah satu dari ${READING_TYPES.join(", ")}. Ditemukan ${show(kotoba.readingType)}.`);
  }
  if (!PARTS_OF_SPEECH.includes(kotoba.pos)) {
    report.error(ctx.field("pos"), "INVALID_POS", `Harus salah satu dari ${PARTS_OF_SPEECH.join(", ")}. Ditemukan ${show(kotoba.pos)}.`);
  }
  requireString(kotoba, "meaning", ctx, report);

  let chapter;
  if (!("chapter" in kotoba)) {
    report.error(ctx.field("chapter"), "MISSING_CHAPTER", "Wajib ada. Isi null jika kotoba ini tidak ada di buku.");
  } else {
    chapter = checkChapter(kotoba, ctx, report);
  }

  optionalString(kotoba, "note", ctx, report);

  const readingLists = {};
  for (const key of ["readingDistractors", "readingDistractorsCross"]) {
    const list = stringArray(kotoba, key, ctx, report, { required: false }) ?? [];
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
  if (kotoba.readingType === "special" && (readingLists.readingDistractors.length || readingLists.readingDistractorsCross.length)) {
    report.warn(
      ctx.field("readingDistractors"),
      "DISTRACTORS_UNUSED",
      "Kotoba ber-readingType special tidak muncul di tahap Kun'yomi/On'yomi, jadi pengecoh cara bacanya tidak dipakai."
    );
  }

  let exampleCount = 0;
  if (!Array.isArray(kotoba.examples)) {
    report.error(ctx.field("examples"), "EXPECTED_ARRAY", `Harus berupa daftar [...], ditemukan ${show(kotoba.examples)}. Tulis [] jika tidak ada contoh.`);
  } else {
    kotoba.examples.forEach((example, k) => {
      validateExample(example, k, { ...level, kotobaChapter: chapter }, ctx.child("examples", ""), report, sentenceIds);
    });
    exampleCount = kotoba.examples.length;
  }

  return { ctx, word, chapter, exampleCount };
}

function validateExample(example, index, level, parentCtx, report, sentenceIds) {
  const ctx = parentCtx.child(`[${index}]`, `contoh #${index + 1}`);
  if (!isPlainObject(example)) {
    report.error(ctx, "EXAMPLE_NOT_OBJECT", "Setiap contoh kalimat harus berupa objek { ... }.");
    return;
  }
  checkKeys(example, EXAMPLE_KEYS, ctx, report);

  const ja = requireString(example, "ja", ctx, report);
  let parsed = null;
  if (ja !== undefined) {
    const jctx = ctx.field("ja");
    try {
      parsed = parseRuby(ja);
    } catch (err) {
      if (!(err instanceof RubySyntaxError)) throw err;
      report.error(jctx, "RUBY_SYNTAX", `Sintaks furigana salah: ${err.message} Lokasi: ${err.excerpt}`);
    }
    if (parsed) checkRubySegments(parsed, jctx, report);
  }

  const blank = requireString(example, "blank", ctx, report);
  if (parsed && blank !== undefined) {
    checkBlank(parsed, blank, level, ctx.field("blank"), report);
  }

  requireString(example, "translation", ctx, report);
  checkSentenceChapter(example, parsed, level.kotobaChapter, ctx, report);

  const distractors = stringArray(example, "distractors", ctx, report, { required: true });
  (distractors ?? []).forEach((d, i) => {
    if (d === blank) {
      report.error(ctx.child(`distractors[${i}]`, `distractors #${i + 1}`), "DISTRACTOR_IS_ANSWER", `Pengecoh "${d}" sama dengan jawaban benar (blank).`);
    }
  });
  if (distractors) {
    const usable = sentenceDistractorPool({ distractors, blank }).length;
    if (usable < DISTRACTORS_NEEDED) {
      const sentenceText = parsed ? `"${parsed.plain}"` : "ini";
      report.error(
        ctx.field("distractors"),
        "SENTENCE_DISTRACTORS_TOO_FEW",
        `Kalimat ${sentenceText} butuh minimal ${DISTRACTORS_NEEDED} pengecoh manual yang berbeda ` +
          `(kolom example_distractors), baru ada ${usable}. Tahap Kotoba dalam Kalimat tidak memakai ` +
          "pengecoh otomatis, karena kode tidak bisa memastikan pengecoh itu salah dalam konteks kalimat."
      );
    }
  }

  if (parsed && level.id !== undefined) {
    const id = itemId.sentence(level.id, parsed.plain);
    if (sentenceIds.has(id)) {
      report.error(ctx.field("ja"), "DUPLICATE_SENTENCE", `Kalimat "${parsed.plain}" sudah dipakai di ${sentenceIds.get(id)}.`);
    } else {
      sentenceIds.set(id, ctx.where);
    }
  }
}

// A sentence should not need vocabulary or grammar from a later Minna chapter
// than the kotoba it tests (D-48). Only a warning: sometimes unavoidable.
function checkSentenceChapter(example, parsed, kotobaChapter, ctx, report) {
  const sctx = ctx.field("sentenceChapter");
  if (!("sentenceChapter" in example)) {
    report.error(
      sctx,
      "MISSING_SENTENCE_CHAPTER",
      "Wajib ada: bab Minna tertinggi yang dibutuhkan kalimat ini, dari kosakata maupun pola kalimatnya " +
        "(kolom example_sentence_chapter). Isi null jika kalimat memakai kata atau pola di luar buku."
    );
    return;
  }
  const sentenceChapter = checkChapter(example, ctx, report, "sentenceChapter");
  const sentenceText = parsed ? `"${parsed.plain}"` : "ini";
  if (sentenceChapter === null) {
    report.warn(
      sctx,
      "SENTENCE_OUTSIDE_BOOK",
      `Kalimat ${sentenceText} memakai kata atau pola kalimat di luar buku. Pastikan mahasiswa sudah mengenalnya.`
    );
  } else if (Number.isInteger(sentenceChapter) && Number.isInteger(kotobaChapter) && sentenceChapter > kotobaChapter) {
    report.warn(
      sctx,
      "SENTENCE_AHEAD_OF_KOTOBA",
      `Kalimat ${sentenceText} membutuhkan materi sampai bab ${sentenceChapter}, padahal kotoba yang diujikan ` +
        `diajarkan di bab ${kotobaChapter}. Mahasiswa yang baru sampai bab ${kotobaChapter} bisa terbebani ` +
        "kata atau pola yang belum dipelajari. Pertimbangkan kalimat yang lebih sederhana."
    );
  }
}

function checkRubySegments(parsed, ctx, report) {
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
  if (unmarked.size) {
    report.warn(
      ctx,
      "KANJI_WITHOUT_RUBY",
      `Kanji tanpa furigana: ${[...unmarked].join(" ")}. Tulis sebagai [漢字|かんじ] jika mahasiswa belum mengenalnya.`
    );
  }
}

function checkBlank(parsed, blank, level, ctx, report) {
  const { plain, segments } = parsed;
  const first = plain.indexOf(blank);
  if (first === -1) {
    report.error(
      ctx,
      "BLANK_NOT_FOUND",
      `"${blank}" tidak ditemukan di kalimat "${plain}". ` +
        "Bandingkan dengan kalimat tanpa tanda furigana, termasuk bentuk kata kerjanya."
    );
    return;
  }
  if (plain.indexOf(blank, first + 1) !== -1) {
    report.error(ctx, "BLANK_AMBIGUOUS", `"${blank}" muncul lebih dari sekali di kalimat "${plain}", jadi bagian yang dikosongkan tidak jelas.`);
    return;
  }
  const end = first + blank.length;
  let pos = 0;
  for (const seg of segments) {
    const segEnd = pos + seg.text.length;
    const overlaps = pos < end && segEnd > first;
    const contained = pos >= first && segEnd <= end;
    if (seg.ruby !== null && overlaps && !contained) {
      report.error(
        ctx,
        "BLANK_SPLITS_RUBY",
        `"${blank}" memotong furigana "[${seg.text}|${seg.ruby}]". ` +
          "Bagian yang dikosongkan harus mencakup seluruh isi kurung, atau tidak menyentuhnya sama sekali."
      );
    }
    pos = segEnd;
  }
  if (level.levelKanji && !blank.includes(level.levelKanji)) {
    report.error(ctx, "BLANK_WITHOUT_KANJI", `"${blank}" tidak mengandung kanji level ini (${level.levelKanji}).`);
  }
}

function checkLevelOrder(levels, root, report) {
  // JLPT order is an error: the level list is grouped by JLPT level, so an N5
  // level after an N4 level would be locked behind a level shown in another group.
  let highest = null; // { rank, label, jlpt }
  levels.forEach((level, i) => {
    if (!isPlainObject(level)) return;
    const rank = JLPT_LEVELS.indexOf(level.jlptLevel);
    if (rank === -1) return;
    const label = levelLabel(level, i);
    if (highest && rank < highest.rank) {
      report.error(
        root.child(`levels[${i}]`, label),
        "LEVEL_ORDER",
        `URUTAN JLPT SALAH: ${label} (${level.jlptLevel}) diletakkan setelah ${highest.label} (${highest.jlpt}). ` +
          "Semua level N5 harus berada sebelum level N4. Jika dibiarkan, level ini terkunci di belakang level " +
          "dari kelompok JLPT lain. Pindahkan level ini ke posisi yang benar.",
        { prominent: true }
      );
    } else if (!highest || rank > highest.rank) {
      highest = { rank, label, jlpt: level.jlptLevel };
    }
  });

  // Chapter order is information only (D-39): level order follows the Hyouki
  // course, so Minna chapters are expected to jump around.
  const sequence = levels
    .filter(isPlainObject)
    .map((level, i) => ({ label: typeof level.id === "string" ? level.id : `#${i + 1}`, chapter: levelChapter(level) }));
  const descents = sequence.filter((cur, i) => {
    const prev = sequence[i - 1];
    return prev && cur.chapter !== null && prev.chapter !== null && cur.chapter < prev.chapter;
  });
  if (sequence.length > 1) {
    const chain = sequence.map((l) => `${l.label} (${l.chapter === null ? "di luar buku" : `bab ${l.chapter}`})`).join(" → ");
    report.note(
      root.field("levels"),
      "CHAPTER_SEQUENCE",
      `Urutan bab terkecil per level: ${chain}. ` +
        (descents.length
          ? `Bab turun di ${descents.map((d) => d.label).join(", ")}. Ini wajar karena urutan level mengikuti mata kuliah Hyouki, bukan bab Minna.`
          : "Bab tidak pernah turun.")
    );
  }
}

// Stages 2–3 combine manual and automatic distractors; warn when a question
// would show fewer than OPTION_COUNT choices.
function checkReadingPools(levels, root, report) {
  levels.forEach((level, i) => {
    if (!isPlainObject(level) || !Array.isArray(level.kotoba)) return;
    level.kotoba.forEach((kotoba, j) => {
      if (!isPlainObject(kotoba) || !["kunyomi", "onyomi"].includes(kotoba.readingType)) return;
      if (typeof kotoba.reading !== "string") return;
      const { cross, manual, auto } = readingDistractorPool(levels, level.id, kotoba);
      const total = cross.length + manual.length + auto.length;
      if (total < DISTRACTORS_NEEDED) {
        report.warn(
          root.child(`levels[${i}].kotoba[${j}]`, `${levelLabel(level, i)} › kotoba "${kotoba.word}"`),
          "READING_DISTRACTORS_TOO_FEW",
          `Soal cara baca "${kotoba.word}" hanya punya ${total} pengecoh (manual ${cross.length + manual.length}, ` +
            `otomatis ${auto.length}); seharusnya ${DISTRACTORS_NEEDED}. Soal tetap bisa dimainkan dengan pilihan ` +
            "lebih sedikit. Tambahkan pengecoh di kolom reading_distractors."
        );
      }
    });
  });
}
