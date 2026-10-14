// Content rules (schema v2): ruby parsing, validation, the kanji–kotoba model,
// distractors. The Japanese sentences below are test fixtures only, not
// learning material.

import { test } from "node:test";
import assert from "node:assert/strict";
import { clone, jsModule, loadSampleContent, loadV1Archive, seededRandom } from "./helpers.mjs";

const { parseRuby, alignReading, hideRuby } = await import(jsModule("ruby.js"));
const { validateContent } = await import(jsModule("validate.js"));
const { buildModel, itemId, kanjiReadingIn, kotobaParts, regionId, reviewId } = await import(jsModule("model.js"));
const { readingOptions, readingDistractorPool, blankOptions, OPTION_TYPE } = await import(jsModule("distractors.js"));
const { splitReadingNotation } = await import(jsModule("jp-text.js"));

const codes = (issues) => issues.map((i) => i.code);
const sample = () => clone(loadSampleContent());
const questOf = (data, id) => data.regions.flatMap((r) => r.quests).find((q) => q.id === id);

/** A real two-person conversation, as the team will write them. */
function conversation(id, lines, extra = {}) {
  return { id, scene: "Di kantin", sentenceChapter: 6, lines, ...extra };
}

test("ruby markup parses and rejects malformed syntax", () => {
  assert.deepEqual(parseRuby("[毎朝|まいあさ]パン").segments, [
    { text: "毎朝", ruby: "まいあさ" },
    { text: "パン", ruby: null },
  ]);
  for (const bad of ["[毎朝まいあさ]", "[毎朝|]", "毎朝]", "毎朝|パン", "[|まい]", "[毎|ま|い]", "パン[毎朝|まいあさ", "［食｜た］"]) {
    assert.throws(() => parseRuby(bad), { name: "RubySyntaxError" }, bad);
  }
});

test("reading alignment follows okurigana and hides ruby on request", () => {
  assert.deepEqual(alignReading("食べます", "たべます"), [
    { text: "食", ruby: "た" },
    { text: "べます", ruby: null },
  ]);
  assert.equal(alignReading("食べます", "たべろ"), null);
  assert.deepEqual(alignReading("お茶", "おちゃ")[1], { text: "茶", ruby: "ちゃ" });
  const hidden = hideRuby(parseRuby("[毎朝|まいあさ]パンを[食|た]べます。").segments, (s) => s.text.includes("食"));
  assert.equal(hidden[0].ruby, "まいあさ");
  assert.equal(hidden[2].ruby, null);
  assert.deepEqual(splitReadingNotation("た(べる)"), { kanjiPart: "た", okurigana: "べる" });
});

test("sample content passes; its warnings are the placeholders (conversations, cat names, reward, story script), the unreachable default reward, the missing pin, the closing panel's missing transcript and one sentence ahead of its region", () => {
  const { errors, warnings, notes } = validateContent(loadSampleContent());
  assert.deepEqual(errors, []);
  assert.deepEqual(notes, []);
  assert.deepEqual(codes(warnings).filter((c) => c !== "PLACEHOLDER_TEXT").sort(), [
    "PIN_MISSING",
    "PLACEHOLDER_CONVERSATION",
    "PLACEHOLDER_CONVERSATION",
    "PLACEHOLDER_CONVERSATION",
    "PLACEHOLDER_CONVERSATION",
    "REWARD_UNREACHABLE", // the default milestone B01–B05 is not in the sample, which is B06 only
    "SCENE_DRAWN_TEXT_MISSING", // the closing scene's panel is not drawn yet, so nobody can say what text is on it (D-125)
    "SENTENCE_AHEAD_OF_REGION",
  ]);
  // «BELUM DIISI: …» left for the team: cat names (D-121), the reward (D-123), the story script (D-124).
  const placeholders = warnings.filter((w) => w.code === "PLACEHOLDER_TEXT").map((w) => w.path);
  assert.deepEqual(placeholders.filter((p) => !/\.cat\.name$|^rewards\[0\]\.(title|text)$|^scenes\[/.test(p)), [], "no other placeholder");
  assert.equal(placeholders.filter((p) => p.endsWith(".cat.name")).length, 2);
  assert.equal(placeholders.filter((p) => p.startsWith("rewards")).length, 2);
  assert.ok(placeholders.filter((p) => p.startsWith("scenes")).length >= 10, "the draft script of the two scenes");
  assert.equal(warnings[0].code, "PLACEHOLDER_CONVERSATION", "placeholder warnings are listed first");
});

test("material is limited to the chapters of the worlds (1–50) and kotoba belong to their region's chapter", () => {
  const data = sample();
  data.regions[0].chapter = 51;
  let { errors } = validateContent(data);
  assert.ok(errors.some((e) => e.code === "CHAPTER_OUT_OF_SCOPE" && e.prominent));
  assert.match(errors.find((e) => e.code === "CHAPTER_OUT_OF_SCOPE").message, /Dunia 1 = Shokyu I bab 1–25, Dunia 2 = Shokyu II bab 26–50/);
  // Chapter 13 was outside D-58's bab 1–12; it now belongs to Dunia 1 (D-117).
  const thirteen = sample();
  thirteen.regions[0].chapter = 13;
  thirteen.kotoba.forEach((k) => (k.chapter = 13));
  assert.ok(!codes(validateContent(thirteen).errors).includes("CHAPTER_OUT_OF_SCOPE"));

  const moved = sample();
  moved.kotoba[0].chapter = 5; // 食べます taught in another chapter than its region B06
  ({ errors } = validateContent(moved));
  assert.ok(codes(errors).includes("KOTOBA_CHAPTER_MISMATCH"));

  const outside = sample();
  outside.kotoba.push({ ...outside.kotoba[0], id: "shokuji", word: "食事", ruby: "[食|しょく][事|じ]", reading: "しょくじ", readingType: "onyomi", chapter: 0 });
  ({ errors } = validateContent(outside));
  assert.ok(errors.some((e) => e.code === "CHAPTER_OUT_OF_SCOPE" && e.path === "kotoba[2].chapter"));

  const later = sample();
  later.kotoba.push({ ...later.kotoba[0], id: "shokudou", word: "食堂", ruby: "[食|しょく][堂|どう]", reading: "しょくどう", readingType: "onyomi", chapter: 3 });
  const result = validateContent(later);
  assert.deepEqual(result.errors, []);
  assert.ok(codes(result.warnings).includes("KOTOBA_WITHOUT_REGION"), "a kotoba whose region does not exist yet is shown nowhere");

  ({ errors } = validateContent(loadV1Archive()));
  assert.equal(errors.length, 1);
  assert.equal(errors[0].code, "UNSUPPORTED_SCHEMA");
  assert.match(errors[0].message, /struktur lama/);
});

test("sentenceChapter is required and warns when later than the region", () => {
  const data = sample();
  const nomu = questOf(data, "Q-nomimasu");
  delete nomu.intro.sentenceChapter;
  nomu.tests[0].sentenceChapter = 9;
  const { errors, warnings } = validateContent(data);
  assert.ok(codes(errors).includes("MISSING_SENTENCE_CHAPTER"));
  const ahead = warnings.filter((w) => w.code === "SENTENCE_AHEAD_OF_REGION" && w.path.includes("quests[1]"));
  assert.equal(ahead.length, 1);
  assert.match(ahead[0].message, /bab 9.*bab 6/);

  nomu.intro.sentenceChapter = null;
  nomu.tests[0].sentenceChapter = 6;
  const again = validateContent(data);
  assert.ok(codes(again.warnings).includes("SENTENCE_OUTSIDE_BOOK"));
});

test("validator catches kanji, kotoba and quest mistakes", () => {
  const data = sample();
  const [shoku, nomu] = data.kanji;
  nomu.bushuOptions = ["食", "欠", "氵", "口"]; // answer 飠 missing, its variant 食 as distractor
  shoku.strokeCount = 0;
  data.kotoba[0].ruby = "[食|く]べます"; // spells くべます, reading is たべます
  data.kotoba[1].ruby = "飲みます"; // kanji without furigana
  const tabe = questOf(data, "Q-tabemasu");
  tabe.id = "REV-1";
  tabe.targetKanji = ["食", "堂"];
  tabe.tests[0].lines[0].distractors = ["飲みます"];
  tabe.intro.lines[0].ja = "[毎朝|まいあさパンを[食|た]べます。";
  const { errors } = validateContent(data);
  for (const code of [
    "ANSWER_NOT_IN_OPTIONS", "VARIANT_AS_DISTRACTOR", "INVALID_STROKE_COUNT", "RUBY_READING_MISMATCH", "KANJI_WITHOUT_RUBY",
    "RESERVED_QUEST_ID", "MISSING_KANJI_ENTRY", "TARGET_NOT_IN_WORD", "BLANK_DISTRACTORS_TOO_FEW", "RUBY_SYNTAX",
  ]) {
    assert.ok(codes(errors).includes(code), `missing ${code}`);
  }
});

test("conversation rules: two speakers with the player, highlight in intro, one unleaked blank in a new context", () => {
  const data = sample();
  const tabe = questOf(data, "Q-tabemasu");
  tabe.intro = conversation("C-a", [
    { speaker: "tokoh-a", ja: "[何|なに]を[食|た]べますか。", translation: "Mau makan apa?", highlight: "食べます" },
    { speaker: "player", ja: "パンを[食|た]べます。", translation: "Saya makan roti.", highlight: "食べます" },
  ]);
  tabe.tests = [
    conversation("C-b", [
      { speaker: "tokoh-a", ja: "[朝|あさ]ごはんは？", translation: "Sarapannya?" },
      { speaker: "player", ja: "りんごを[食|た]べます。", translation: "Saya makan apel.", blank: "食べます", distractors: ["飲みます", "読みます", "書きます"] },
    ]),
  ];
  assert.deepEqual(validateContent(data).errors, [], "a well-formed pair of conversations passes");

  const broken = clone(data);
  const q = questOf(broken, "Q-tabemasu");
  q.intro.lines[1].speaker = "taro"; // no player any more
  q.intro.lines.forEach((l) => delete l.highlight);
  q.tests[0].lines[0].ja = "りんごを[食|た]べますか。"; // the answer shows in the other line
  q.tests.push(
    conversation("C-c", [
      { speaker: "tokoh-a", ja: "パンを[食|た]べます。", translation: "x", highlight: "食べます" },
      { speaker: "player", ja: "パンを[食|た]べます。", translation: "x", blank: "食べます", distractors: ["飲みます", "読みます", "書きます"] },
    ])
  );
  const { errors } = validateContent(broken);
  for (const code of ["CONVERSATION_SPEAKERS", "NO_HIGHLIGHT", "BLANK_LEAKED", "HIGHLIGHT_IN_TEST", "TEST_REPEATS_INTRO"]) {
    assert.ok(codes(errors).includes(code), `missing ${code}`);
  }

  const twoBlanks = clone(data);
  questOf(twoBlanks, "Q-tabemasu").tests[0].lines[0].blank = "朝";
  assert.ok(codes(validateContent(twoBlanks).errors).includes("BLANK_COUNT"));
});

test("target kanji need their own furigana, and their reading is checked against the kanji table", () => {
  const data = sample();
  data.kanji[0].readings.kunyomi = ["く(う)"]; // た no longer listed
  let { errors, warnings } = validateContent(data);
  assert.deepEqual(errors, []);
  assert.ok(codes(warnings).includes("READING_NOT_LISTED"));

  data.kanji[0].readings.onyomi = ["ショク", "タ"];
  ({ warnings } = validateContent(data));
  assert.ok(codes(warnings).includes("READING_TYPE_MISMATCH"));

  const grouped = sample();
  grouped.kotoba[0] = { ...grouped.kotoba[0], ruby: "[食べ|たべ]ます" }; // okurigana inside the bracket still splits
  assert.deepEqual(validateContent(grouped).errors, []);
  grouped.kanji.push({ ...clone(grouped.kanji[1]), char: "堂", bushuOptions: ["飠", "欠", "氵", "口"] });
  grouped.kotoba.push({ ...grouped.kotoba[1], id: "x", word: "食堂", ruby: "[食堂|しょくどう]", reading: "しょくどう", readingType: "onyomi" });
  questOf(grouped, "Q-nomimasu").kotoba = "x";
  questOf(grouped, "Q-nomimasu").targetKanji = ["堂"];
  ({ errors } = validateContent(grouped));
  assert.ok(codes(errors).includes("TARGET_KANJI_NOT_SEPARATED"));
});

test("the model derives kanji readings, kanji→kotoba links and stable ids", () => {
  assert.deepEqual(kotobaParts("[食|しょく][堂|どう]"), [
    { text: "食", reading: "しょく", kanji: ["食"] },
    { text: "堂", reading: "どう", kanji: ["堂"] },
  ]);
  assert.deepEqual(kotobaParts("[今日|きょう]"), [{ text: "今日", reading: "きょう", kanji: ["今", "日"] }]);
  assert.equal(kanjiReadingIn({ ruby: "[食べ|たべ]ます" }, "食"), "た");

  const model = buildModel(loadSampleContent());
  assert.deepEqual(model.regions.map((r) => r.id), ["B06"]);
  assert.deepEqual(model.kotobaByKanji.get("食").map((k) => k.id), ["tabemasu"]);
  assert.equal(model.quests.get("Q-nomimasu").region.chapter, 6);
  assert.equal(model.conversations.get("C-tabemasu-uji-1").role, "test");
  assert.equal(regionId(6), "B06");
  assert.equal(reviewId(12), "REV-B12");
  assert.equal(itemId.shape("食"), "K:食:shape");
  assert.equal(itemId.test("C-tabemasu-uji-1"), "C:C-tabemasu-uji-1:test");
});

test("reading options put cross-type distractors first and skip kotoba sharing a kanji; blank options are manual only", () => {
  const data = loadSampleContent();
  const taberu = data.kotoba.find((k) => k.id === "tabemasu");
  const random = seededRandom();
  for (let i = 0; i < 20; i++) {
    const options = readingOptions(data.kotoba, taberu, random);
    assert.equal(options.length, 4);
    assert.equal(options.filter((o) => o.type === OPTION_TYPE.ANSWER).length, 1);
    assert.ok(options.some((o) => o.type === OPTION_TYPE.MANUAL_CROSS), "cross-type distractor always shown");
  }
  const shokudou = { word: "食堂", reading: "しょくどう", readingType: "kunyomi" };
  const { auto } = readingDistractorPool([...data.kotoba, shokudou], taberu);
  assert.deepEqual(auto, ["のみます"], "食堂 shares 食, so it is not an automatic distractor");

  const line = questOf(data, "Q-tabemasu").tests[0].lines[0];
  const options = blankOptions(line, random);
  assert.deepEqual(options.map((o) => o.value).sort(), [line.blank, ...line.distractors].sort());
});

test("placeholders: names are always errors; unfinished work is a warning in a draft and an error in a release", () => {
  const data = sample();
  const nomu = questOf(data, "Q-nomimasu");
  nomu.intro.lines[0].ja = "«NAMA-TOKOH-1»さんはお[茶|ちゃ]を[飲|の]みます。";
  nomu.intro.lines[0].translation = "«BELUM DIISI: terjemahan»";
  nomu.intro.sentenceChapter = "?";
  nomu.tests = [];
  let result = validateContent(data);
  assert.deepEqual(codes(result.errors), ["NAME_PLACEHOLDER"]);
  for (const code of ["PLACEHOLDER_TEXT", "SENTENCE_CHAPTER_UNKNOWN", "NO_TESTS"]) assert.ok(codes(result.warnings).includes(code), code);

  data.contentRevision = "rev-1";
  result = validateContent(data);
  for (const code of ["NAME_PLACEHOLDER", "PLACEHOLDER_TEXT", "SENTENCE_CHAPTER_UNKNOWN", "NO_TESTS"]) assert.ok(codes(result.errors).includes(code), `${code} in a release`);
});

test("index-only kotoba may be outside the book; a kanji that is its own bushu needs no options", async () => {
  const data = sample();
  data.kanji[0].bushuOptions = []; // 食 is its own bushu (D-90)
  data.kotoba.push({ ...data.kotoba[0], id: "shokuji", word: "食事", ruby: "[食|しょく][事|じ]", reading: "しょくじ", readingType: "onyomi", pos: "noun", chapter: null, readingDistractors: [], readingDistractorsCross: [] });
  const { errors, warnings } = validateContent(data);
  assert.deepEqual(errors, []);
  assert.ok(!codes(warnings).includes("KOTOBA_WITHOUT_REGION"));

  const { kotobaWithKanji } = await import(jsModule("model.js"));
  const R = await import(jsModule("reveal.js"));
  const S = await import(jsModule("state.js"));
  const model = buildModel(data);
  assert.deepEqual(kotobaWithKanji(model, "食", 6).map((k) => k.id), ["tabemasu"], "outside-book kotoba are not region material");
  const progress = S.createProgress();
  const shokuji = model.kotoba.get("shokuji");
  progress.quests["Q-tabemasu"] = { status: "in_progress", introDone: true };
  assert.equal(R.kotobaVisible(model, progress, shokuji), false, "visible only after every quest drilling 食 is passed (D-93)");
  progress.quests["Q-tabemasu"] = { status: "passed", introDone: true };
  progress.quests["Q-nomimasu"] = { status: "passed", introDone: true };
  assert.equal(R.kotobaVisible(model, progress, shokuji), true);
});

test("a reading distractor that is a reading of the word's kanji gets a warning (D-98)", () => {
  const data = sample();
  data.kotoba[0].readingDistractors = ["くべます", "く", "しょく"]; // く and しょく are readings of 食
  const { warnings } = validateContent(data);
  const hits = warnings.filter((w) => w.code === "DISTRACTOR_IS_KANJI_READING").map((w) => w.path);
  assert.deepEqual(hits, ["kotoba[0].readingDistractors[1]", "kotoba[0].readingDistractors[2]"]);
});
