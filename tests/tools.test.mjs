// Command line tools and the Apps Script endpoint.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import vm from "node:vm";
import { ROOT, loadSampleContent } from "./helpers.mjs";

const node = (args) => spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8" });

test("validate-content succeeds on the sample content", () => {
  const result = node(["tools/validate-content.mjs"]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("the five CSV templates convert to data/content.json", () => {
  const out = join(mkdtempSync(join(tmpdir(), "kanji-")), "content.json");
  const result = node(["tools/csv-to-json.mjs", "tools/templates", "--revision", "draft-0", "--out", out]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.deepEqual(JSON.parse(readFileSync(out, "utf8")), loadSampleContent(), "templates match data/content.json");
});

test("the converter rejects the old one-sheet CSV and names the tab and row of each problem", () => {
  const dir = mkdtempSync(join(tmpdir(), "kanji-"));
  const templates = Object.fromEntries(
    readdirSync(join(ROOT, "tools/templates")).map((name) => [name, readFileSync(join(ROOT, "tools/templates", name), "utf8")])
  );

  writeFileSync(join(dir, "lama.csv"), "level_id,kanji,word\nL01,x,y\n");
  let result = node(["tools/csv-to-json.mjs", join(dir, "lama.csv"), "--revision", "x", "--out", join(dir, "never.json")]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /struktur lama/);

  // One tab missing.
  const partial = mkdtempSync(join(tmpdir(), "kanji-"));
  for (const [name, text] of Object.entries(templates)) if (name !== "quest.csv") writeFileSync(join(partial, name), text);
  result = node(["tools/csv-to-json.mjs", partial, "--revision", "x", "--out", join(dir, "never.json")]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /belum dipilih: quest/);

  // A conversation line that points to a missing quest conversation, and a kotoba error.
  const broken = mkdtempSync(join(tmpdir(), "kanji-"));
  for (const [name, text] of Object.entries(templates)) writeFileSync(join(broken, `Materi - ${name}`), text);
  writeFileSync(join(broken, "Materi - kotoba.csv"), templates["kotoba.csv"].replace("[飲|の]みます", "[飲|い]みます"));
  result = node(["tools/csv-to-json.mjs", broken, "--revision", "x", "--out", join(dir, "never.json")]);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Tab kotoba, baris 3/);
  assert.match(result.stdout, /RUBY_READING_MISMATCH/);

  writeFileSync(join(broken, "Materi - quest.csv"), templates["quest.csv"].replace("C-nomimasu-uji-1,", "C-tidak-ada,"));
  result = node(["tools/csv-to-json.mjs", broken, "--revision", "x", "--out", join(dir, "never.json")]);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Tab quest, baris 3[\s\S]*C-tidak-ada/);
  assert.match(result.stdout, /Tab percakapan, baris 5[\s\S]*tidak dipakai quest mana pun/);
});

test("Apps Script endpoint appends, deduplicates by rowId, adds columns, and neutralizes formulas", () => {
  const cells = [];
  const sheet = {
    getLastRow: () => cells.length,
    getLastColumn: () => Math.max(0, ...cells.map((r) => r.length)),
    getRange: (row, col, nRows, nCols) => ({
      getValues: () => Array.from({ length: nRows }, (_, i) => Array.from({ length: nCols }, (_, j) => cells[row - 1 + i]?.[col - 1 + j] ?? "")),
      setValues: (values) => values.forEach((r, i) => r.forEach((v, j) => ((cells[row - 1 + i] ??= [])[col - 1 + j] = v))),
      setNumberFormat: () => {},
    }),
  };
  let created = false;
  const context = vm.createContext({
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => (created ? sheet : null), insertSheet: () => ((created = true), sheet) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: "json" }, createTextOutput: (text) => ({ setMimeType: () => JSON.parse(text) }) },
  });
  vm.runInContext(readFileSync(join(ROOT, "tools/apps-script-log.gs"), "utf8"), context);
  const post = (payload) => context.doPost({ postData: { contents: JSON.stringify(payload) } });
  const columns = ["rowId", "levelId", "answer"];
  assert.deepEqual(post({ app: "kanji-bertahap", columns, rows: [["a", "L01", "x"], ["b", "L01", "=SUM(1)"]] }), { ok: true, received: 2, appended: 2 });
  assert.deepEqual(post({ app: "kanji-bertahap", columns, rows: [["b", "L01", "x"], ["c", "L02", "007"]] }), { ok: true, received: 2, appended: 1 });
  assert.equal(post({ app: "kanji-bertahap", columns: [...columns, "hintUsed"], rows: [["d", "L03", "y", 1]] }).appended, 1);
  assert.equal(post({ app: "other", columns: [], rows: [] }).ok, false);
  assert.deepEqual(cells[0], ["rowId", "levelId", "answer", "receivedAt", "hintUsed"]);
  assert.equal(cells[2][2], "'=SUM(1)");
  assert.equal(cells[3][2], "007");
  assert.equal(cells.length, 5);
});

test("no Japanese learning material is hardcoded in the app code", () => {
  const files = execFileSync("git", ["ls-files", "js"], { cwd: ROOT, encoding: "utf8" }).trim().split("\n");
  const japanese = /[぀-ヿ一-鿿]/;
  // Allowed: the ruby syntax example in content-team error messages, and punctuation in a regex.
  const allowed = [/\[漢字\|かんじ\]/, /（）\.\\-・/];
  const offenders = [];
  for (const file of files) {
    readFileSync(join(ROOT, file), "utf8")
      .split("\n")
      .forEach((line, i) => {
        const code = line.replace(/\/\/.*$/, "").trim();
        if (/^\*|^\/\*/.test(code) || !japanese.test(code)) return;
        if (allowed.some((pattern) => pattern.test(code))) return;
        offenders.push(`${file}:${i + 1}: ${code}`);
      });
  }
  assert.deepEqual(offenders, []);
});

test("rows recorded under a placeholder consent text are never sendable", async () => {
  const { sendableRows } = await import(new URL("../js/log-sender.js", import.meta.url).href);
  const { LOG_COLUMNS } = await import(new URL("../js/logger.js", import.meta.url).href);
  const { validateConsentText } = await import(new URL("../js/consent.js", import.meta.url).href);
  const row = (version) => LOG_COLUMNS.map((c) => (c === "consentVersion" ? version : ""));
  const rows = [row("placeholder-0"), row("v1-2026-10"), row("placeholder-draft2")];
  assert.deepEqual(sendableRows(rows), [rows[1]]);
  const text = { version: "v1", title: "t", sections: [{ heading: "h", paragraphs: ["p"] }] };
  assert.deepEqual(validateConsentText({ ...text, isPlaceholder: false }), []);
  assert.ok(validateConsentText({ ...text, isPlaceholder: true }).length, "placeholder flag needs a placeholder version");
  assert.ok(validateConsentText({ ...text, version: "placeholder-1", isPlaceholder: false }).length, "final text cannot use a placeholder version");
});
