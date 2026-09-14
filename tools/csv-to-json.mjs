#!/usr/bin/env node
// Convert the content spreadsheet (exported as CSV) into data/content.json.
// This is a manual tool for the content team, not a build step of the app.
// The browser version with the same logic is tools/convert.html.
//
// Usage:
//   node tools/csv-to-json.mjs <file.csv> --revision <name> [--out data/content.json]
//
// The output is written only when it passes validation.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateContent } from "../js/validate.js";
import { convertCsvToContent, csvLocation, rowLabel } from "../js/csv-content.js";
import { printIssues, printSummary, red, green } from "./lib/print-issues.mjs";

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

  let text;
  try {
    text = readFileSync(inputPath, "utf8");
  } catch (err) {
    console.error(red(`CSV tidak bisa dibaca: ${inputPath}\n${err.message}`));
    process.exit(1);
  }

  const { fatal, problems, content, rowMap } = convertCsvToContent(text, args.revision);
  if (fatal) {
    console.error(red(fatal));
    process.exit(1);
  }
  if (problems.length) {
    for (const p of problems) {
      console.log(`${red("✗ ERROR CSV")} ${rowLabel(p.rows)}\n  ${p.message}\n`);
    }
    console.log(red(`Gagal: ${problems.length} masalah di CSV. ${outPath} tidak diubah.`));
    process.exit(1);
  }

  const { errors, warnings, notes } = validateContent(content);
  printIssues([...errors, ...warnings, ...notes], (issue) => csvLocation(rowMap, issue));
  printSummary(errors, warnings);

  if (errors.length) {
    console.log(red(`${outPath} tidak diubah. Perbaiki spreadsheet, ekspor ulang, lalu jalankan lagi.`));
    process.exit(1);
  }

  writeFileSync(outPath, `${JSON.stringify(content, null, 2)}\n`, "utf8");
  console.log(green(`Tersimpan: ${outPath} (${content.levels.length} level, revisi ${args.revision}).`));
}

main();
