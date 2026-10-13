// The one path to the answer log for quests and events. Rows are written only
// with consent (D-50) and only in a recording session mode (D-112). Non-answer
// events, e.g. opening the index, are logged here too (D-68).

import { APP_VERSION } from "./config.js";
import { getBuildId } from "./build.js";
import { logAnswer } from "./logger.js";
import { loadDevice } from "./leaderboard.js";
import { recordingAllowed, sessionModeOf } from "./session-mode.js";
import { STATUS } from "./state.js";

/** Session mode of the current player on this device. */
export const currentMode = (app) => sessionModeOf(app.progress, loadDevice());

/** Quests the player started but has not passed yet, for the openQuests column. */
export function openQuests(progress) {
  return Object.entries(progress.quests)
    .filter(([id, entry]) => !id.startsWith("REV-") && entry.status !== STATUS.PASSED)
    .map(([id]) => id);
}

/** Columns every row of the current player shares. */
export function playerColumns(app, mode = currentMode(app)) {
  const { progress } = app;
  return {
    appVersion: APP_VERSION,
    buildId: getBuildId(),
    contentRevision: app.content?.contentRevision,
    playerId: progress.playerId,
    participantCode: progress.participantCode,
    sessionMode: mode,
    consentStatus: progress.consent?.choice,
    consentVersion: progress.consent?.version,
    consentAt: progress.consent?.at,
    furiganaMode: progress.settings.furiganaMode,
  };
}

/**
 * Write one row if this player may be recorded now.
 * @returns {boolean} true if a row was written and stored
 */
export function recordRow(app, fields) {
  const mode = currentMode(app);
  if (!recordingAllowed(mode, app.progress, app.consentText?.version ?? null)) return false;
  return logAnswer({ ...playerColumns(app, mode), ...fields });
}

export function recordEvent(app, fields) {
  return recordRow(app, { phase: "event", openQuests: openQuests(app.progress).join(" | "), ...fields });
}
