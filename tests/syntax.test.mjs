// Every script parses as an ES module. The other tests load only the pure
// modules, so a syntax error in a screen would otherwise go unnoticed until the
// app fails to start (it happened once: commit caecade). `node --check` on a
// .js file in this project does not report syntax errors, so each file is
// checked under a .mjs name, which Node always parses as a module.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { ROOT } from "./helpers.mjs";

function scripts(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return scripts(path);
    return /\.(m?js)$/.test(name) ? [path] : [];
  });
}

test("every script in js/ and tools/ parses as an ES module", () => {
  const files = [...scripts(join(ROOT, "js")), ...scripts(join(ROOT, "tools"))];
  assert.ok(files.length > 40, "the script folders were found");
  const dir = mkdtempSync(join(tmpdir(), "kanji-syntax-"));
  const broken = [];
  try {
    files.forEach((file, i) => {
      const copy = join(dir, `${i}.mjs`);
      copyFileSync(file, copy);
      try {
        execFileSync(process.execPath, ["--check", copy], { stdio: "pipe" });
      } catch (err) {
        const message = String(err.stderr).split("\n").find((line) => line.startsWith("SyntaxError")) ?? "SyntaxError";
        broken.push(`${relative(ROOT, file)}: ${message}`);
      }
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  assert.deepEqual(broken, []);
});
