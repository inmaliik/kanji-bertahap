// Netlify deploy (D-115). The build command from netlify.toml is run on a copy
// of the files git tracks, which is exactly what Netlify receives from GitHub.
// Only the six site items and build.json may come out; everything the app
// loads must be in it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { ROOT, jsModule } from "./helpers.mjs";

const SITE_ITEMS = ["assets", "css", "data", "index.html", "js", "tools"];
const EXTRA_ALLOWED = ["build.json"];

const toml = readFileSync(join(ROOT, "netlify.toml"), "utf8");
const setting = (key) => new RegExp(`^\\s*${key}\\s*=\\s*"([^"]*)"`, "m").exec(toml)?.[1];
const PUBLISH = setting("publish");
const COMMAND = setting("command");

/** Copy the tracked files to a fresh folder and run the Netlify build command there. */
function build(env = {}) {
  const dir = mkdtempSync(join(tmpdir(), "kanji-deploy-"));
  const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" }).split("\0").filter(Boolean);
  for (const file of tracked) {
    if (!existsSync(join(ROOT, file))) continue; // deleted in the working tree, not committed yet
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    copyFileSync(join(ROOT, file), join(dir, file));
  }
  const { COMMIT_REF, ...rest } = process.env;
  execFileSync("sh", ["-c", COMMAND], { cwd: dir, env: { ...rest, ...env }, stdio: "pipe" });
  return { dir, site: join(dir, PUBLISH) };
}

/** Every file below `dir`, as paths relative to `base` (forward slashes). */
function filesUnder(dir, base = dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...filesUnder(path, base));
    else out.push(relative(base, path).split("\\").join("/"));
  }
  return out;
}

const readBuild = (site) => JSON.parse(readFileSync(join(site, "build.json"), "utf8"));

test("netlify.toml publishes only the _situs folder, filled by terbitkan.sh", () => {
  assert.equal(PUBLISH, "_situs");
  assert.equal(COMMAND, "sh terbitkan.sh");
  assert.match(readFileSync(join(ROOT, ".gitignore"), "utf8"), /^_situs\/$/m, "the publish folder is never committed");
});

test("the published folder holds exactly the six site items and build.json", () => {
  const { dir, site } = build({ COMMIT_REF: "c12af39d0e1f2a3b4c5d6e7f8091a2b3c4d5e6f7" });
  try {
    assert.deepEqual(readdirSync(site).sort(), [...SITE_ITEMS, ...EXTRA_ALLOWED].sort());

    const files = filesUnder(site);
    const leaks = files.filter(
      (f) =>
        f.endsWith(".md") ||
        /^(tests|sumber|arsip|tmp|_situs)\//.test(f) ||
        (f.endsWith(".csv") && !f.startsWith("tools/templates/"))
    );
    assert.deepEqual(leaks, [], "internal documents, tests, archive or log exports were published");
    assert.ok(!files.some((f) => f.startsWith("data/archive/")), "the archive lives in arsip/, outside data/");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("build.json names the commit Netlify builds, and anything else becomes dev", () => {
  for (const [commit, expected] of [
    ["c12af39d0e1f2a3b4c5d6e7f8091a2b3c4d5e6f7", "c12af39d0e1f2a3b4c5d6e7f8091a2b3c4d5e6f7"],
    [undefined, "dev"],
    ['abc"}, "x": "1', "dev"],
  ]) {
    const { dir, site } = build(commit === undefined ? {} : { COMMIT_REF: commit });
    try {
      const info = readBuild(site);
      assert.equal(info.buildId, expected, `COMMIT_REF=${commit}`);
      assert.match(info.builtAt, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test("everything the app loads is in the published folder", () => {
  const { dir, site } = build({ COMMIT_REF: "0123456789ab" });
  try {
    const html = readFileSync(join(site, "index.html"), "utf8");
    const pageRefs = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map((m) => m[1]);
    const config = readFileSync(join(site, "js/config.js"), "utf8");
    const dataRefs = [...config.matchAll(/export const \w+_URL = "([^":]+)"/g)].map((m) => m[1]);
    assert.ok(pageRefs.includes("js/main.js") && dataRefs.includes("data/content.json") && dataRefs.includes("build.json"));
    const missing = [...pageRefs, ...dataRefs].filter((ref) => !existsSync(join(site, ref)));
    assert.deepEqual(missing, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("every log row carries the build id, dev until build.json says otherwise", async () => {
  const { parseBuildId, DEV_BUILD } = await import(jsModule("build.js"));
  assert.equal(parseBuildId({ buildId: "c12af39" }), "c12af39");
  assert.equal(parseBuildId({ buildId: "dev" }), DEV_BUILD);
  assert.equal(parseBuildId({ buildId: "<script>" }), DEV_BUILD);
  assert.equal(parseBuildId(null), DEV_BUILD);

  const { LOG_COLUMNS } = await import(jsModule("logger.js"));
  assert.ok(LOG_COLUMNS.includes("buildId"));
  const { playerColumns } = await import(jsModule("event-log.js"));
  const S = await import(jsModule("state.js"));
  const columns = playerColumns({ progress: S.createProgress(), content: { contentRevision: "draft-0" } }, "general");
  assert.equal(columns.buildId, DEV_BUILD, "no build.json outside Netlify");
});
