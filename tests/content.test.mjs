// Content rules: ruby parsing, validation, chapters, distractors.

import { test } from "node:test";
import assert from "node:assert/strict";
import { clone, jsModule, loadSampleContent, seededRandom } from "./helpers.mjs";

const { parseRuby, alignReading, hideRuby } = await import(jsModule("ruby.js"));
const { validateContent } = await import(jsModule("validate.js"));
const { kotobaChapters, levelChapter, chaptersLabel, chaptersAbove } = await import(jsModule("chapters.js"));
const { readingOptions, sentenceOptions, OPTION_TYPE } = await import(jsModule("distractors.js"));
const { splitReadingNotation } = await import(jsModule("jp-text.js"));

const codes = (issues) => issues.map((i) => i.code);

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

test("sample content passes; its only warnings are sentences ahead of their kotoba", () => {
  const { errors, warnings, notes } = validateContent(loadSampleContent());
  assert.deepEqual(errors, []);
  assert.ok(warnings.length > 0);
  assert.deepEqual([...new Set(codes(warnings))], ["SENTENCE_AHEAD_OF_KOTOBA"]);
  assert.deepEqual(codes(notes), ["CHAPTER_SEQUENCE"]);
});

test("sentenceChapter is required and warns when later than the kotoba", () => {
  const data = clone(loadSampleContent());
  const kotoba = data.levels[1].kotoba[0]; // 飲みます, bab 6
  delete kotoba.examples[0].sentenceChapter;
  kotoba.examples[1].sentenceChapter = 9;
  const { errors, warnings } = validateContent(data);
  assert.ok(codes(errors).includes("MISSING_SENTENCE_CHAPTER"));
  const ahead = warnings.filter((w) => w.code === "SENTENCE_AHEAD_OF_KOTOBA" && w.path.startsWith("levels[1]"));
  assert.equal(ahead.length, 1);
  assert.match(ahead[0].message, /bab 9.*bab 6/);

  kotoba.examples[0].sentenceChapter = null;
  kotoba.examples[1].sentenceChapter = 6;
  const again = validateContent(data);
  assert.ok(codes(again.warnings).includes("SENTENCE_OUTSIDE_BOOK"));
  assert.ok(!again.warnings.some((w) => w.code === "SENTENCE_AHEAD_OF_KOTOBA" && w.path.startsWith("levels[1]")));
});

test("validator catches content mistakes", () => {
  const data = clone(loadSampleContent());
  const [l1, l2, l3] = data.levels;
  l1.kotoba[0].examples[0].ja = "[毎朝|まいあさパンを[食|た]べます。";
  l1.kotoba[0].reading = "たべろ";
  l1.bushuOptions = ["飠", "人", "米", "皿"];
  l1.kotoba[0].examples[1].distractors = ["飲みます"];
  l2.jlptLevel = "N4"; // N4 before an N5 level
  l3.id = "all";
  l3.chapter = 8; // level chapter is ignored now
  const { errors, warnings } = validateContent(data);
  for (const code of ["RUBY_SYNTAX", "READING_MISMATCH", "ANSWER_NOT_IN_OPTIONS", "VARIANT_AS_DISTRACTOR", "SENTENCE_DISTRACTORS_TOO_FEW", "LEVEL_ORDER", "RESERVED_LEVEL_ID"]) {
    assert.ok(codes(errors).includes(code), `missing ${code}`);
  }
  assert.equal(errors[0].code, "LEVEL_ORDER", "order errors come first");
  assert.ok(codes(warnings).includes("LEVEL_CHAPTER_IGNORED"));
});

test("chapter order never blocks content", () => {
  const data = clone(loadSampleContent());
  data.levels.reverse(); // chapters now fall: still no error or warning
  const { errors, warnings, notes } = validateContent(data);
  assert.deepEqual(errors, []);
  assert.ok(warnings.every((w) => w.code === "SENTENCE_AHEAD_OF_KOTOBA"), "no order warnings");
  assert.match(notes[0].message, /Bab turun/);
});

test("level chapters are derived from kotoba", () => {
  const level = { kotoba: [{ chapter: 13 }, { chapter: 3 }, { chapter: 6 }, { chapter: 3 }, { chapter: null }] };
  assert.deepEqual(kotobaChapters(level), [3, 6, 13]);
  assert.equal(levelChapter(level), 3);
  assert.equal(chaptersLabel(level), "Minna bab 3, 6, 13 · di luar buku");
  assert.deepEqual(chaptersAbove(level, 5), [6, 13]);
  assert.equal(levelChapter({ kotoba: [{ chapter: null }] }), null);
});

test("reading options put cross-type distractors first; sentence options are manual only", () => {
  const data = loadSampleContent();
  const level = data.levels[0];
  const taberu = level.kotoba.find((k) => k.word === "食べます");
  const random = seededRandom();
  for (let i = 0; i < 20; i++) {
    const options = readingOptions(data.levels, level.id, taberu, random);
    assert.equal(options.length, 4);
    assert.equal(options.filter((o) => o.type === OPTION_TYPE.ANSWER).length, 1);
    assert.ok(options.some((o) => o.type === OPTION_TYPE.MANUAL_CROSS), "cross-type distractor always shown");
  }
  const example = taberu.examples[0];
  const options = sentenceOptions(example, random);
  assert.deepEqual(options.map((o) => o.value).sort(), [example.blank, ...example.distractors].sort());
});
