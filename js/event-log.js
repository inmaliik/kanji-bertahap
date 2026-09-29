// Non-answer events in the log, e.g. opening the index (D-68). Written only
// with consent, like answers (D-50).

import { APP_VERSION } from "./config.js";
import { logAnswer } from "./logger.js";
import { isRecordingAllowed, STATUS } from "./state.js";

/** Quests the player started but has not passed yet, for the openQuests column. */
export function openQuests(progress) {
  return Object.entries(progress.quests)
    .filter(([id, entry]) => !id.startsWith("REV-") && entry.status !== STATUS.PASSED)
    .map(([id]) => id);
}

export function recordEvent(app, fields) {
  if (!isRecordingAllowed(app.progress, app.consentText?.version ?? null)) return;
  const { progress } = app;
  logAnswer({
    appVersion: APP_VERSION,
    contentRevision: app.content.contentRevision,
    playerId: progress.playerId,
    participantCode: progress.participantCode,
    consentStatus: progress.consent.choice,
    consentVersion: progress.consent.version,
    consentAt: progress.consent.at,
    phase: "event",
    furiganaMode: progress.settings.furiganaMode,
    openQuests: openQuests(progress).join(" | "),
    ...fields,
  });
}
