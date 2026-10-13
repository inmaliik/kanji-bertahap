// Session modes (D-112): general, exhibition and research. Exhibition mode
// writes no row at all, research mode cannot start without a participant
// code, and the leaderboard exists only in exhibition mode.

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { jsModule, MemoryStorage } from "./helpers.mjs";

const { setStorageBackend } = await import(jsModule("storage.js"));
setStorageBackend(new MemoryStorage());

const S = await import(jsModule("state.js"));
const M = await import(jsModule("session-mode.js"));
const L = await import(jsModule("leaderboard.js"));
const logger = await import(jsModule("logger.js"));
const { recordEvent, recordRow } = await import(jsModule("event-log.js"));

const CONSENT_VERSION = "v1";

/** A player who agreed to the current consent text, on a device with the given exhibition switch. */
function setup({ exhibition = false, research = false, code = null } = {}) {
  L.saveDevice({ exhibitionMode: exhibition });
  const progress = S.createProgress();
  S.setConsent(progress, S.CONSENT_CHOICE.AGREED, CONSENT_VERSION);
  if (research) M.enterResearch(progress);
  progress.participantCode = code;
  return { progress, consentText: { version: CONSENT_VERSION }, content: { contentRevision: "draft-0" } };
}

const modeOf = (app) => M.sessionModeOf(app.progress, L.loadDevice());
const rowCount = () => logger.getLogStatus().totalRows;
const col = (name) => logger.LOG_COLUMNS.indexOf(name);

beforeEach(() => {
  logger.clearLog();
  L.clearBoard();
});

test("exhibition mode writes no log row at all, even for a player who agreed", () => {
  const app = setup({ exhibition: true });
  assert.equal(modeOf(app), M.SESSION_MODE.EXHIBITION);
  assert.equal(recordRow(app, { stage: "shape", answer: "食" }), false);
  recordEvent(app, { questStep: "index", stage: "index", prompt: "daftar" });
  assert.equal(rowCount(), 0, "no answer and no event row");
  assert.equal(logger.getUnsentBatch(50).rows.length, 0, "so nothing can be sent");

  // The logger itself refuses rows that are not from a recording mode, whichever screen asks.
  assert.equal(logger.logAnswer({ sessionMode: "exhibition", answer: "x" }), false);
  assert.equal(logger.logAnswer({ answer: "no mode given" }), false);
  assert.equal(rowCount(), 0);

  assert.equal(M.pendingStep(M.SESSION_MODE.EXHIBITION, S.createProgress(), CONSENT_VERSION), null, "the consent screen is skipped");
});

test("general mode records after consent and writes sessionMode on every row", () => {
  const app = setup();
  assert.equal(modeOf(app), M.SESSION_MODE.GENERAL);
  assert.equal(M.pendingStep(M.SESSION_MODE.GENERAL, app.progress, CONSENT_VERSION), null, "participant code is optional");
  recordRow(app, { stage: "shape" });
  const [row] = logger.getLogRows();
  assert.equal(row[col("sessionMode")], "general");

  const undecided = S.createProgress();
  assert.equal(M.pendingStep(M.SESSION_MODE.GENERAL, undecided, CONSENT_VERSION), "consent");
});

test("research mode cannot start without consent and a valid participant code", () => {
  const fresh = S.createProgress();
  M.enterResearch(fresh);
  assert.equal(M.pendingStep(M.SESSION_MODE.RESEARCH, fresh, CONSENT_VERSION), "consent", "consent comes first");

  const app = setup({ research: true });
  assert.equal(modeOf(app), M.SESSION_MODE.RESEARCH);
  assert.equal(M.pendingStep(modeOf(app), app.progress, CONSENT_VERSION), "participant");
  assert.equal(recordRow(app, { stage: "shape" }), false, "no row before the code is entered");

  for (const bad of ["", "K4 01", "2301234567", "nama-yang-terlalu-panjang-untuk-sebuah-kode"]) {
    app.progress.participantCode = bad;
    assert.equal(M.pendingStep(modeOf(app), app.progress, CONSENT_VERSION), "participant", `rejects ${JSON.stringify(bad)}`);
  }
  assert.equal(rowCount(), 0);

  app.progress.participantCode = "K4-01";
  assert.equal(M.pendingStep(modeOf(app), app.progress, CONSENT_VERSION), null);
  recordRow(app, { stage: "shape" });
  const [row] = logger.getLogRows();
  assert.equal(row[col("sessionMode")], "research");
  assert.equal(row[col("participantCode")], "K4-01");
});

test("declining consent in research mode leaves research mode and records nothing", () => {
  const app = setup({ research: true, code: "K4-02" });
  S.setConsent(app.progress, S.CONSENT_CHOICE.DECLINED, CONSENT_VERSION);
  M.leaveResearch(app.progress);
  assert.equal(modeOf(app), M.SESSION_MODE.GENERAL);
  assert.equal(recordRow(app, { stage: "shape" }), false);
  assert.equal(rowCount(), 0);
});

test("the leaderboard cannot be switched on outside exhibition mode", () => {
  const score = { playerId: "p", character: "hana", xp: 30, level: 1 };

  const general = setup();
  assert.equal(M.leaderboardAvailable(modeOf(general)), false);
  L.recordScore(modeOf(general), score);
  assert.deepEqual(L.ranking(), []);

  // A research participant on a device whose exhibition switch was left on: research wins.
  const research = setup({ exhibition: true, research: true, code: "K4-03" });
  assert.equal(modeOf(research), M.SESSION_MODE.RESEARCH);
  assert.equal(M.leaderboardAvailable(modeOf(research)), false);
  assert.equal(M.exhibitionSwitchAvailable(modeOf(research)), false, "the exhibition switch is not offered");
  L.recordScore(modeOf(research), score);
  assert.deepEqual(L.ranking(), []);

  const booth = setup({ exhibition: true });
  assert.equal(M.leaderboardAvailable(modeOf(booth)), true);
  L.recordScore(modeOf(booth), score);
  assert.equal(L.ranking().length, 1);
});

test("research mode is kept per player across a reload, and a progress reset returns to general", () => {
  const app = setup({ research: true, code: "K4-04" });
  S.saveProgress(app.progress);
  const { progress: reloaded } = S.loadProgress();
  assert.equal(M.sessionModeOf(reloaded, L.loadDevice()), M.SESSION_MODE.RESEARCH);
  assert.equal(reloaded.participantCode, "K4-04");

  const reset = S.resetProgress();
  assert.equal(M.sessionModeOf(reset, L.loadDevice()), M.SESSION_MODE.GENERAL);
  assert.equal(reset.participantCode, null);
});

test("the research link starts a fresh player only when the current one already played", () => {
  const progress = S.createProgress();
  progress.welcomeSeen = true;
  progress.character = "hana";
  assert.equal(M.hasPlayed(progress), false, "the welcome screen and a character are not progress");
  S.setConsent(progress, S.CONSENT_CHOICE.DECLINED, CONSENT_VERSION);
  assert.equal(M.hasPlayed(progress), true);
});
