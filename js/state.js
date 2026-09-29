// Player progress in localStorage, and every rule that decides mastery,
// passing, and unlocking.
//
// Only facts are stored (item streaks, "started", "passed", production
// submitted). Whether something is locked is always derived from content
// order, so inserting a quest during a content revision never corrupts progress.

import { readJson, usedChars, writeJson, writeRaw } from "./storage.js";
import { shuffle } from "./random.js";

// ---------------------------------------------------------------------------
// Game rules. Change them here only.

/** Consecutive correct answers after which an item counts as mastered. */
export const STREAK_TO_MASTER = 2;

/** A missed item returns after this many other items (random within range). */
export const REQUEUE_GAP_MIN = 2;
export const REQUEUE_GAP_MAX = 3;

/** Number of items sampled into one region review (復習). */
export const REVIEW_ITEM_COUNT = 10;

/** Share of a region review taken from the region itself; the rest comes from earlier regions (D-63). */
export const REVIEW_CURRENT_SHARE = 0.7;

/** Choices shown in the reading and context-test questions (answer + distractors). */
export const OPTION_COUNT = 4;

/**
 * Estimated localStorage budget in characters. Browsers allow roughly 5 MB per
 * site, but count it differently; 2.5 million characters is a deliberately low
 * estimate so the warning comes early on every browser.
 */
export const STORAGE_BUDGET_CHARS = 2_500_000;

/** Share of the storage budget from which Settings and the level list warn. */
export const STORAGE_WARNING_RATIO = 0.8;

// ---------------------------------------------------------------------------
// Storage format

// v2: the map version (schemaVersion 2). A new key, so that progress of the
// level version on the main branch never mixes with quest progress.
export const PROGRESS_KEY = "kanjiGame.progress.v2";

export const STATUS = Object.freeze({
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

export const CONSENT_CHOICE = Object.freeze({ AGREED: "agreed", DECLINED: "declined" });

/** Furigana setting (D-65). Per player, so a progress reset restores the default. */
export const FURIGANA_MODE = Object.freeze({ ALWAYS: "always", AFTER: "after", NEVER: "never" });
export const DEFAULT_FURIGANA_MODE = FURIGANA_MODE.ALWAYS;

export function createProgress(now = new Date()) {
  return {
    playerId: createId(),
    participantCode: null,
    consent: null, // { choice, version, at } — asked again when the consent text version changes
    createdAt: now.toISOString(),
    lastPlayed: null,
    settings: { furiganaMode: DEFAULT_FURIGANA_MODE },
    items: {}, // item id → streak, shared by every quest and review (D-61)
    quests: {}, // quest or review id → entry
  };
}

function createEntry() {
  return {
    status: STATUS.IN_PROGRESS,
    attempts: 0, // number of times the quest was opened for play
    introDone: false, // intro conversation read to the end
    learningDone: false, // first pass through the practice and test items finished
    productionSubmitted: false,
    reviewItemIds: null, // reviews only: the sampled items, kept across visits
    streaks: null, // reviews only: streaks of the sampled items within this review
    startedAt: null,
    passedAt: null,
  };
}

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function isValidProgress(value) {
  return isPlainObject(value) && typeof value.playerId === "string" && isPlainObject(value.quests);
}

// Fill fields added after a progress object was first written.
function normalizeProgress(progress) {
  progress.participantCode ??= null;
  progress.consent ??= null;
  progress.createdAt ??= null;
  progress.lastPlayed ??= null;
  if (!isPlainObject(progress.settings)) progress.settings = {};
  if (!Object.values(FURIGANA_MODE).includes(progress.settings.furiganaMode)) progress.settings.furiganaMode = DEFAULT_FURIGANA_MODE;
  if (!isPlainObject(progress.items)) progress.items = {};
  for (const [id, entry] of Object.entries(progress.quests)) {
    if (!isPlainObject(entry)) delete progress.quests[id];
    else progress.quests[id] = { ...createEntry(), ...entry };
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

/** New player: fresh playerId, no quest progress, default settings. Answer logs are untouched. */
export function resetProgress() {
  const progress = createProgress();
  saveProgress(progress);
  return progress;
}

export function peekEntry(progress, id) {
  return progress.quests[id] ?? null;
}

/** Called when a player opens a quest or review for play. */
export function beginAttempt(progress, id, now = new Date()) {
  const entry = progress.quests[id] ?? (progress.quests[id] = createEntry());
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
 * @param {string[]} itemIds all scored items of the quest or review
 * @param {Object<string, number>} streaks progress.items
 * @param {object} entry quest or review progress entry
 * @param {boolean} requiresProduction reviews have no production
 */
export function evaluateEntry(itemIds, streaks, entry, { requiresProduction }) {
  const mastered = itemIds.filter((id) => isMastered(streaks[id])).length;
  const allMastered = mastered === itemIds.length;
  return {
    mastered,
    total: itemIds.length,
    allMastered,
    passed: allMastered && (!requiresProduction || entry.productionSubmitted),
  };
}

export function markPassed(entry, now = new Date()) {
  entry.status = STATUS.PASSED;
  entry.passedAt ??= now.toISOString();
}

// ---------------------------------------------------------------------------
// Derived lock state

/**
 * Derive each node's status from the play order.
 * - A node with stored progress keeps it (started or passed), so a node
 *   inserted later never re-locks one the player already started.
 * - Otherwise the first node is available, and every other node is available
 *   only when the node right before it has passed.
 * The map (step 3) builds its region order on this.
 * @param {Array<{id: string}>} nodes in play order
 * @param {(id: string) => string|undefined} storedStatus
 * @returns {Map<string, string>} node id → STATUS value
 */
export function computeStatuses(nodes, storedStatus) {
  const statuses = new Map();
  nodes.forEach((node, i) => {
    const stored = storedStatus(node.id);
    if (stored === STATUS.PASSED || stored === STATUS.IN_PROGRESS) {
      statuses.set(node.id, stored);
      return;
    }
    const unlocked = i === 0 || statuses.get(nodes[i - 1].id) === STATUS.PASSED;
    statuses.set(node.id, unlocked ? STATUS.AVAILABLE : STATUS.LOCKED);
  });
  return statuses;
}

// ---------------------------------------------------------------------------
// Reviews

/**
 * Sample review items evenly across groups (quests): each group's items are
 * shuffled, then picked round-robin, so no group is left out of a review.
 * @param {Array<object[]>} itemsPerLevel scored items of each group
 * @returns {object[]} at most REVIEW_ITEM_COUNT items
 */
export function sampleReviewItems(itemsPerLevel, random = Math.random, count = REVIEW_ITEM_COUNT) {
  const queues = shuffle(itemsPerLevel.filter((items) => items.length), random).map((items) => shuffle(items, random));
  const picked = [];
  while (picked.length < count && queues.some((q) => q.length)) {
    for (const queue of queues) {
      if (picked.length >= count) break;
      if (queue.length) picked.push(queue.shift());
    }
  }
  return picked;
}

// ---------------------------------------------------------------------------
// Storage capacity

/** Estimated share of the browser storage budget used by this app. */
export function storageUsage() {
  const used = usedChars("kanjiGame.");
  const ratio = used / STORAGE_BUDGET_CHARS;
  return { used, budget: STORAGE_BUDGET_CHARS, ratio, warning: ratio >= STORAGE_WARNING_RATIO };
}

// ---------------------------------------------------------------------------
// Consent to record answers (D-50)

/**
 * "agreed" or "declined" for the current consent text version, otherwise
 * "undecided" (never asked, or asked with an older version of the text).
 * @param {string|null} currentVersion null when the consent text could not be loaded
 */
export function consentStatus(progress, currentVersion) {
  const consent = progress.consent;
  if (!consent) return "undecided";
  if (consent.choice === CONSENT_CHOICE.DECLINED) return CONSENT_CHOICE.DECLINED;
  if (consent.choice === CONSENT_CHOICE.AGREED && currentVersion && consent.version === currentVersion) {
    return CONSENT_CHOICE.AGREED;
  }
  return "undecided";
}

export function setConsent(progress, choice, version, now = new Date()) {
  progress.consent = { choice, version, at: now.toISOString() };
}

/** Answers are written to the log only after agreeing to the current consent text. */
export const isRecordingAllowed = (progress, currentVersion) =>
  consentStatus(progress, currentVersion) === CONSENT_CHOICE.AGREED;
