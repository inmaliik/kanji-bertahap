// Session modes (D-112). Every rule that differs between the general app,
// the exhibition booth and research sessions is decided here, so the screens
// only ask questions.
//
// - general: the default for anyone who opens the address. Consent screen,
//   recording only after agreeing, participant code optional, no leaderboard.
// - exhibition: a device setting (Settings, "Mode pameran"). Nothing is
//   recorded, so the research consent screen is skipped; the leaderboard is
//   available.
// - research: entered through the research link (#/penelitian) and stored per
//   player, so it survives a reload; a progress reset returns to general.
//   Consent is required (declining leaves research mode), a participant code
//   is required before playing, and the leaderboard and the exhibition switch
//   are unavailable so every participant plays under the same conditions.
//
// The mode is written to every log row (sessionMode), so research data is
// told apart by this column, not by the app version (D-111).

import { consentStatus, isRecordingAllowed } from "./state.js";

export const SESSION_MODE = Object.freeze({ GENERAL: "general", EXHIBITION: "exhibition", RESEARCH: "research" });

/** Modes in which rows may be written. The logger refuses any other row. */
export const RECORDING_MODES = Object.freeze([SESSION_MODE.GENERAL, SESSION_MODE.RESEARCH]);

/** Hash of the research link shared with participants, e.g. https://…/#/penelitian */
export const RESEARCH_LINK_HASH = "#/penelitian";

export const MODE_LABELS = Object.freeze({
  [SESSION_MODE.GENERAL]: "Umum",
  [SESSION_MODE.EXHIBITION]: "Pameran",
  [SESSION_MODE.RESEARCH]: "Penelitian",
});

/**
 * Research is a property of the player (progress.sessionMode); exhibition is a
 * property of the device. Research wins, so a stale exhibition switch can never
 * change a participant's conditions.
 * @param {object} progress
 * @param {{exhibitionMode: boolean}} device
 */
export function sessionModeOf(progress, device) {
  if (progress.sessionMode === SESSION_MODE.RESEARCH) return SESSION_MODE.RESEARCH;
  return device.exhibitionMode ? SESSION_MODE.EXHIBITION : SESSION_MODE.GENERAL;
}

/** The consent screen is shown in every mode that records. */
export const asksConsent = (mode) => RECORDING_MODES.includes(mode);

export const leaderboardAvailable = (mode) => mode === SESSION_MODE.EXHIBITION;

export const exhibitionSwitchAvailable = (mode) => mode !== SESSION_MODE.RESEARCH;

/** Research mode cannot clear the participant code; it can only replace it. */
export const participantCodeRequired = (mode) => mode === SESSION_MODE.RESEARCH;

// ---------------------------------------------------------------------------
// Participant code

const PARTICIPANT_CODE_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const LOOKS_LIKE_NIM = /^\d{8,}$/;
export const PARTICIPANT_CODE_EXAMPLE = "K4-01"; // suggested shape: letters, then numbers

/** @returns {string|null} why the code cannot be used, or null when it can */
export function participantCodeProblem(code) {
  if (!code) return "Kode peserta masih kosong.";
  if (!PARTICIPANT_CODE_PATTERN.test(code)) {
    return `Kode hanya boleh berisi huruf, angka, tanda - dan _, tanpa spasi (maksimal 32 karakter). Contoh: ${PARTICIPANT_CODE_EXAMPLE}.`;
  }
  if (LOOKS_LIKE_NIM.test(code)) {
    return `Kode berupa 8 angka atau lebih terlihat seperti NIM. Gunakan kode anonim dari peneliti: huruf lalu angka, misalnya ${PARTICIPANT_CODE_EXAMPLE}.`;
  }
  return null;
}

const hasParticipantCode = (progress) => typeof progress.participantCode === "string" && !participantCodeProblem(progress.participantCode);

// ---------------------------------------------------------------------------
// Gates

/**
 * What must happen before this player may play, in order:
 * "consent" (decide about recording) or "participant" (research: enter a code).
 * @param {string|null} consentVersion null when the consent text could not be loaded
 * @returns {"consent"|"participant"|null}
 */
export function pendingStep(mode, progress, consentVersion) {
  if (!asksConsent(mode)) return null;
  if (consentStatus(progress, consentVersion) === "undecided") return "consent";
  if (mode === SESSION_MODE.RESEARCH && !hasParticipantCode(progress)) return "participant";
  return null;
}

/** Rows are written only in a recording mode, after agreeing, and in research only with a participant code. */
export function recordingAllowed(mode, progress, consentVersion) {
  if (!asksConsent(mode) || !isRecordingAllowed(progress, consentVersion)) return false;
  return mode !== SESSION_MODE.RESEARCH || hasParticipantCode(progress);
}

// ---------------------------------------------------------------------------
// Entering and leaving research mode

/** A player who already played or decided something; the research link starts a fresh player instead (D-112). */
export function hasPlayed(progress) {
  return (
    Object.keys(progress.quests).length > 0 ||
    Object.keys(progress.items).length > 0 ||
    progress.consent !== null ||
    progress.participantCode !== null
  );
}

export function enterResearch(progress) {
  progress.sessionMode = SESSION_MODE.RESEARCH;
}

/** Declining consent in research mode: the player keeps playing, but in general mode and without recording. */
export function leaveResearch(progress) {
  progress.sessionMode = SESSION_MODE.GENERAL;
}
