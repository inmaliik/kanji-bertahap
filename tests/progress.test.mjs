// Game rules: quest session, resuming, global kanji mastery, furigana, lock
// state, review sampling, consent. The Japanese strings are test fixtures.

import { test } from "node:test";
import assert from "node:assert/strict";
import { clone, jsModule, loadSampleContent, seededRandom } from "./helpers.mjs";

const { buildModel, buildQuestItems } = await import(jsModule("model.js"));
const { createSession, PHASE, STAGE_ORDER } = await import(jsModule("session.js"));
const { visibleSegments, containsAny } = await import(jsModule("furigana.js"));
const { parseRuby } = await import(jsModule("ruby.js"));
const S = await import(jsModule("state.js"));

const model = buildModel(loadSampleContent());
const QUEST = model.quests.get("Q-tabemasu");
const questItems = buildQuestItems(model, QUEST);
const freshEntry = () => ({ status: "in_progress", attempts: 1, introDone: true, learningDone: false, productionSubmitted: false });

/** Play a session; `decide(step)` returns whether the answer is correct. */
function play({ items = questItems, streaks = {}, entry = freshEntry(), decide = () => true, options = {}, stopAfter = Infinity }) {
  const session = createSession({ items, streaks, entry, random: seededRandom(), ...options });
  const trace = [];
  for (let guard = 0; guard < 500; guard++) {
    if (trace.length >= stopAfter) return { trace, entry, streaks };
    const step = session.next();
    if (step.kind === "done") return { trace, entry, streaks, done: step };
    if (step.kind === "production") {
      trace.push({ kind: "production" });
      session.submitProduction();
      continue;
    }
    const correct = decide(step, trace);
    const result = session.answer(correct);
    trace.push({ kind: "item", id: step.item.id, stage: step.item.stage, phase: step.phase, spacer: step.spacer, correct, streak: result.streak });
  }
  throw new Error("session did not finish");
}

test("quest items: shape per target kanji, one reading, one test per test conversation", () => {
  assert.deepEqual(
    questItems.map((i) => i.id),
    ["K:食:shape", "W:tabemasu:reading", "C:C-tabemasu-uji-1:test"]
  );
  const testItem = questItems[2];
  assert.equal(testItem.plain.slice(testItem.blankRange.start, testItem.blankRange.end), "食べます");
});

test("all correct: practice and test in stage order, production, consolidation, passed", () => {
  const { trace, done, entry } = play({});
  const learning = trace.filter((t) => t.phase === PHASE.LEARNING);
  assert.deepEqual(learning.map((t) => t.stage), STAGE_ORDER, "shape → reading → test");
  assert.equal(trace[learning.length].kind, "production");
  assert.ok(trace.slice(learning.length + 1).every((t) => t.phase === PHASE.CONSOLIDATION));
  assert.equal(done.passed, true);
  assert.equal(entry.status, "passed");
});

test("consolidation never repeats an item back to back, with a spacer when needed", () => {
  let target = null;
  let misses = 0;
  const { trace, done } = play({
    decide: (step) => {
      if (step.phase === PHASE.LEARNING) return true;
      target ??= step.item.id;
      if (step.item.id === target && misses < 3) return (misses++, false);
      return true;
    },
  });
  const consolidation = trace.filter((t) => t.kind === "item" && t.phase === PHASE.CONSOLIDATION);
  consolidation.slice(1).forEach((t, i) => assert.notEqual(t.id, consolidation[i].id));
  assert.ok(consolidation.some((t) => t.spacer), "a spacer was inserted");
  assert.equal(done.passed, true);
});

test("a wrong answer in the learning pass returns within the same stage", () => {
  let missed = false;
  const { trace } = play({ decide: (step) => (step.item.stage === "reading" && !missed ? ((missed = true), false) : true) });
  const learning = trace.filter((t) => t.phase === PHASE.LEARNING).map((t) => t.stage);
  assert.deepEqual(learning, ["shape", "reading", "reading", "test"]);
});

test("leaving mid-quest keeps progress, and reopening continues where the player left off", () => {
  // Left after the first practice item.
  const first = play({ stopAfter: 1 });
  const stored = clone({ streaks: first.streaks, entry: first.entry });
  let again = play({ ...stored, stopAfter: 1 });
  assert.equal(again.trace[0].id, "W:tabemasu:reading", "the answered item is not asked again");

  // Left during consolidation.
  const mid = play({ stopAfter: 5 });
  assert.equal(mid.entry.learningDone, true);
  assert.equal(mid.entry.productionSubmitted, true);
  again = play(clone({ streaks: mid.streaks, entry: mid.entry }));
  assert.ok(again.trace.every((t) => t.phase === PHASE.CONSOLIDATION), "no second learning pass or production");
  assert.equal(again.done.passed, true);
});

test("a kanji shape mastered in one quest is not asked again in another quest", () => {
  const content = clone(loadSampleContent());
  content.kotoba.push({ ...content.kotoba[0], id: "shokudou", word: "食堂", ruby: "[食|しょく][堂|どう]", reading: "しょくどう", readingType: "onyomi" });
  const quest = clone(content.regions[0].quests[0]);
  Object.assign(quest, { id: "Q-shokudou", kotoba: "shokudou" });
  quest.tests[0].id = "C-other";
  content.regions[0].quests.push(quest);
  const m = buildModel(content);

  const streaks = {};
  play({ items: buildQuestItems(m, m.quests.get("Q-tabemasu")), streaks });
  assert.equal(streaks["K:食:shape"], S.STREAK_TO_MASTER);

  const { trace, done } = play({ items: buildQuestItems(m, m.quests.get("Q-shokudou")), streaks });
  assert.ok(!trace.some((t) => t.id === "K:食:shape"), "shape of 食 is skipped");
  assert.equal(done.total, 3, "it still counts as a mastered item of the quest");
});

test("furigana: the setting applies, the intro may show target readings, and anti-leak always wins", () => {
  const { segments } = parseRuby("[毎朝|まいあさ]パンを[食|た]べます。");
  const rubies = (segs) => segs.filter((s) => s.ruby).map((s) => s.text);
  const leaks = containsAny(["食"]);
  const { ALWAYS, AFTER, NEVER } = S.FURIGANA_MODE;
  assert.deepEqual(rubies(visibleSegments(segments, { mode: ALWAYS, leaks })), ["毎朝"], "D-29 wins over 'always'");
  assert.deepEqual(rubies(visibleSegments(segments, { mode: ALWAYS })), ["毎朝", "食"]);
  assert.deepEqual(rubies(visibleSegments(segments, { mode: AFTER, answered: false })), []);
  assert.deepEqual(rubies(visibleSegments(segments, { mode: AFTER, answered: true, leaks })), ["毎朝"]);
  assert.deepEqual(rubies(visibleSegments(segments, { mode: NEVER, answered: true })), []);
  assert.deepEqual(rubies(visibleSegments(segments, { mode: AFTER, intro: true })), ["毎朝", "食"], "intro: teaching moment, 'after' acts as 'always'");
  assert.deepEqual(rubies(visibleSegments(segments, { mode: ALWAYS, intro: true, leaks })), ["毎朝"], "readings pending elsewhere stay hidden in the intro");
  assert.deepEqual(rubies(visibleSegments(segments, { mode: NEVER, intro: true })), [], "'never' holds in the intro too");

  const progress = S.createProgress();
  assert.equal(progress.settings.furiganaMode, ALWAYS, "default is always");
  assert.equal(S.PROGRESS_KEY, "kanjiGame.progress.v2", "never mixes with level progress of the main branch");
});

test("lock state is derived and survives a node inserted during revision", () => {
  const stored = {};
  const status = (id) => stored[id];
  let nodes = ["B01", "B02", "B03"].map((id) => ({ id }));
  const statuses = () => Object.fromEntries(S.computeStatuses(nodes, status));
  assert.deepEqual(statuses(), { B01: "available", B02: "locked", B03: "locked" });
  stored.B01 = "passed";
  stored.B03 = "in_progress";
  nodes = ["B01", "BX", "B02", "B03"].map((id) => ({ id }));
  assert.equal(statuses().BX, "available");
  assert.equal(statuses().B02, "locked");
  assert.equal(statuses().B03, "in_progress", "a started node never locks again");
});

test("review sampling is balanced across quests and review sessions pass without production", () => {
  const pool = [...model.quests.values()].map((q) => buildQuestItems(model, q));
  const random = seededRandom(3);
  const sample = S.sampleReviewItems(pool, random, 4);
  assert.equal(new Set(sample.map((it) => it.id)).size, 4);
  for (const quest of model.quests.keys()) assert.equal(sample.filter((it) => it.questId === quest).length, 2);

  let n = 0;
  const { trace, done } = play({ items: sample, decide: () => n++ >= 2, options: { hasProduction: false, skipLearning: true } });
  assert.ok(trace.every((t) => t.kind === "item" && t.phase === PHASE.CONSOLIDATION));
  assert.equal(done.passed, true);
});

test("createId works without crypto.randomUUID", () => {
  const original = globalThis.crypto.randomUUID;
  globalThis.crypto.randomUUID = undefined;
  try {
    assert.match(S.createId(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  } finally {
    globalThis.crypto.randomUUID = original;
  }
});

test("recording requires agreeing to the current consent text version", async () => {
  const { validateConsentText } = await import(jsModule("consent.js"));
  const { readFileSync } = await import("node:fs");
  const repoText = JSON.parse(readFileSync(new URL("../data/consent.json", import.meta.url), "utf8"));
  assert.deepEqual(validateConsentText(repoText), [], "data/consent.json is valid");
  assert.ok(validateConsentText({ version: "", title: "x", sections: [] }).length >= 2);

  const progress = S.createProgress();
  assert.equal(S.consentStatus(progress, "v1"), "undecided");
  assert.equal(S.isRecordingAllowed(progress, "v1"), false);
  S.setConsent(progress, S.CONSENT_CHOICE.DECLINED, "v1");
  assert.equal(S.isRecordingAllowed(progress, "v1"), false);
  S.setConsent(progress, S.CONSENT_CHOICE.AGREED, "v1");
  assert.equal(S.isRecordingAllowed(progress, "v1"), true);
  assert.equal(S.consentStatus(progress, "v2"), "undecided", "a new text version asks again");
  assert.equal(S.isRecordingAllowed(progress, null), false, "no recording when the text failed to load");
});
