#!/usr/bin/env node
// Convert the content spreadsheet (five tabs, each downloaded as CSV) into
// data/content.json. This is a manual tool for the content team, not a build
// step of the app. The browser version with the same logic is tools/convert.html.
//
// Usage:
//   node tools/csv-to-json.mjs <folder-or-files...> --revision <name> [--out data/content.json]
//
// A folder argument means every .csv file inside it. Tabs are recognised by
// their header row, so file names do not matter. The output is written only
// when it passes validation.

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { validateContent } from "../js/validate.js";
import { convertCsvFilesToContent, csvLocation, rowLabel } from "../js/csv-content.js";
import { printIssues, printSummary, red, green } from "./lib/print-issues.mjs";

function parseArgs(argv) {
  const args = { inputs: [], revision: null, out: "data/content.json" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--revision") args.revision = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a.startsWith("--")) throw new Error(`Argumen tidak dikenal: ${a}`);
    else args.inputs.push(a);
  }
  if (!args.inputs.length || !args.revision) {
    throw new Error(
      "Cara pakai: node tools/csv-to-json.mjs <folder atau file CSV...> --revision <nama-revisi> [--out data/content.json]\n" +
        "Contoh:    node tools/csv-to-json.mjs ~/Downloads/materi --revision rev-1"
    );
  }
  return args;
}

function csvPaths(inputs) {
  return inputs.flatMap((input) => {
    const path = resolve(input);
    if (!statSync(path).isDirectory()) return [path];
    return readdirSync(path)
      .filter((name) => name.toLowerCase().endsWith(".csv"))
      .sort()
      .map((name) => join(path, name));
  });
}

function main() {
  let args;
  let files;
  try {
    args = parseArgs(process.argv.slice(2));
    files = csvPaths(args.inputs).map((path) => ({ name: basename(path), text: readFileSync(path, "utf8") }));
  } catch (err) {
    console.error(red(err.message));
    process.exit(2);
  }
  const outPath = resolve(args.out);

  const { fatal, problems, recognized, content, rowMap } = convertCsvFilesToContent(files, args.revision);
  for (const { name, tab } of recognized) console.log(`${name} → tab ${tab}`);
  console.log("");
  if (fatal) {
    console.error(red(fatal));
    process.exit(1);
  }
  if (problems.length) {
    for (const p of problems) {
      console.log(`${red("✗ ERROR CSV")} ${rowLabel(p)}\n  ${p.message}\n`);
    }
    console.log(red(`Gagal: ${problems.length} masalah di CSV. ${outPath} tidak diubah.`));
    process.exit(1);
  }

  const { errors, warnings, notes } = validateContent(content);
  printIssues([...errors, ...warnings, ...notes], (issue) => csvLocation(rowMap, issue));
  printSummary(errors, warnings);

  if (errors.length) {
    console.log(red(`${outPath} tidak diubah. Perbaiki spreadsheet, unduh ulang CSV-nya, lalu jalankan lagi.`));
    process.exit(1);
  }

  writeFileSync(outPath, `${JSON.stringify(content, null, 2)}\n`, "utf8");
  const quests = content.regions.reduce((n, r) => n + r.quests.length, 0);
  console.log(green(`Tersimpan: ${outPath} (${content.regions.length} wilayah, ${quests} quest, revisi ${args.revision}).`));
}

main();
