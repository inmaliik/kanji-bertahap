// Command line tools and the Apps Script endpoint.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import vm from "node:vm";
import { ROOT, loadSampleContent } from "./helpers.mjs";

const node = (args) => spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8" });

test("validate-content succeeds on the sample content", () => {
  const result = node(["tools/validate-content.mjs"]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("CSV template converts to the first sample level", () => {
  const out = join(mkdtempSync(join(tmpdir(), "kanji-")), "content.json");
  const result = node(["tools/csv-to-json.mjs", "tools/content-template.csv", "--revision", "draft-0", "--out", out]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const converted = JSON.parse(readFileSync(out, "utf8"));
  assert.deepEqual(converted.levels[0], loadSampleContent().levels[0], "template matches data/content.json level L01");
});

test("the obsolete level_chapter column is rejected", () => {
  const dir = mkdtempSync(join(tmpdir(), "kanji-"));
  const template = readFileSync(join(ROOT, "tools/content-template.csv"), "utf8").split("\n");
  template[0] = template[0].replace("jlpt_level,", "jlpt_level,level_chapter,");
  for (let i = 1; i < template.length; i++) if (template[i]) template[i] = template[i].replace(",N5,", ",N5,6,");
  const csv = join(dir, "old.csv");
  writeFileSync(csv, template.join("\n"));
  const result = node(["tools/csv-to-json.mjs", csv, "--revision", "x", "--out", join(dir, "never.json")]);
  assert.equal(result.status, 1);
  assert.match(result.stderr + result.stdout, /level_chapter sudah tidak dipakai/);
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
