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
    if (slot.pattern || slot.optional) {
      if (slot.optional && !slot.pattern) assert.ok(doc.includes(slot.path), `ASSETS.md lists ${slot.path}`);
      if (!slot.pattern) continue;
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

test("an earlier world is not sure to be played: reading distractors and kotoba in lines count only the same world (D-117)", () => {
  // 飲みます gets its own region; 食べます's test line names it.
  const split = (nomuChapter, taberuChapter) => {
    const data = clone(loadSampleContent());
    const [tabemasu, nomimasu] = data.regions[0].quests;
    data.regions = [
      { ...clone(data.regions[0]), chapter: nomuChapter, title: "Wilayah A", quests: [nomimasu] },
      { ...clone(data.regions[0]), chapter: taberuChapter, title: "Wilayah B", quests: [tabemasu] },
    ];
    data.kotoba.find((k) => k.id === "nomimasu").chapter = nomuChapter;
    const taberu = data.kotoba.find((k) => k.id === "tabemasu");
    taberu.chapter = taberuChapter;
    taberu.readingDistractors = [];
    taberu.readingDistractorsCross = [];
    tabemasu.tests[0].lines[0].ja = "[毎晩|まいばん]お[茶|ちゃ]を[飲|の]みます。レストランで[晩|ばん]ごはんを[食|た]べます。";
    const result = validateContent(data);
    assert.deepEqual(result.errors, []);
    return {
      thin: result.warnings.find((w) => w.code === "READING_DISTRACTORS_TOO_FEW" && w.path === "kotoba[0]"),
      leak: codes(result.warnings).includes("OTHER_QUEST_KOTOBA_IN_LINE"),
    };
  };
  const sameWorld = split(5, 6);
  assert.match(sameWorld.thin.message, /otomatis 1/, "bab 5 of the same world is settled first");
  assert.equal(sameWorld.leak, false);
  const otherWorld = split(5, 26);
  assert.match(otherWorld.thin.message, /otomatis 0/, "bab 5 is in Dunia 1, which a Dunia 2 player may skip");
  assert.equal(otherWorld.leak, true);
});

test("the disclaimer counts the chapters in the material, per book (D-117)", async () => {
  const { disclaimerScope } = await import(jsModule("screens/about.js"));
  assert.deepEqual(disclaimerScope(buildModel(loadSampleContent())), [{ bookLabel: "bookTitle", chapters: "6" }]);
  assert.deepEqual(disclaimerScope(regionsAt([1, 2, 3, 5, 26])), [
    { bookLabel: "bookTitle", chapters: "1–3, 5" },
    { bookLabel: "bookTitle2", chapters: "26" },
  ]);
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
    assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20), bytes[25]], [1080, 1080, 6], `${c.image}: 1080×1080 RGBA`);
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

test("XP comes from progress only: mastered items, passed quests and reviews; levels unlock nothing (D-105)", async () => {
  const { xpOf, levelOf, exploration } = await import(jsModule("xp.js"));
  const model = twoRegions();
  const progress = S.createProgress();
  assert.equal(xpOf(model, progress).xp, 0);

  // Trying earns nothing: a wrong answer (0) and a first correct answer (1) are not mastery.
  progress.items["W:tabemasu:reading"] = 0;
  progress.items["K:飲:shape"] = 1;
  assert.equal(xpOf(model, progress).xp, 0);

  progress.items["W:tabemasu:reading"] = S.STREAK_TO_MASTER;
  progress.items["K:飲:shape"] = S.STREAK_TO_MASTER;
  pass(progress, "Q-tabemasu");
  progress.quests["REV-B06"] = { status: "passed" };
  const { xp, mastered, quests, reviews } = xpOf(model, progress);
  assert.deepEqual({ mastered, quests, reviews }, { mastered: 2, quests: 1, reviews: 1 });
  assert.equal(xp, 2 * S.XP_PER_MASTERED_ITEM + S.XP_PER_QUEST + S.XP_PER_REVIEW);
  assert.equal(xpOf(model, progress).xp, xp, "the same progress always gives the same XP: nothing to farm");

  assert.deepEqual(levelOf(0), { level: 1, floor: 0, next: S.LEVEL_THRESHOLDS[1] });
  assert.equal(levelOf(S.LEVEL_THRESHOLDS[2]).level, 3);
  assert.equal(levelOf(1e6).next, null);
  assert.equal(exploration(model, progress), Math.round((2 / 6) * 100), "1 quest + 1 review of 4 quests + 2 reviews");
  // Lots of XP without the bab 6 review: bab 7 stays locked.
  delete progress.quests["REV-B06"];
  for (const id of ["W:nomimasu:reading", "W:shokudou:reading", "C:C-tabemasu-uji-1:test"]) progress.items[id] = S.STREAK_TO_MASTER;
  assert.ok(levelOf(xpOf(model, progress).xp).level > 1);
  assert.equal(P.nodeStatuses(model, progress).get("B07"), "locked", "a level opens no region");
});

test("exhibition leaderboard: off by default, per device, numbered players, survives a progress reset", async () => {
  const { MemoryStorage } = await import("./helpers.mjs");
  globalThis.localStorage = new MemoryStorage();
  try {
    const L = await import(`${jsModule("leaderboard.js")}?board`);
    const { sessionModeOf } = await import(jsModule("session-mode.js"));
    const mode = () => sessionModeOf(S.createProgress(), L.loadDevice());
    L.recordScore(mode(), { playerId: "a", character: "hana", xp: 10, level: 1 });
    assert.deepEqual(L.ranking(), [], "nothing is kept while exhibition mode is off");

    L.saveDevice({ exhibitionMode: true });
    L.recordScore(mode(), { playerId: "a", character: "hana", xp: 10, level: 1 });
    L.recordScore(mode(), { playerId: "b", character: "kazu", xp: 70, level: 2 });
    L.recordScore(mode(), { playerId: "a", character: "hana", xp: 40, level: 1 });
    assert.deepEqual(L.ranking().map((r) => [L.playerLabel(r.number), r.xp]), [["Pemain 02", 70], ["Pemain 01", 40]]);

    // A reset only replaces kanjiGame.progress.v2; the board and the device setting stay.
    globalThis.localStorage.removeItem(S.PROGRESS_KEY);
    assert.equal(L.ranking().length, 2);
    assert.equal(L.loadDevice().exhibitionMode, true);
    L.clearBoard();
    assert.deepEqual(L.ranking(), []);
    L.recordScore(mode(), { playerId: "c", character: "kazu", xp: 0, level: 1 });
    assert.equal(L.ranking()[0].number, 1, "numbers start again after clearing");
  } finally {
    delete globalThis.localStorage;
  }
});

test("map segments (D-108, D-117): one list per world in data/map.json, pins per segment, temporary places", async () => {
  const L = await import(jsModule("map-layout.js"));
  const layout = JSON.parse(readFileSync(join(ROOT, "data/map.json"), "utf8"));
  assert.deepEqual(L.validateMapLayout(layout), [], "data/map.json is valid");
  const one = (segments) => ({ worlds: [{ world: 1, segments }] });
  assert.equal(L.validateMapLayout(one([])).length, 1, "empty list");
  assert.equal(L.validateMapLayout(one(["potongan-01", "potongan-01"])).length, 1, "duplicate");
  assert.equal(L.validateMapLayout(one(["Potongan 1.png"])).length, 1, "file name without spaces or extension");
  assert.equal(L.validateMapLayout({ segments: ["potongan-01"] }).length, 1, "the old single list is rejected with the new shape");
  assert.equal(L.validateMapLayout({ worlds: [{ world: 3, segments: ["a"] }] }).length, 1, "unknown world");
  assert.equal(
    L.validateMapLayout({ worlds: [{ world: 1, segments: ["a"] }, { world: 2, segments: ["a"] }] }).length,
    1,
    "a file name is used by one world only"
  );
  const two = { worlds: [{ world: 1, segments: ["a", "b"] }, { world: 2, segments: ["d2-a"] }] };
  assert.deepEqual(L.validateMapLayout(two), []);
  assert.deepEqual(L.segmentsOf(two, 2), ["d2-a"]);
  assert.deepEqual(L.segmentsOf(one(["a"]), 2), [], "a world not listed yet has no segments");

  const regions = [1, 2, 3, 4, 5].map((chapter) => ({ id: `B0${chapter}`, chapter, world: 1, pin: null }));
  regions[4].pin = { segment: 6, x: 50, y: 50 };
  const { places, segmentCount } = L.placeLocations(regions, ["a", "b"]);
  assert.deepEqual(places.slice(0, 4).map((p) => p.segment), [1, 1, 1, 2], "three temporary places per segment");
  assert.ok(places.slice(0, 4).every((p) => p.temporary));
  assert.equal(segmentCount, 6, "a pin below the list still gets a (placeholder) segment");
  assert.deepEqual(L.columnPoint({ segment: 2, x: 40, y: 50 }, 4), { x: 40, y: 37.5 }, "half of segment 2 of 4");
  assert.deepEqual(L.unlistedSegments(regions, two).map((u) => u.segment), [6]);
});

test("a pin names its segment (D-108)", () => {
  const content = clone(loadSampleContent());
  content.regions[0].pin = { segment: 1, x: 40, y: 60 };
  assert.ok(!codes(validateContent(content).errors).includes("INVALID_PIN"));
  for (const pin of [{ x: 40, y: 60 }, { segment: 0, x: 40, y: 60 }, { segment: 1.5, x: 40, y: 60 }, { segment: 1, x: 140, y: 60 }]) {
    content.regions[0].pin = pin;
    assert.ok(validateContent(content).errors.length, `rejects ${JSON.stringify(pin)}`);
  }
});

/** Content with one region per chapter, each with one quest; not validated, only for the model and progression. */
function regionsAt(chapters) {
  const content = clone(loadSampleContent());
  const base = content.regions[0].quests[1];
  const kotoba = content.kotoba.find((k) => k.id === base.kotoba);
  content.regions = chapters.map((chapter) => {
    const quest = clone(base);
    Object.assign(quest, { id: `Q-${chapter}`, kotoba: `k${chapter}` });
    quest.intro.id = `C-${chapter}-intro`;
    quest.tests[0].id = `C-${chapter}-test`;
    content.kotoba.push({ ...kotoba, id: `k${chapter}`, chapter });
    return { chapter, title: `Wilayah Bab ${chapter}`, intro: { summary: "x", points: [] }, pin: null, quests: [quest] };
  });
  return buildModel(content);
}

const finish = (progress, chapter) => {
  pass(progress, `Q-${chapter}`);
  progress.quests[`REV-B${String(chapter).padStart(2, "0")}`] = { status: "passed" };
};

test("worlds (D-117): regions belong to the world of their chapter; a world without material is not shown", async () => {
  const W = await import(jsModule("worlds.js"));
  assert.deepEqual([1, 25, 26, 50, 51, 0].map((c) => W.worldOf(c)?.number ?? null), [1, 1, 2, 2, null, null]);
  assert.equal(W.chapterRanges([5, 1, 2, 3, 7, 8, 3]), "1–3, 5, 7–8");

  const sample = buildModel(loadSampleContent());
  assert.deepEqual(sample.worlds.map((w) => w.number), [1], "the sample has only bab 6, so only Dunia 1");
  const model = regionsAt([6, 7, 26, 27]);
  assert.deepEqual(model.worlds.map((w) => [w.number, w.regions.map((r) => r.id)]), [[1, ["B06", "B07"]], [2, ["B26", "B27"]]]);
  assert.deepEqual(model.regions.map((r) => r.world), [1, 1, 2, 2]);
});

test("worlds open freely; regions inside a world open one after another (D-117)", () => {
  const model = regionsAt([6, 7, 26, 27]);
  const progress = S.createProgress();
  const status = () => Object.fromEntries(P.nodeStatuses(model, progress));
  assert.deepEqual(status(), {
    B06: "available", "REV-B06": "locked", B07: "locked", "REV-B07": "locked",
    B26: "available", "REV-B26": "locked", B27: "locked", "REV-B27": "locked",
  });
  finish(progress, 26);
  assert.equal(status().B27, "available", "Dunia 2 goes on without Dunia 1");
  assert.equal(status().B07, "locked");
});

test("a region review samples earlier regions of its own world only (D-117)", () => {
  const model = regionsAt([6, 26, 27]);
  const b27 = P.sampleRegionReview(model, model.regions[2], seededRandom(3), 10);
  assert.ok(b27.length);
  assert.ok(b27.every((item) => model.quests.get(item.questId).region.world === 2), "nothing from bab 6");
  assert.ok(b27.some((item) => item.questId === "Q-26"), "bab 26 fills the earlier share");
  const b26 = P.sampleRegionReview(model, model.regions[1], seededRandom(3), 10);
  assert.ok(b26.every((item) => item.questId === "Q-26"), "the first region of a world has no earlier region");
});

test("a world is complete only when every chapter of its range is in the material and done (D-116)", () => {
  const book1 = Array.from({ length: 25 }, (_, i) => i + 1);
  const full = regionsAt([...book1, 26]);
  const progress = S.createProgress();
  book1.forEach((c) => finish(progress, c));
  finish(progress, 26);
  const [world1, world2] = full.worlds.map((w) => P.worldSummary(full, progress, w));
  assert.equal(world1.complete, true);
  assert.equal(world1.done, 25);
  assert.equal(world2.complete, false, "Dunia 2 has only bab 26 in the material");
  assert.equal(world2.missing.length, 24);

  const partial = regionsAt([1, 2, 3]);
  const p2 = S.createProgress();
  [1, 2, 3].forEach((c) => finish(p2, c));
  const summary = P.worldSummary(partial, p2, partial.worlds[0]);
  assert.equal(summary.done, summary.total, "every region in the material is done");
  assert.equal(summary.complete, false, "but bab 4–25 are not in the material yet");
});

test("the map shows the world looked at last; progress remembers it and a reset forgets it (D-117)", () => {
  const model = regionsAt([6, 26]);
  const progress = S.createProgress();
  assert.equal(progress.world, null);
  assert.equal(P.currentWorld(model, progress).number, 1, "first world with material by default");
  progress.world = 2;
  assert.equal(P.currentWorld(model, progress).number, 2);
  assert.equal(P.currentWorld(buildModel(loadSampleContent()), progress).number, 1, "a world without material falls back");
});

test("default pins per world (prototype B01–B03 on the team's map): used while the wilayah tab leaves the pin empty", async () => {
  const L = await import(jsModule("map-layout.js"));
  const layout = JSON.parse(readFileSync(join(ROOT, "data/map.json"), "utf8"));
  assert.deepEqual(L.defaultPinsOf(layout, 1), {
    1: { segment: 1, x: 34, y: 75 }, // west: Kyushu, Shikoku, Chugoku, Kansai
    2: { segment: 1, x: 67, y: 55 }, // Honshu, centre to Tohoku
    3: { segment: 1, x: 74, y: 21 }, // Hokkaido
  });
  assert.deepEqual(L.defaultPinsOf(layout, 2), {}, "world 2 has none");
  const regions = [1, 2, 3, 4].map((chapter) => ({ id: `B0${chapter}`, chapter, world: 1, pin: null }));
  regions[1].pin = { segment: 2, x: 10, y: 20 };
  const { places } = L.placeLocations(regions, ["a", "b"], L.defaultPinsOf(layout, 1));
  assert.deepEqual(places[0], { segment: 1, x: 34, y: 75, temporary: false }, "the default pin");
  assert.deepEqual(places[1], { segment: 2, x: 10, y: 20, temporary: false }, "the wilayah tab wins");
  assert.equal(places[3].temporary, true, "a chapter without a default stays temporary");
  const bad = { worlds: [{ world: 1, segments: ["a"], pins: { 1: { segment: 0, x: 50, y: 50 }, satu: { segment: 1, x: 5, y: 5 }, 2: { segment: 1, x: 120, y: 5 } } }] };
  assert.equal(L.validateMapLayout(bad).length, 3);
});
