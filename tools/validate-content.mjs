#!/usr/bin/env node
// Validate data/content.json with the same rules the app uses.
//
// Usage: node tools/validate-content.mjs [path/to/content.json]
// Exit code 0 = no errors (warnings allowed), 1 = errors found.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateContent } from "../js/validate.js";
import { describeJsonError } from "../js/content.js";
import { printIssues, printSummary, red } from "./lib/print-issues.mjs";

const file = resolve(process.argv[2] ?? "data/content.json");

let text;
try {
  text = readFileSync(file, "utf8");
} catch (err) {
  console.error(red(`File tidak bisa dibaca: ${file}\n${err.message}`));
  process.exit(1);
}

let data;
try {
  data = JSON.parse(text.replace(/^\uFEFF/, ""));
} catch (err) {
  console.error(red(describeJsonError(err, text).message));
  process.exit(1);
}

const { errors, warnings, notes } = validateContent(data);
console.log(`Memeriksa ${file}\n`);
printIssues([...errors, ...warnings, ...notes]);
if (!errors.length) {
  const quests = data.regions.flatMap((r) => r.quests);
  const conversations = quests.reduce((n, q) => n + 1 + q.tests.length, 0);
  console.log(
    `contentRevision: ${data.contentRevision} · ${data.regions.length} wilayah · ${quests.length} quest · ` +
      `${conversations} percakapan · ${data.kanji.length} kanji · ${data.kotoba.length} kotoba`
  );
}
printSummary(errors, warnings);
process.exit(errors.length ? 1 : 0);
