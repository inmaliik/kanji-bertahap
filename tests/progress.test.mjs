// Game rules: level session, unlocking, review sampling.

import { test } from "node:test";
import assert from "node:assert/strict";
import { clone, jsModule, loadSampleContent, seededRandom } from "./helpers.mjs";

const { buildLevelItems } = await import(jsModule("content.js"));
const { createLevelSession, PHASE, STAGE_ORDER } = await import(jsModule("session.js"));
const S = await import(jsModule("state.js"));

const content = loadSampleContent();
const L01 = content.levels[0];
const fresh = () => ({ status: "in_progress", itemStreaks: {}, attempts: 1, learningDone: false, productionSubmitted: false });

/** Play a session; `decide(step)` returns whether the answer is correct. */
function play({ items = buildLevelItems(L01), entry = fresh(), decide = () => true, options = {}, stopAfter = Infinity }) {
  const session = createLevelSession({ items, entry, random: seededRandom(), ...options });
  const trace = [];
  for (let guard = 0; guard < 500; guard++) {
    if (trace.length >= stopAfter) return { trace, entry };
    const step = session.next();
    if (step.kind === "done") return { trace, entry, done: step };
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

const itemCount = STAGE_ORDER.reduce((n, s) => n + buildLevelItems(L01)[s].length, 0);

test("all correct: learning pass in stage order, production, consolidation, passed", () => {
  const { trace, done, entry } = play({});
  const learning = trace.filter((t) => t.phase === PHASE.LEARNING);
  assert.equal(learning.length, itemCount);
  const stageIndex = learning.map((t) => STAGE_ORDER.indexOf(t.stage));
  assert.deepEqual(stageIndex, [...stageIndex].sort((a, b) => a - b), "learning follows stage order");
  assert.equal(trace[itemCount].kind, "production");
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
  const { trace } = play({ decide: (step) => (step.item.stage === "sentence" && !missed ? ((missed = true), false) : true) });
  const learning = trace.filter((t) => t.phase === PHASE.LEARNING);
  const firstSentence = learning.findIndex((t) => t.stage === "sentence");
  assert.ok(learning.slice(firstSentence).every((t) => t.stage === "sentence"));
});

test("a session resumes from stored progress", () => {
  const { entry } = play({ stopAfter: itemCount + 2 });
  const stored = clone(entry);
  assert.equal(stored.learningDone, true);
  assert.equal(stored.productionSubmitted, true);
  const { done } = play({ entry: stored });
  assert.equal(done.passed, true);
});

test("lock state is derived and survives a level inserted during revision", () => {
  const progress = S.createProgress();
  const lv = (id) => ({ id });
  let nodes = S.buildProgression([lv("L01"), lv("L02"), lv("L03"), lv("L04")]);
  assert.deepEqual(nodes.map((n) => n.id), ["L01", "L02", "L03", "R01", "L04"]);
  const statuses = () => Object.fromEntries(S.computeStatuses(nodes, progress));
  assert.deepEqual(statuses(), { L01: "available", L02: "locked", L03: "locked", R01: "locked", L04: "locked" });
  for (const id of ["L01", "L02", "L03", "R01"]) progress.levels[id] = { status: "passed" };
  progress.levels.L04 = { status: "in_progress" };
  nodes = S.buildProgression([lv("L01"), lv("LX"), lv("L02"), lv("L03"), lv("L04")]);
  assert.equal(statuses().LX, "available");
  assert.equal(statuses().L04, "in_progress");
});

test("review sampling is balanced across levels and review sessions pass without production", () => {
  const pool = content.levels.map((level) => STAGE_ORDER.flatMap((s) => buildLevelItems(level)[s]));
  const random = seededRandom(3);
  for (let i = 0; i < 30; i++) {
    const sample = S.sampleReviewItems(pool, random);
    assert.equal(sample.length, S.REVIEW_ITEM_COUNT);
    assert.equal(new Set(sample.map((it) => it.id)).size, sample.length);
    for (const [index, level] of content.levels.entries()) {
      const taken = sample.filter((it) => it.levelId === level.id).length;
      assert.ok(taken >= Math.min(3, pool[index].length), `level ${level.id} under-represented`);
    }
  }
  const sample = S.sampleReviewItems(pool, random);
  const items = Object.fromEntries(STAGE_ORDER.map((s) => [s, sample.filter((it) => it.stage === s)]));
  let n = 0;
  const { trace, done } = play({ items, decide: () => n++ >= 4, options: { hasProduction: false, skipLearning: true } });
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
  assert.equal(S.createProgress().consent, null, "a reset clears consent");
});
