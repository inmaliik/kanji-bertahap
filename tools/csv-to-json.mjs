#!/usr/bin/env node
// Convert the content spreadsheet (exported as CSV) into data/content.json.
// This is a manual tool for the content team, not a build step of the app.
//
// Usage:
//   node tools/csv-to-json.mjs <file.csv> --revision <name> [--out data/content.json]
//
// One CSV row = one example sentence. Level and kotoba columns repeat on every
// row (or may be left empty on later rows of the same level/kotoba). A kotoba
// without example sentences is written as a row with empty example_* cells.
// The output is written only when it passes validation.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateContent, SCHEMA_VERSION } from "../js/validate.js";
import { printIssues, printSummary, red, green } from "./lib/print-issues.mjs";

const LEVEL_COLUMNS = [
  "level_id", "kanji", "level_meaning", "jlpt_level",
  "bushu_char", "bushu_name", "bushu_meaning", "bushu_variants", "bushu_options",
  "kunyomi", "onyomi", "production_prompt",
];
const KOTOBA_COLUMNS = [
  "word", "word_reading", "reading_type", "pos", "word_meaning", "word_chapter",
  "word_note", "reading_distractors", "reading_distractors_cross",
];
const EXAMPLE_COLUMNS = ["example_ja", "example_blank", "example_translation", "example_sentence_chapter", "example_distractors"];
const ALL_COLUMNS = [...LEVEL_COLUMNS, ...KOTOBA_COLUMNS, ...EXAMPLE_COLUMNS];

// ---------------------------------------------------------------------------
// CLI arguments

function parseArgs(argv) {
  const args = { input: null, revision: null, out: "data/content.json" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--revision") args.revision = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (!args.input) args.input = a;
    else throw new Error(`Argumen tidak dikenal: ${a}`);
  }
  if (!args.input || !args.revision) {
    throw new Error(
      "Cara pakai: node tools/csv-to-json.mjs <file.csv> --revision <nama-revisi> [--out data/content.json]\n" +
        "Contoh:    node tools/csv-to-json.mjs materi.csv --revision rev-1"
    );
  }
  return args;
}

// ---------------------------------------------------------------------------
// CSV parsing (RFC 4180: quoted fields, doubled quotes, newlines in quotes)

function parseCsv(text) {
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
// Rows → nested content

class CsvProblems {
  constructor() {
    this.list = [];
  }
  add(rows, message) {
    this.list.push({ rows, message });
  }
}

const rowLabel = (rows) => {
  const unique = [...new Set(rows)];
  const shown = unique.slice(0, 6).join(", ");
  return `Baris CSV ${shown}${unique.length > 6 ? ", …" : ""}`;
};

const splitList = (cell) =>
  cell
    .split(/[;；]/)
    .map((s) => s.trim())
    .filter(Boolean);

// Merge repeated cells of one entity. Empty cells inherit; differing
// non-empty cells are reported.
function mergeColumns(entries, columns, label, problems) {
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
      problems.add(entries.map((e) => e.row), `${label}: kolom ${col} berisi nilai berbeda: ${detail}. Samakan isinya.`);
    }
    merged[col] = values.size ? values.keys().next().value : "";
  }
  return merged;
}

function parseChapter(cell, column, rows, problems) {
  if (cell === "") {
    problems.add(rows, `Kolom ${column} kosong. Isi nomor bab, atau tanda - jika tidak ada di buku.`);
    return null;
  }
  if (cell === "-") return null;
  if (!/^\d+$/.test(cell)) {
    problems.add(rows, `Kolom ${column} berisi "${cell}". Isi angka saja (misalnya 6), atau tanda - jika tidak ada di buku.`);
    return null;
  }
  return Number(cell);
}

function buildContent(records, revision, problems) {
  const header = records[0].map((h) => h.trim().replace(/^\uFEFF/, ""));
  if (header.length === 1 && header[0].includes(";")) {
    throw new Error(
      "File ini memakai titik koma (;) sebagai pemisah kolom, bukan koma. Ekspor ulang dari Google Sheets " +
        "lewat File → Download → Comma Separated Values (.csv)."
    );
  }
  if (header.includes("level_chapter")) {
    throw new Error(
      "Kolom level_chapter sudah tidak dipakai: bab level kini dihitung otomatis dari kolom word_chapter. " +
        "Hapus kolom level_chapter dari spreadsheet, ekspor ulang, lalu jalankan lagi."
    );
  }
  const unknown = header.filter((h) => h && !ALL_COLUMNS.includes(h));
  const missing = ALL_COLUMNS.filter((c) => !header.includes(c));
  if (unknown.length || missing.length) {
    const parts = [];
    if (missing.length) parts.push(`Kolom yang tidak ditemukan: ${missing.join(", ")}.`);
    if (unknown.length) parts.push(`Kolom yang tidak dikenal (cek salah ketik): ${unknown.join(", ")}.`);
    throw new Error(`Baris judul (baris 1) tidak sesuai template.\n${parts.join("\n")}`);
  }

  // Collect rows, skipping completely empty ones (spreadsheets export them).
  const rows = [];
  records.slice(1).forEach((record, i) => {
    const row = i + 2; // spreadsheet row number
    if (record.every((c) => c.trim() === "")) return;
    const cells = {};
    header.forEach((h, idx) => {
      if (h) cells[h] = (record[idx] ?? "").trim();
    });
    if (record.length > header.length && record.slice(header.length).some((c) => c.trim())) {
      problems.add([row], "Baris ini punya lebih banyak kolom daripada baris judul. Periksa koma di dalam sel yang tidak diberi tanda kutip.");
    }
    if (!cells.level_id) {
      problems.add([row], "Kolom level_id kosong. Setiap baris wajib diisi level_id.");
      return;
    }
    if (!cells.word) {
      problems.add([row], "Kolom word kosong. Setiap baris wajib diisi kotoba.");
      return;
    }
    rows.push({ row, cells });
  });

  // Group while preserving first-appearance order.
  const levels = new Map();
  for (const entry of rows) {
    const { level_id: levelId, word } = entry.cells;
    if (!levels.has(levelId)) levels.set(levelId, { entries: [], kotoba: new Map() });
    const level = levels.get(levelId);
    level.entries.push(entry);
    if (!level.kotoba.has(word)) level.kotoba.set(word, []);
    level.kotoba.get(word).push(entry);
  }

  const rowMap = new Map(); // JSON path -> CSV rows, for error reporting
  const content = { schemaVersion: SCHEMA_VERSION, contentRevision: revision, levels: [] };

  [...levels].forEach(([levelId, group], i) => {
    const levelRows = group.entries.map((e) => e.row);
    const lv = mergeColumns(group.entries, LEVEL_COLUMNS, `Level ${levelId}`, problems);
    const levelPath = `levels[${i}]`;
    rowMap.set(levelPath, levelRows);

    const level = {
      id: levelId,
      kanji: lv.kanji,
      meaning: lv.level_meaning,
      jlptLevel: lv.jlpt_level,
      bushu: {
        char: lv.bushu_char,
        name: lv.bushu_name,
        meaning: lv.bushu_meaning,
        variants: splitList(lv.bushu_variants),
      },
      bushuOptions: splitList(lv.bushu_options),
      readings: { kunyomi: splitList(lv.kunyomi), onyomi: splitList(lv.onyomi) },
      kotoba: [],
      productionPrompt: lv.production_prompt,
    };

    [...group.kotoba].forEach(([word, entries], j) => {
      const kRows = entries.map((e) => e.row);
      const kv = mergeColumns(entries, KOTOBA_COLUMNS, `Level ${levelId}, kotoba "${word}"`, problems);
      const kotobaPath = `${levelPath}.kotoba[${j}]`;
      rowMap.set(kotobaPath, kRows);

      const kotoba = {
        word,
        reading: kv.word_reading,
        readingType: kv.reading_type,
        pos: kv.pos,
        meaning: kv.word_meaning,
        chapter: parseChapter(kv.word_chapter, "word_chapter", kRows, problems),
        note: kv.word_note,
        readingDistractors: splitList(kv.reading_distractors),
        readingDistractorsCross: splitList(kv.reading_distractors_cross),
        examples: [],
      };

      for (const { row, cells } of entries) {
        const filled = EXAMPLE_COLUMNS.filter((c) => cells[c] !== "");
        if (filled.length === 0) continue; // kotoba without an example on this row
        if (!cells.example_ja) {
          problems.add([row], `Kolom ${filled.join(", ")} terisi tetapi example_ja kosong.`);
          continue;
        }
        rowMap.set(`${kotobaPath}.examples[${kotoba.examples.length}]`, [row]);
        kotoba.examples.push({
          ja: cells.example_ja,
          blank: cells.example_blank,
          translation: cells.example_translation,
          sentenceChapter: parseChapter(cells.example_sentence_chapter, "example_sentence_chapter", [row], problems),
          distractors: splitList(cells.example_distractors),
        });
      }
      level.kotoba.push(kotoba);
    });

    content.levels.push(level);
  });

  return { content, rowMap };
}

function rowsForPath(rowMap, path) {
  let best = null;
  for (const key of rowMap.keys()) {
    const matches = path === key || path.startsWith(`${key}.`) || path.startsWith(`${key}[`);
    if (matches && (!best || key.length > best.length)) best = key;
  }
  return best ? rowMap.get(best) : null;
}

// ---------------------------------------------------------------------------

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(red(err.message));
    process.exit(2);
  }

  const inputPath = resolve(args.input);
  const outPath = resolve(args.out);

  let records;
  try {
    records = parseCsv(readFileSync(inputPath, "utf8"));
  } catch (err) {
    console.error(red(`CSV tidak bisa dibaca: ${inputPath}\n${err.message}`));
    process.exit(1);
  }
  if (records.length < 2) {
    console.error(red("CSV tidak berisi data: minimal satu baris judul dan satu baris materi."));
    process.exit(1);
  }

  const problems = new CsvProblems();
  let built;
  try {
    built = buildContent(records, args.revision, problems);
  } catch (err) {
    console.error(red(err.message));
    process.exit(1);
  }

  if (problems.list.length) {
    for (const p of problems.list) {
      console.log(`${red("✗ ERROR CSV")} ${rowLabel(p.rows)}\n  ${p.message}\n`);
    }
    console.log(red(`Gagal: ${problems.list.length} masalah di CSV. ${outPath} tidak diubah.`));
    process.exit(1);
  }

  const { content, rowMap } = built;
  const { errors, warnings, notes } = validateContent(content);
  printIssues([...errors, ...warnings, ...notes], (issue) => {
    const rows = rowsForPath(rowMap, issue.path);
    return rows ? rowLabel(rows) : null;
  });
  printSummary(errors, warnings);

  if (errors.length) {
    console.log(red(`${outPath} tidak diubah. Perbaiki spreadsheet, ekspor ulang, lalu jalankan lagi.`));
    process.exit(1);
  }

  writeFileSync(outPath, `${JSON.stringify(content, null, 2)}\n`, "utf8");
  console.log(green(`Tersimpan: ${outPath} (${content.levels.length} level, revisi ${args.revision}).`));
}

main();
