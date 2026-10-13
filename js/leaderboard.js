// Exhibition-mode leaderboard (D-106). Per device only: no server, nothing
// sent, never in the research log. Available only in exhibition mode, which is
// switched on in Settings; never in general or research mode (D-112).
//
// Entries show the chosen character's portrait and a running player number
// ("Pemain 07"), never typed text or a participant code, so no inappropriate
// name or participant identity can appear on the booth screen. The board is
// kept under its own key and survives a progress reset, because every new
// visitor at the booth starts with a reset; it has its own clear button.

import { readJson, writeJson } from "./storage.js";
import { leaderboardAvailable } from "./session-mode.js";

export const DEVICE_KEY = "kanjiGame.device.v1"; // device settings, kept across resets
export const LEADERBOARD_KEY = "kanjiGame.leaderboard.v1";

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

export function loadDevice() {
  const { value } = readJson(DEVICE_KEY);
  return { exhibitionMode: isPlainObject(value) && value.exhibitionMode === true };
}

export function saveDevice(device) {
  return writeJson(DEVICE_KEY, device);
}

function loadBoard() {
  const { value } = readJson(LEADERBOARD_KEY);
  return isPlainObject(value) && isPlainObject(value.players) && Number.isInteger(value.nextNumber)
    ? value
    : { nextNumber: 1, players: {} };
}

/**
 * Store the current player's score in exhibition mode. A player gets the next
 * number the first time they appear on this device.
 * @param {string} mode session mode of the player (session-mode.js)
 */
export function recordScore(mode, { playerId, character, xp, level }, now = new Date()) {
  if (!leaderboardAvailable(mode)) return;
  const board = loadBoard();
  const entry = board.players[playerId] ?? { number: board.nextNumber++ };
  board.players[playerId] = { ...entry, character, xp, level, updatedAt: now.toISOString() };
  writeJson(LEADERBOARD_KEY, board);
}

/** Players by XP, highest first; ties keep who got there first. */
export function ranking() {
  return Object.entries(loadBoard().players)
    .map(([playerId, e]) => ({ playerId, ...e }))
    .sort((a, b) => b.xp - a.xp || a.updatedAt.localeCompare(b.updatedAt));
}

export function clearBoard() {
  return writeJson(LEADERBOARD_KEY, { nextNumber: 1, players: {} });
}

export const playerLabel = (number) => `Pemain ${String(number).padStart(2, "0")}`;
