// Map version rules added in step 3: region order and locking, review
// sampling, what material may appear outside its quest (D-79), interface
// labels, and the asset contract. Japanese strings are test fixtures.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { ROOT, clone, jsModule, loadSampleContent, seededRandom } from "./helpers.mjs";

const { buildModel } = await import(jsModule("model.js"));
const P = await import(jsModule("progression.js"));
const R = await import(jsModule("reveal.js"));
const S = await import(jsModule("state.js"));
const { validateContent } = await import(jsModule("validate.js"));
const { validateUiLabels, UI_LABEL_FALLBACKS } = await import(jsModule("ui-labels.js"));
const { parseRuby } = await import(jsModule("ruby.js"));
const { kotobaWithReading, READING_DISPLAY } = await import(new URL("../js/screens/common.js", import.meta.url).href);

const codes = (issues) => issues.map((i) => i.code);

/** Sample content plus a second region (bab 7) with one quest, and 食堂 as a second 食 quest in bab 6. */
function twoRegions() {
  const content = clone(loadSampleContent());
  const base = content.regions[0].quests[0];
  content.kotoba.push(
    { ...content.kotoba[0], id: "shokudou", word: "食堂", ruby: "[食|しょく][堂|どう]", reading: "しょくどう", readingType: "onyomi" },
    { ...content.kotoba[1], id: "nomu7", word: "飲", ruby: "[飲|いん]", reading: "いん", readingType: "onyomi", chapter: 7 }
  );
  const shokudou = clone(base);
  Object.assign(shokudou, { id: "Q-shokudou", kotoba: "shokudou" });
  shokudou.intro.id = "C-s-intro";
  shokudou.tests[0].id = "C-s-test";
  content.regions[0].quests.push(shokudou);
  const q7 = clone(content.regions[0].quests[1]);
  Object.assign(q7, { id: "Q-7", kotoba: "nomu7" });
  q7.intro.id = "C-7-intro";
  q7.tests[0].id = "C-7-test";
  content.regions.push({ chapter: 7, title: "Wilayah Bab 7", intro: { summary: "x", points: [] }, pin: null, quests: [q7] });
  return buildModel(content);
}

const pass = (progress, id) => (progress.quests[id] = { status: "passed", introDone: true });

test("regions open one after another: region, its review, next region", () => {
  const model = twoRegions();
  const progress = S.createProgress();
  const status = () => Object.fromEntries(P.nodeStatuses(model, progress));
  assert.deepEqual(status(), { B06: "available", "REV-B06": "locked", B07: "locked", "REV-B07": "locked" });

  pass(progress, "Q-tabemasu");
  let summary = P.regionSummary(model, progress, model.regions[0]);
  assert.equal(summary.percent, 33);
  assert.equal(summary.state, "in_progress");

  pass(progress, "Q-nomimasu");
  pass(progress, "Q-shokudou");
  assert.equal(status()["REV-B06"], "available", "the review opens when every quest is passed");
  assert.equal(status().B07, "locked", "the next region waits for the review");
  assert.equal(P.regionSummary(model, progress, model.regions[0]).state, "review");

  progress.quests["REV-B06"] = { status: "passed" };
  assert.equal(status().B07, "available");
  summary = P.regionSummary(model, progress, model.regions[0]);
  assert.equal(summary.state, "done");
  assert.equal(summary.percent, 100);
});

test("a region review takes 70% from its region and 30% from earlier ones, without duplicates", () => {
  const model = twoRegions();
  const random = seededRandom(5);
  const b07 = P.sampleRegionReview(model, model.regions[1], random, 10);
  const fromB06 = b07.filter((item) => model.quests.get(item.questId).region.chapter === 6).length;
  // Bab 7 has only 3 items, so earlier regions fill the rest; bab 6 has 6
  // more (食 is its own bushu, and K:飲:shape went to bab 7 already).
  assert.equal(b07.length, 9);
  assert.equal(b07.length - fromB06, 3);
  const b06 = P.sampleRegionReview(model, model.regions[0], random, 10);
  assert.ok(b06.every((item) => model.quests.get(item.questId).region.chapter === 6), "no earlier region: all from this one");
  for (const sample of [b06, b07]) assert.equal(new Set(sample.map((i) => i.id)).size, sample.length, "K:飲:shape is shared by two quests but sampled once");

  const plenty = P.sampleRegionReview(model, model.regions[1], random, 4);
  assert.equal(plenty.filter((item) => item.questId === "Q-7").length, 3, "70% of 4 rounds to 3 from the region");
});

test("quest material appears outside its quest only after its intro (D-79)", () => {
  const model = twoRegions();
  const progress = S.createProgress();
  const kotoba = (id) => model.kotoba.get(id);
  assert.equal(R.kotobaVisible(model, progress, kotoba("tabemasu")), false, "before the intro");
  assert.deepEqual(R.indexKotoba(model, progress), [], "the index starts empty");

  progress.quests["Q-tabemasu"] = { status: "in_progress", introDone: true };
  assert.equal(R.kotobaVisible(model, progress, kotoba("tabemasu")), true, "after the intro");
  assert.equal(R.readingSettled(model, progress, kotoba("tabemasu")), false, "reading still pending (D-29)");
  assert.deepEqual(R.indexKanji(R.indexKotoba(model, progress)), ["食"]);

  // T-13: "no reading" must mean no reading at all, not the reading in kana.
  assert.equal(kotobaWithReading(kotoba("tabemasu"), { display: READING_DISPLAY.NONE }), "食べます");

  progress.items["W:tabemasu:reading"] = S.STREAK_TO_MASTER;
  assert.equal(R.readingSettled(model, progress, kotoba("tabemasu")), true, "reading mastered");
});

test("readings of other quests' kotoba stay hidden until settled, other readings of the same kanji do not", () => {
  const model = twoRegions();
  const progress = S.createProgress();
  const leaks = R.pendingReadingLeaks(model, progress, model.quests.get("Q-tabemasu"));
  const seg = (ja) => parseRuby(ja).segments.find((s) => s.ruby);
  assert.equal(leaks(seg("[飲|の]みます")), true, "飲みます is still ahead");
  assert.equal(leaks(seg("[食堂|しょくどう]")), true, "食堂 is still ahead");
  assert.equal(leaks(seg("[毎朝|まいあさ]")), false);
  pass(progress, "Q-nomimasu");
  const later = R.pendingReadingLeaks(model, progress, model.quests.get("Q-shokudou"));
  assert.equal(later(seg("[飲|の]みます")), false, "settled once its quest is passed");
  assert.equal(later(seg("[食|た]べます")), true, "食べます is still ahead for this player");
  const own = R.pendingReadingLeaks(model, progress, model.quests.get("Q-tabemasu"));
  assert.equal(own(seg("[食|た]べます")), false, "the quest's own reading is left to its own rule");
});

test("region texts may not contain the kotoba of their quests; lines naming another quest's kotoba warn", () => {
  const data = clone(loadSampleContent());
  data.regions[0].intro.summary = "Di bab ini: 食べます dan lainnya.";
  data.regions[0].intro.points = ["Kata のみます"];
  let result = validateContent(data);
  assert.equal(result.errors.filter((e) => e.code === "REGION_TEXT_LEAKS_KOTOBA").length, 2, "word and reading both count");

  const other = clone(loadSampleContent());
  other.regions[0].intro.summary = "Kanji 食 muncul di bab ini.";
  other.regions[0].quests[0].intro.lines[0].ja = "[毎晩|まいばん]お[茶|ちゃ]を[飲|の]みます。[食|た]べます。"; // intro: no warning (D-100)
  other.regions[0].quests[0].tests[0].lines[0].ja = "[毎晩|まいばん]お[茶|ちゃ]を[飲|の]みます。レストランで[晩|ばん]ごはんを[食|た]べます。";
  result = validateContent(other);
  assert.deepEqual(result.errors, []);
  assert.ok(codes(result.warnings).includes("REGION_TEXT_SHOWS_KANJI"));
  assert.ok(codes(result.warnings).includes("OTHER_QUEST_KOTOBA_IN_LINE"));
});

test("data/ui.json labels are complete and always carry furigana", () => {
  const data = JSON.parse(readFileSync(join(ROOT, "data/ui.json"), "utf8"));
  assert.deepEqual(validateUiLabels(data), []);
  assert.deepEqual(Object.keys(data.labels).sort(), Object.keys(UI_LABEL_FALLBACKS).sort());
  const broken = clone(data);
  broken.labels.review.ja = "復習";
  delete broken.labels.jukugo;
  const problems = validateUiLabels(broken).join("\n");
  assert.match(problems, /tanpa furigana/);
  assert.match(problems, /"jukugo" tidak ada/);
});

test("every asset slot has its placeholder file, within limits, and is listed in ASSETS.md", () => {
  const { slots } = JSON.parse(readFileSync(join(ROOT, "data/assets.json"), "utf8"));
  const doc = readFileSync(join(ROOT, "ASSETS.md"), "utf8");
  assert.ok(slots.length >= 4);
  for (const slot of slots) {
    if (slot.pattern) {
      // One file per conversation; a missing one shows a text placeholder (D-94).
      assert.ok(doc.includes(slot.pattern.split("{")[0]), `ASSETS.md describes ${slot.pattern}`);
      continue;
    }
    const bytes = readFileSync(join(ROOT, slot.path));
    assert.ok(bytes.length <= slot.maxKB * 1024, `${slot.path} over ${slot.maxKB} KB`);
    assert.equal(bytes.readUInt32BE(16), slot.width, `${slot.path} width`);
    assert.equal(bytes.readUInt32BE(20), slot.height, `${slot.path} height`);
    if (slot.placeholderSha256) assert.equal(createHash("sha256").update(bytes).digest("hex"), slot.placeholderSha256, `${slot.path} hash`);
    assert.ok(doc.includes(slot.path), `ASSETS.md lists ${slot.path}`);
  }
});

test("index windows: bushu, reading types and example lines follow D-79", () => {
  const model = twoRegions();
  const progress = S.createProgress();
  assert.equal(R.shapeSettled(model, progress, "飲"), false, "shape question still ahead");
  assert.equal(R.shapeSettled(model, progress, "食"), true, "食 is its own bushu: no shape question to protect (D-90)");
  assert.deepEqual(R.pendingReadingTypes(model, progress, "食"), ["kunyomi", "onyomi"], "食べます and 食堂 both ahead");
  assert.equal(R.shapeSettled(model, progress, "堂"), true, "no quest asks the shape of 堂");

  const taberu = model.kotoba.get("tabemasu");
  assert.deepEqual(R.seenLines(model, progress, taberu), [], "nothing seen yet");
  progress.quests["Q-tabemasu"] = { status: "in_progress", introDone: true };
  assert.deepEqual(R.seenLines(model, progress, taberu).map((s) => s.conversation.id), ["C-tabemasu-pengantar"]);
  progress.items["C:C-tabemasu-uji-1:test"] = 0; // answered once, wrongly
  assert.deepEqual(R.seenLines(model, progress, taberu).map((s) => s.conversation.id), ["C-tabemasu-pengantar", "C-tabemasu-uji-1"]);

  progress.items["K:飲:shape"] = S.STREAK_TO_MASTER;
  progress.items["W:tabemasu:reading"] = S.STREAK_TO_MASTER;
  assert.equal(R.shapeSettled(model, progress, "飲"), true, "shape of 飲 mastered");
  assert.deepEqual(R.pendingReadingTypes(model, progress, "食"), ["onyomi"], "食堂 still ahead");
});

test("automatic reading distractors come only from settled kotoba (D-84)", async () => {
  const { readingDistractorPool } = await import(jsModule("distractors.js"));
  const data = clone(loadSampleContent());
  const nomu = data.kotoba.find((k) => k.id === "nomimasu");
  const taberu = data.kotoba.find((k) => k.id === "tabemasu");
  assert.deepEqual(readingDistractorPool([nomu], taberu).auto, ["のみます"]);
  assert.deepEqual(readingDistractorPool([], taberu).auto, [], "飲みます not settled: not a candidate");

  // The validator counts only kotoba of earlier chapters, which are sure to be settled.
  taberu.readingDistractors = [];
  taberu.readingDistractorsCross = [];
  const { warnings } = validateContent(data);
  const thin = warnings.find((w) => w.code === "READING_DISTRACTORS_TOO_FEW" && w.path === "kotoba[0]");
  assert.ok(thin, "same-chapter 飲みます does not count");
  assert.match(thin.message, /otomatis 0/);
});

test("data/kana.json covers hiragana and katakana with romaji in every cell", () => {
  const { sections } = JSON.parse(readFileSync(join(ROOT, "data/kana.json"), "utf8"));
  let cells = 0;
  for (const section of sections) {
    for (const row of section.rows) {
      assert.equal(row.cells.length, section.columns.length, section.title);
      for (const cell of row.cells.filter(Boolean)) {
        cells += 1;
        const toKatakana = [...cell.hiragana].map((ch) => String.fromCodePoint(ch.codePointAt(0) + 0x60)).join("");
        assert.equal(cell.katakana, toKatakana, cell.hiragana);
        assert.match(cell.romaji, /^[a-z]+$/);
      }
    }
  }
  assert.equal(cells, 46 + 25 + 33);
  assert.equal(S.createProgress().welcomeSeen, false, "every new player sees the welcome screen with the disclaimer");
});

test("characters: two ready-made players on the standard canvas; the other speaker's name is still a placeholder", async () => {
  const { validateCharacters, castFor } = await import(jsModule("cast.js"));
  const data = JSON.parse(readFileSync(join(ROOT, "data/characters.json"), "utf8"));
  assert.deepEqual(data.players.map((c) => c.id), ["hana", "kazu"]);
  for (const c of data.players) {
    const bytes = readFileSync(join(ROOT, c.image));
    assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20), bytes[25]], [2160, 2160, 6], `${c.image}: 2160×2160 RGBA`);
  }
  const problems = validateCharacters(data);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /lawan-bicara: nama masih penanda/);
  assert.match(validateCharacters({ ...data, others: [{ id: "player", name: "x" }] }).join(), /dicadangkan/);

  const cast = castFor({ characters: data, progress: { character: "kazu" } });
  assert.equal(cast.nameOf("player"), "Kazu");
  assert.equal(castFor({ characters: data, progress: { character: null } }).nameOf("player"), "Kamu");
  assert.equal(cast.nameOf("lawan-bicara"), "«NAMA-TOKOH-LAWAN-BICARA»");
  assert.equal(S.createProgress().character, null, "a reset clears the chosen character");
});
