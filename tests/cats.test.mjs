// Cats (D-121): one cat per mission, built from layers (data/layers.json),
// derived from progress, checked by the validator (combinations, D-79 names).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROOT, clone, jsModule, loadSampleContent } from "./helpers.mjs";

const L = await import(jsModule("layers.js"));
const C = await import(jsModule("cats.js"));
const S = await import(jsModule("state.js"));
const { buildModel } = await import(jsModule("model.js"));
const { validateContent } = await import(jsModule("validate.js"));
const { exploration } = await import(jsModule("xp.js"));
const { convertCsvFilesToContent } = await import(jsModule("csv-content.js"));

const layers = JSON.parse(readFileSync(join(ROOT, "data/layers.json"), "utf8"));
const codes = (issues) => issues.map((i) => i.code);

test("data/layers.json is valid: 9 drawn files, 3 fur colors, 72 different cats", () => {
  assert.deepEqual(L.validateLayers(layers), { problems: [], warnings: [] });
  assert.equal(L.layerFiles(layers).length, 9, "2 bodies × (fill + line), 2 patterns, 3 accessories");
  assert.equal(L.combinationCount(layers), 72, "2 bodies × 3 patterns × 4 accessories × 3 colors");
  assert.equal(L.usesColors(layers), true);
});

test("switching to bodies drawn in color is a data change only (the 12-file option, D-116)", () => {
  const drawn = clone(layers);
  delete drawn.cat.colors;
  assert.deepEqual(L.validateLayers(drawn).problems, []);
  assert.equal(L.usesColors(drawn), false);
  const cat = { body: "duduk", pattern: "belang", accessory: "pita", color: null };
  assert.equal(L.resolveCat(drawn, cat, new Set()).color, null, "the fill is shown as drawn");
  assert.equal(L.resolveCat(layers, { ...cat, color: "abu" }, new Set()).color, "#DCD8D4", "the fill is painted in the fur color");
});

test("layers.json mistakes are caught: duplicate ids, bad paths, a missing anchor, a fur color too dark for the ink", () => {
  const bad = clone(layers);
  bad.cat.patterns.push({ id: "belang", image: "assets/kucing/corak/lain.png" });
  bad.cat.bodies[1].fill = "kucing/rebah.jpg";
  bad.cat.accessories.push({ id: "topi", image: "assets/kucing/aksesori/topi.png", anchor: "ekor" });
  bad.cat.colors.push({ id: "hitam", hex: "#2A2626" });
  const { problems, warnings } = L.validateLayers(bad);
  assert.ok(problems.some((p) => p.includes('"belang" ditulis dua kali')));
  assert.ok(problems.some((p) => p.includes("rebah") && p.includes("PNG")));
  assert.ok(problems.some((p) => p.includes('"ekor"')));
  assert.ok(warnings.some((w) => w.includes("hitam")), "a dark fur hides the ink outline");
});

test("a cat's layers: stand-ins until the drawings exist, free choices draw nothing, accessories sit on their anchor", () => {
  const choice = { body: "rebah", pattern: "totol", accessory: "bunga", color: "jingga" };
  const standIn = L.resolveCat(layers, choice, new Set());
  assert.match(standIn.fill, /^data:image\/svg\+xml,/);
  assert.match(standIn.pattern, /^data:image\/svg\+xml,/);
  assert.deepEqual([standIn.accessory.x, standIn.accessory.y], [170 / 512, 216 / 512], "the flower sits on the head anchor of rebah");
  const real = L.resolveCat(layers, choice, new Set(["assets/kucing/tubuh/rebah-isi.png", "assets/kucing/corak/totol.png"]));
  assert.equal(real.fill, "assets/kucing/tubuh/rebah-isi.png");
  assert.equal(real.pattern, "assets/kucing/corak/totol.png");
  assert.match(real.line, /^data:/, "a body line not delivered yet keeps its stand-in");
  const plain = L.resolveCat(layers, { body: "duduk", pattern: "polos", accessory: "tanpa", color: "krem" }, new Set());
  assert.equal(plain.pattern, null);
  assert.equal(plain.accessory, null);
});

/** Sample content with a second region (bab 7) of two missions, all with cats. */
function catContent() {
  const content = clone(loadSampleContent());
  const quest = (id, kotoba, cat) => {
    const q = clone(content.regions[0].quests[1]);
    Object.assign(q, { id, kotoba, cat });
    q.intro.id = `C-${id}-intro`;
    q.tests[0].id = `C-${id}-test`;
    return q;
  };
  content.kotoba.push(
    { ...content.kotoba[1], id: "shokudou", word: "食堂", ruby: "[食|しょく][堂|どう]", reading: "しょくどう", readingType: "onyomi", chapter: 7 },
    { ...content.kotoba[1], id: "inshoku", word: "飲食", ruby: "[飲|いん][食|しょく]", reading: "いんしょく", readingType: "onyomi", chapter: 7 }
  );
  content.regions.push({
    chapter: 7,
    title: "Wilayah Bab 7",
    intro: { summary: "x", points: [] },
    pin: null,
    quests: [
      quest("Q-shokudou", "shokudou", { name: "Momo", body: "duduk", pattern: "polos", accessory: "pita", color: "abu" }),
      quest("Q-inshoku", "inshoku", { name: "Kuro", body: "rebah", pattern: "belang", accessory: "tanpa", color: "krem" }),
    ],
  });
  return content;
}

test("the validator: a missing cat is unfinished work, and two missions may not share the same layers", () => {
  const content = catContent();
  delete content.regions[0].quests[0].cat;
  let result = validateContent(content);
  assert.ok(codes(result.warnings).includes("CAT_MISSING"), "a warning while the revision is a draft");
  content.contentRevision = "rev-1";
  result = validateContent(content);
  assert.ok(codes(result.errors).includes("CAT_MISSING"), "an error in a release");

  const twins = catContent();
  twins.regions[1].quests[1].cat = { ...twins.regions[1].quests[0].cat, name: "Kembar" };
  const warning = validateContent(twins).warnings.find((w) => w.code === "CAT_DUPLICATE");
  assert.ok(warning, "same body, pattern, accessory and color");
  assert.match(warning.message, /Q-shokudou/);

  const bad = catContent();
  bad.regions[1].quests[0].cat.body = "Duduk Besar";
  assert.ok(codes(validateContent(bad).errors).includes("INVALID_CAT_LAYER"));
});

test("D-79 for cat names: only the kotoba of its own mission and of earlier regions of its world may appear", () => {
  const name = (content, region, quest, value) => (content.regions[region].quests[quest].cat.name = value);

  const own = catContent();
  name(own, 1, 0, "食堂ちゃん"); // its own kotoba: shown only after the mission is passed
  assert.ok(!codes(validateContent(own).errors).includes("CAT_NAME_LEAKS_KOTOBA"));

  const earlier = catContent();
  name(earlier, 1, 0, "食べますくん"); // 食べます is bab 6, an earlier region of the same world
  assert.ok(!codes(validateContent(earlier).errors).includes("CAT_NAME_LEAKS_KOTOBA"));

  const sameRegion = catContent();
  name(sameRegion, 1, 0, "いんしょく"); // the reading of the other mission of bab 7, which may be unplayed
  const leak = validateContent(sameRegion).errors.find((e) => e.code === "CAT_NAME_LEAKS_KOTOBA");
  assert.ok(leak);
  assert.equal(leak.path, "regions[1].quests[0].cat.name");

  const later = catContent();
  name(later, 0, 0, "食堂"); // bab 6's cat named after a bab 7 kotoba
  assert.ok(codes(validateContent(later).errors).includes("CAT_NAME_LEAKS_KOTOBA"));

  const kanji = catContent();
  name(kanji, 0, 0, "堂"); // not a whole kotoba, but no target kanji either
  assert.ok(!codes(validateContent(kanji).warnings).includes("CAT_NAME_SHOWS_KANJI"));
  name(kanji, 0, 1, "飲ちゃん"); // 飲 is also the target kanji of the bab 7 missions, which may be unplayed
  assert.ok(codes(validateContent(kanji).warnings).includes("CAT_NAME_SHOWS_KANJI"));
});

test("layer ids the layers file does not have are reported, also by the terminal tool", () => {
  const content = catContent();
  assert.deepEqual(C.catLayerProblems(content, layers), []);
  content.regions[1].quests[0].cat.body = "dudk";
  content.regions[1].quests[1].cat.color = "ungu";
  const problems = C.catLayerProblems(content, layers);
  assert.equal(problems.length, 2);
  assert.match(problems[0].message, /tubuh "dudk"/);
  assert.equal(C.catLayerIssues(content, layers)[0].path, "regions[1].quests[0].cat");

  const dir = mkdtempSync(join(tmpdir(), "kanji-cats-"));
  writeFileSync(join(dir, "content.json"), JSON.stringify(content));
  const run = spawnSync(process.execPath, ["tools/validate-content.mjs", join(dir, "content.json")], { cwd: ROOT, encoding: "utf8" });
  assert.equal(run.status, 1);
  assert.match(run.stdout + run.stderr, /dudk/);
});

test("the quest tab may leave out the cat columns: older spreadsheets still convert", () => {
  const read = (name) => ({ name, text: readFileSync(join(ROOT, "tools/templates", name), "utf8") });
  const files = ["wilayah.csv", "kanji.csv", "kotoba.csv", "quest.csv", "percakapan.csv"].map(read);
  const withCats = convertCsvFilesToContent(files, "draft-0");
  assert.equal(withCats.fatal, null);
  assert.deepEqual(withCats.content.regions[0].quests[0].cat, { name: "«BELUM DIISI: nama kucing»", body: "duduk", pattern: "belang", accessory: "pita", color: "krem" });

  const quest = files.find((f) => f.name === "quest.csv");
  const lines = quest.text.trim().split("\n").map((l) => l.split(",").slice(0, 7).join(","));
  const old = files.map((f) => (f === quest ? { ...f, text: `${lines.join("\n")}\n` } : f));
  const converted = convertCsvFilesToContent(old, "draft-0");
  assert.equal(converted.fatal, null, "no missing-column error");
  assert.equal(converted.content.regions[0].quests[0].cat, null);
  assert.ok(codes(validateContent(converted.content).warnings).includes("CAT_MISSING"));
});

test("cats are free when their mission is passed; the rescue moment plays once; a reset forgets it", () => {
  const model = buildModel(catContent());
  const progress = S.createProgress();
  const b07 = model.regions.find((r) => r.chapter === 7);
  assert.deepEqual(C.regionCats(progress, b07).map((c) => c.free), [false, false]);
  progress.quests["Q-inshoku"] = { status: "passed", introDone: true };
  assert.deepEqual(C.regionCats(progress, b07).map((c) => c.free), [false, true]);
  assert.equal(C.catsOf(progress, model.regions).filter((c) => c.free).length, 1);

  const quest = model.quests.get("Q-inshoku");
  assert.equal(C.rescueDue(progress, quest), true);
  C.markRescueShown(progress, quest);
  assert.equal(C.rescueDue(progress, quest), false, "never twice");
  assert.equal(C.rescueDue(progress, model.quests.get("Q-shokudou")), false, "not before the mission is passed");

  assert.deepEqual(S.resetProgress().rescuesShown, []);
});

test("the exploration badge counts the world on screen only (D-122)", () => {
  const content = catContent();
  content.kotoba.push({ ...content.kotoba[1], id: "nomu26", word: "飲み物", ruby: "[飲|の]み[物|もの]", reading: "のみもの", readingType: "kunyomi", chapter: 26 });
  const q26 = clone(content.regions[1].quests[0]);
  Object.assign(q26, { id: "Q-26", kotoba: "nomu26", cat: { ...q26.cat, accessory: "lonceng" } });
  q26.intro.id = "C-26-intro";
  q26.tests[0].id = "C-26-test";
  content.regions.push({ chapter: 26, title: "Wilayah Bab 26", intro: { summary: "x", points: [] }, pin: null, quests: [q26] });
  const model = buildModel(content);
  const progress = S.createProgress();
  progress.quests["Q-26"] = { status: "passed", introDone: true };
  const [d1, d2] = model.worlds;
  assert.equal(exploration(model, progress, d1.regions), 0, "nothing done in world 1");
  assert.equal(exploration(model, progress, d2.regions), 50, "1 mission of 1, review not yet: 1 of 2");
});
