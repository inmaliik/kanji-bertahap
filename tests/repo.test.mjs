// What the public GitHub repository may hold (D-119). The repo is public on
// purpose, so the real protection is its content: the team's source material,
// developer screenshots, answer logs and any CSV other than the content
// templates must never be tracked. Run before every push, with the other tests.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./helpers.mjs";

const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" }).split("\0").filter(Boolean);

test("no source material, screenshots, logs or log exports are tracked", () => {
  const forbidden = tracked.filter(
    (f) =>
      /^(sumber|tmp|\.tmp|test-data|exports|logs|_situs)\//.test(f) ||
      /\.log$/i.test(f) ||
      (/\.csv$/i.test(f) && !f.startsWith("tools/templates/")) ||
      /kanji-bertahap-log-.*\.csv$/i.test(f)
  );
  assert.deepEqual(forbidden, []);
});

test("the repository states its copyright and carries no open-source licence", () => {
  assert.ok(tracked.includes("NOTICE"));
  const notice = readFileSync(join(ROOT, "NOTICE"), "utf8");
  assert.match(notice, /«NAMA-TIM»/);
  assert.match(notice, /tidak boleh/);
  const licences = tracked.filter((f) => /^(LICEN[CS]E|COPYING)(\.|$)/i.test(f));
  assert.deepEqual(licences, [], "no licence file until the group decides otherwise");
});
