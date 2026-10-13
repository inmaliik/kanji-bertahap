// Rewards (D-123): milestones from the content, dated and kept once earned,
// redeemed once, and absent in research mode.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, clone, jsModule, loadSampleContent } from "./helpers.mjs";

const R = await import(jsModule("rewards.js"));
const S = await import(jsModule("state.js"));
const { buildModel, buildQuestItems } = await import(jsModule("model.js"));
const { validateContent } = await import(jsModule("validate.js"));
const { convertCsvFilesToContent } = await import(jsModule("csv-content.js"));
const { SESSION_MODE } = await import(jsModule("session-mode.js"));

const codes = (issues) => issues.map((i) => i.code);
const passed = { status: "passed", introDone: true, learningDone: true, productionSubmitted: true };

/** Sample content whose rewards need B06 (reachable) and world 1 (not reachable: 1 of its 25 chapters). */
function content(rewards = [{ id: "H-B06", title: "Diskon contoh", text: "Potongan harga contoh", requires: { regions: ["B06"], world: null } }]) {
  return Object.assign(clone(loadSampleContent()), { rewards });
}

/** A player who finished every mission of B06, and its review when `review` is true. */
function player(model, { review }) {
  const progress = S.createProgress();
  for (const quest of model.quests.values()) {
    for (const item of buildQuestItems(model, quest)) progress.items[item.id] = 2;
    progress.quests[quest.id] = { ...passed };
  }
  if (review) progress.quests["REV-B06"] = { ...passed };
  return progress;
}

test("research mode never has rewards: none earned even when the milestone is met (D-123)", () => {
  const data = content();
  const model = buildModel(data);
  const progress = player(model, { review: true });
  assert.equal(R.rewardsAvailable(SESSION_MODE.RESEARCH), false);
  assert.equal(R.rewardsAvailable(SESSION_MODE.GENERAL), true);
  assert.equal(R.rewardsAvailable(SESSION_MODE.EXHIBITION), true, "exhibition mode keeps rewards");
  assert.deepEqual(R.updateRewards(model, data.rewards, progress, SESSION_MODE.RESEARCH), []);
  assert.deepEqual(progress.rewards, {}, "nothing stored, so nothing can show later");
  assert.equal(R.updateRewards(model, data.rewards, progress, SESSION_MODE.GENERAL).length, 1, "the same player in general mode earns it");
});

test("a reward marked as redeemed cannot be redeemed again", () => {
  const data = content();
  const model = buildModel(data);
  const progress = player(model, { review: true });
  assert.equal(R.redeemReward(progress, "H-B06"), false, "not earned yet: nothing to redeem");
  R.updateRewards(model, data.rewards, progress, SESSION_MODE.GENERAL, new Date("2026-10-14T09:00:00Z"));
  assert.equal(R.unredeemed(progress).length, 1);
  assert.equal(R.redeemReward(progress, "H-B06", new Date("2026-10-15T10:00:00Z")), true);
  assert.equal(R.redeemReward(progress, "H-B06", new Date("2026-10-16T10:00:00Z")), false, "the second time is refused");
  assert.equal(progress.rewards["H-B06"].redeemedAt, "2026-10-15T10:00:00.000Z", "the first date stays");
  assert.deepEqual(R.unredeemed(progress), []);
  assert.equal(R.updateRewards(model, data.rewards, progress, SESSION_MODE.GENERAL).length, 0, "a redeemed reward is not earned anew");
});

test("the milestone in the data decides when a reward is earned", () => {
  const data = content();
  const model = buildModel(data);
  const almost = player(model, { review: false });
  assert.deepEqual(R.rewardProgress(model, almost, data.rewards[0]), { met: false, done: 0, total: 1, reachable: true }, "missions done, review not yet");
  assert.deepEqual(R.updateRewards(model, data.rewards, almost, SESSION_MODE.GENERAL), []);
  const done = player(model, { review: true });
  const when = new Date("2026-10-14T09:00:00Z");
  assert.equal(R.updateRewards(model, data.rewards, done, SESSION_MODE.GENERAL, when).length, 1);
  assert.deepEqual(done.rewards["H-B06"], { title: "Diskon contoh", text: "Potongan harga contoh", achievedAt: "2026-10-14T09:00:00.000Z", redeemedAt: null });

  // Another milestone, same progress: the data, not the code, decides.
  const other = content([{ id: "H-B01-B05", title: "t", text: "x", requires: { regions: ["B01", "B02", "B03", "B04", "B05"], world: null } }]);
  const p = R.rewardProgress(buildModel(other), done, other.rewards[0]);
  assert.equal(p.met, false);
  assert.equal(p.reachable, false, "B01–B05 are not in the sample material");
  const world = content([{ id: "H-D1", title: "t", text: "x", requires: { regions: [], world: 1 } }]);
  assert.deepEqual(R.rewardProgress(buildModel(world), done, world.rewards[0]), { met: false, done: 0, total: 1, reachable: false }, "world 1 has 1 of its 25 chapters");
  assert.equal(R.milestoneText(other.rewards[0]), "selesaikan Bab 1–5");
  assert.equal(R.milestoneText(world.rewards[0]), "tamatkan Dunia 1");
});

test("an earned reward stays earned, with its texts, when the material changes later", () => {
  const data = content();
  const model = buildModel(data);
  const progress = player(model, { review: true });
  R.updateRewards(model, data.rewards, progress, SESSION_MODE.GENERAL);
  const changed = content([{ id: "H-B06", title: "Judul baru", text: "Teks baru", requires: { regions: ["B06", "B07"], world: null } }]);
  R.updateRewards(buildModel(changed), changed.rewards, progress, SESSION_MODE.GENERAL);
  assert.equal(progress.rewards["H-B06"].title, "Diskon contoh", "the reward as it was earned");
  assert.equal(R.unredeemed(progress).length, 1);
  assert.deepEqual(S.resetProgress().rewards, {}, "a reset forgets it (the settings warn first)");
});

test("the player code shown to the seller comes from the random player id", () => {
  const progress = S.createProgress();
  progress.playerId = "7f3a9c2e-0000-4000-8000-000000000000";
  assert.equal(R.playerCode(progress), "#7F3A");
});

test("the validator: a milestone is required, unreachable ones warn, texts follow D-79, drafts may hold placeholders", () => {
  const ok = validateContent(content());
  assert.deepEqual(ok.errors, []);

  const none = content([{ id: "H-x", title: "t", text: "x", requires: { regions: [], world: null } }]);
  assert.ok(codes(validateContent(none).errors).includes("INVALID_REWARD_REQUIRES"));

  const unreachable = validateContent(content([{ id: "H-x", title: "t", text: "x", requires: { regions: ["B01"], world: 1 } }]));
  assert.equal(codes(unreachable.warnings).filter((c) => c === "REWARD_UNREACHABLE").length, 2, "a missing region and an incomplete world");

  const leak = validateContent(content([{ id: "H-x", title: "Diskon 食べます", text: "x", requires: { regions: ["B06"], world: null } }]));
  assert.ok(codes(leak.errors).includes("REWARD_TEXT_LEAKS_KOTOBA"), "the card shows on the map before any mission");

  const twice = content([
    { id: "H-x", title: "t", text: "x", requires: { regions: ["B06"], world: null } },
    { id: "H-x", title: "t", text: "x", requires: { regions: ["B06"], world: null } },
  ]);
  assert.ok(codes(validateContent(twice).errors).includes("DUPLICATE_REWARD"));

  const draft = content([{ id: "H-x", title: "«BELUM DIISI: judul hadiah»", text: "«BELUM DIISI: teks»", requires: { regions: ["B06"], world: null } }]);
  assert.ok(codes(validateContent(draft).warnings).includes("PLACEHOLDER_TEXT"));
  draft.contentRevision = "rev-1";
  assert.ok(codes(validateContent(draft).errors).includes("PLACEHOLDER_TEXT"), "an error in a release");

  const without = clone(loadSampleContent());
  delete without.rewards;
  assert.deepEqual(validateContent(without).errors, [], "content without rewards is valid");
});

test("the hadiah tab is optional; with it, chapters become the regions of the milestone", () => {
  const read = (name) => ({ name, text: readFileSync(join(ROOT, "tools/templates", name), "utf8") });
  const five = ["wilayah.csv", "kanji.csv", "kotoba.csv", "quest.csv", "percakapan.csv"].map(read);
  const without = convertCsvFilesToContent(five, "draft-0");
  assert.equal(without.fatal, null, "older spreadsheets without the tab still convert");
  assert.equal("rewards" in without.content, false);
  const withTab = convertCsvFilesToContent([...five, read("hadiah.csv")], "draft-0");
  assert.deepEqual(withTab.content.rewards, [
    { id: "H-B01-B05", title: "«BELUM DIISI: judul hadiah»", text: "«BELUM DIISI: teks hadiah, misalnya besaran diskon kartu»", requires: { regions: ["B01", "B02", "B03", "B04", "B05"], world: null } },
  ]);
});
