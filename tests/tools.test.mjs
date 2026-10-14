// Command line tools and the Apps Script endpoint.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import vm from "node:vm";
import { ROOT, jsModule, loadSampleContent } from "./helpers.mjs";

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

test("the wilayah tab takes the pin as segment, x and y together (D-108)", async () => {
  const { convertCsvFilesToContent } = await import(jsModule("csv-content.js"));
  const dir = join(ROOT, "tools/templates");
  const files = readdirSync(dir).map((name) => ({ name, text: readFileSync(join(dir, name), "utf8") }));
  const withPin = (cells) => files.map((f) => (f.name === "wilayah.csv" ? { ...f, text: f.text.replace(/,,,\n$/, `,${cells}\n`) } : f));
  const ok = convertCsvFilesToContent(withPin("2,40,62.5"), "draft-0");
  assert.deepEqual(ok.problems, []);
  assert.deepEqual(ok.content.regions[0].pin, { segment: 2, x: 40, y: 62.5 });
  const half = convertCsvFilesToContent(withPin(",40,62.5"), "draft-0");
  assert.match(half.problems[0].message, /pin_segment, pin_x, dan pin_y bersamaan/);
});

test("ekspor-halaman: a transparent RGBA page becomes a white-backed 16-level grey PNG of the same size", async () => {
  const { readPng, writeGreyPng } = await import(new URL("../tools/lib/png.mjs", import.meta.url));
  const { deflateSync } = await import("node:zlib");
  // A 5 × 2 RGBA source: transparent, black, grey, half-transparent black, white.
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const px = [[0, 0, 0, 0], [0, 0, 0, 255], [128, 128, 128, 255], [0, 0, 0, 128], [255, 255, 255, 255]];
  const raw = Buffer.concat([0, 1].map(() => Buffer.from([0, ...px.flat()])));
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(5, 0); ihdr.writeUInt32BE(2, 4); ihdr[8] = 8; ihdr[9] = 6;
  const src = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
  const dir = mkdtempSync(join(tmpdir(), "halaman-"));
  writeFileSync(join(dir, "in.png"), src);
  const result = node(["tools/ekspor-halaman.mjs", join(dir, "in.png"), join(dir, "sub", "out.png")]);
  assert.equal(result.status, 0, result.stderr);
  const out = readPng(readFileSync(join(dir, "sub", "out.png")));
  assert.deepEqual([out.width, out.height, out.depth], [5, 2, 4], "same size, 4 bits per pixel");
  // transparent → white; grey 128 → level 8 of 15 (136); half-transparent black over white → level 7 (119).
  assert.deepEqual([0, 1, 2, 3, 4].map((x) => out.pixel(x, 1)[0]), [255, 0, 136, 119, 255]);
  const page = readPng(writeGreyPng(5, 2, (x) => [255, 0, 128, 128, 255][x], 8));
  assert.deepEqual([0, 1, 2, 3, 4].map((x) => page.pixel(x, 1)[0]), [255, 0, 128, 128, 255], "8-bit round trip");
});
