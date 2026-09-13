// Player progress in localStorage, and every rule that decides mastery,
// passing, unlocking, and review levels.
//
// Only facts are stored (item streaks, "started", "passed", production
// submitted). Whether a level is locked is always derived from level order,
// so inserting a level during a content revision never corrupts progress.

import { readJson, writeJson, writeRaw } from "./storage.js";

// ---------------------------------------------------------------------------
// Game rules. Change them here only.

/** Consecutive correct answers after which an item counts as mastered. */
export const STREAK_TO_MASTER = 2;

/** A missed item returns after this many other items (random within range). */
export const REQUEUE_GAP_MIN = 2;
export const REQUEUE_GAP_MAX = 3;

/** A review level is inserted after every N levels. */
export const REVIEW_EVERY_N_LEVELS = 3;

/** Number of items sampled into one review level. */
export const REVIEW_ITEM_COUNT = 10;

/** Choices shown in the reading and sentence stages (answer + distractors). */
export const OPTION_COUNT = 4;

// ---------------------------------------------------------------------------
// Storage format

export const PROGRESS_KEY = "kanjiGame.progress.v1";

export const LEVEL_STATUS = Object.freeze({
  // Stored
  IN_PROGRESS: "in_progress",
  PASSED: "passed",
  // Derived only, never stored
  LOCKED: "locked",
  AVAILABLE: "available",
});

/** UUID v4. Falls back to getRandomValues on plain-http LAN addresses, where
 * crypto.randomUUID is unavailable (e.g. phones connecting to a laptop at an
 * exhibition). */
export function createId() {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createProgress(now = new Date()) {
  return {
    playerId: createId(),
    participantCode: null,
    createdAt: now.toISOString(),
    lastPlayed: null,
    levels: {},
  };
}

function createLevelEntry() {
  return {
    status: LEVEL_STATUS.IN_PROGRESS,
    itemStreaks: {},
    attempts: 0, // number of times the level was opened for play
    learningDone: false, // first pass through stages 1–4 finished
    productionSubmitted: false,
    startedAt: null,
    passedAt: null,
  };
}

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function isValidProgress(value) {
  return isPlainObject(value) && typeof value.playerId === "string" && isPlainObject(value.levels);
}

// Fill fields added after a progress object was first written.
function normalizeProgress(progress) {
  progress.participantCode ??= null;
  progress.createdAt ??= null;
  progress.lastPlayed ??= null;
  for (const [id, entry] of Object.entries(progress.levels)) {
    if (!isPlainObject(entry)) {
      delete progress.levels[id];
      continue;
    }
    progress.levels[id] = { ...createLevelEntry(), ...entry };
    if (!isPlainObject(progress.levels[id].itemStreaks)) progress.levels[id].itemStreaks = {};
  }
  return progress;
}

/**
 * @returns {{progress: object, recovered: boolean}} recovered = stored data
 *   was unreadable; it was backed up under a separate key and a fresh
 *   progress object was created.
 */
export function loadProgress() {
  const { ok, value, raw } = readJson(PROGRESS_KEY);
  if (ok && isValidProgress(value)) {
    return { progress: normalizeProgress(value), recovered: false };
  }
  const unreadable = !ok || value !== null;
  if (unreadable && raw) writeRaw(`${PROGRESS_KEY}.corrupt.${Date.now()}`, raw);
  const progress = createProgress();
  saveProgress(progress);
  return { progress, recovered: unreadable };
}

/** @returns {boolean} false if storage is unavailable or full */
export function saveProgress(progress) {
  return writeJson(PROGRESS_KEY, progress);
}

/** New player: fresh playerId, no level progress. Answer logs are untouched. */
export function resetProgress() {
  const progress = createProgress();
  saveProgress(progress);
  return progress;
}

export function peekLevelEntry(progress, nodeId) {
  return progress.levels[nodeId] ?? null;
}

/** Called when a player opens a level for play. */
export function beginAttempt(progress, nodeId, now = new Date()) {
  const entry = progress.levels[nodeId] ?? (progress.levels[nodeId] = createLevelEntry());
  entry.attempts += 1;
  entry.startedAt ??= now.toISOString();
  progress.lastPlayed = now.toISOString();
  return entry;
}

export function touch(progress, now = new Date()) {
  progress.lastPlayed = now.toISOString();
}

// ---------------------------------------------------------------------------
// Mastery and passing

export const isMastered = (streak) => (streak ?? 0) >= STREAK_TO_MASTER;

/**
 * @param {string[]} itemIds all scored items of the level (stages 1–4)
 * @param {object} entry level progress entry
 * @param {boolean} requiresProduction review levels have no production stage
 */
export function evaluateEntry(itemIds, entry, { requiresProduction }) {
  const mastered = itemIds.filter((id) => isMastered(entry.itemStreaks[id])).length;
  const allMastered = mastered === itemIds.length;
  return {
    mastered,
    total: itemIds.length,
    allMastered,
    passed: allMastered && (!requiresProduction || entry.productionSubmitted),
  };
}

export function markPassed(entry, now = new Date()) {
  entry.status = LEVEL_STATUS.PASSED;
  entry.passedAt ??= now.toISOString();
}

// ---------------------------------------------------------------------------
// Progression: level order, review levels, and derived lock state

export const reviewId = (n) => `R${String(n).padStart(2, "0")}`;

/**
 * Full play order: content levels in array order, with a review node after
 * every REVIEW_EVERY_N_LEVELS levels.
 * @returns {Array<{type: "level", id: string, level: object} |
 *                 {type: "review", id: string, coveredLevelIds: string[]}>}
 */
export function buildProgression(levels) {
  const nodes = [];
  levels.forEach((level, i) => {
    nodes.push({ type: "level", id: level.id, level });
    if ((i + 1) % REVIEW_EVERY_N_LEVELS === 0) {
      nodes.push({
        type: "review",
        id: reviewId((i + 1) / REVIEW_EVERY_N_LEVELS),
        coveredLevelIds: levels.slice(0, i + 1).map((l) => l.id),
      });
    }
  });
  return nodes;
}

/**
 * Derive each node's status.
 * - A node with stored progress keeps it (started or passed), so a level
 *   inserted later never re-locks a level the player already started.
 * - Otherwise the first node is available, and every other node is available
 *   only when the node right before it has passed.
 * @returns {Map<string, string>} node id → LEVEL_STATUS value
 */
export function computeStatuses(nodes, progress) {
  const statuses = new Map();
  nodes.forEach((node, i) => {
    const stored = progress.levels[node.id]?.status;
    if (stored === LEVEL_STATUS.PASSED || stored === LEVEL_STATUS.IN_PROGRESS) {
      statuses.set(node.id, stored);
      return;
    }
    const unlocked = i === 0 || statuses.get(nodes[i - 1].id) === LEVEL_STATUS.PASSED;
    statuses.set(node.id, unlocked ? LEVEL_STATUS.AVAILABLE : LEVEL_STATUS.LOCKED);
  });
  return statuses;
}
