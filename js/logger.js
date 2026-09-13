// Answer log for measuring the product's effectiveness.
//
// Rows are stored in localStorage in chunks of LOG_CHUNK_SIZE, as arrays in
// LOG_COLUMNS order, so each answer rewrites one small chunk instead of the
// whole history. Logging never throws and never blocks the game: if storage
// fails, rows are kept in memory for the current page and the failure is
// reported through getLogStatus().
//
// Remote sending (Google Apps Script) is added in step 4.

import { readJson, writeJson, removeKey } from "./storage.js";

export const LOG_KEY = "kanjiGame.log.v1";
const LOG_CHUNK_SIZE = 200;

export const LOG_COLUMNS = [
  "timestamp", // ISO-8601, device clock
  "appVersion",
  "contentRevision", // content.json revision the answer was given against
  "playerId", // random per device/player; new after progress reset
  "participantCode", // optional anonymous code entered in Settings
  "sessionId", // one per opening of a level
  "levelId",
  "isReview", // 1 for review levels
  "phase", // learning | consolidation | spacer (mastered item shown between repeats) | production | review
  "stage", // shape | kunyomi | onyomi | sentence | production
  "itemId",
  "prompt", // what was shown (kanji, word, or sentence)
  "options", // choices in the order shown, separated by " | "
  "correctAnswer",
  "answer",
  "isCorrect", // 1 / 0; empty for production
  "streakAfter",
  "responseMs", // from question shown to answer
  "wasHidden", // 1 if the tab was hidden while the question was open
  "selfAssessment", // production only: similar | unsure
  "containsKanji", // production only: 1 if the sentence contains the level kanji
];

const chunkKey = (index) => `${LOG_KEY}.chunk.${index}`;

let meta = null; // { version, columns, chunkCount, rowCount, sentCount }
let lastChunk = null; // rows of the newest chunk
const memoryRows = []; // rows that could not be written to storage
let storageFailed = false;

function emptyMeta() {
  return { version: 1, columns: LOG_COLUMNS, chunkCount: 0, rowCount: 0, sentCount: 0 };
}

function loadMeta() {
  if (meta) return meta;
  const { ok, value } = readJson(LOG_KEY);
  meta = ok && value && Array.isArray(value.columns) ? value : emptyMeta();
  if (meta.chunkCount > 0) {
    const chunk = readJson(chunkKey(meta.chunkCount - 1));
    lastChunk = Array.isArray(chunk.value) ? chunk.value : [];
  } else {
    lastChunk = [];
  }
  return meta;
}

function toRow(record) {
  return LOG_COLUMNS.map((col) => {
    const v = record[col];
    if (v === undefined || v === null) return "";
    if (typeof v === "boolean") return v ? 1 : 0;
    return v;
  });
}

/**
 * Append one answer. Missing columns are written as empty.
 * @returns {boolean} true if persisted to storage
 */
export function logAnswer(record) {
  try {
    const row = toRow({ timestamp: new Date().toISOString(), ...record });
    const m = loadMeta();
    // Build the new state first and commit it to memory only after both
    // writes succeed, so a failed write can never overwrite a full chunk.
    const startNew = m.chunkCount === 0 || lastChunk.length >= LOG_CHUNK_SIZE;
    const chunkIndex = startNew ? m.chunkCount : m.chunkCount - 1;
    const nextChunk = startNew ? [row] : [...lastChunk, row];
    const nextMeta = { ...m, chunkCount: chunkIndex + 1, rowCount: m.rowCount + 1 };
    if (writeJson(chunkKey(chunkIndex), nextChunk) && writeJson(LOG_KEY, nextMeta)) {
      meta = nextMeta;
      lastChunk = nextChunk;
      return true;
    }
    memoryRows.push(row);
    storageFailed = true;
    return false;
  } catch (err) {
    storageFailed = true;
    console.warn("Log gagal ditulis:", err);
    return false;
  }
}

/** @returns {Array<Array>} stored rows followed by unsaved in-memory rows */
export function getLogRows() {
  const m = loadMeta();
  const rows = [];
  for (let i = 0; i < m.chunkCount; i++) {
    const chunk = readJson(chunkKey(i)).value;
    if (Array.isArray(chunk)) rows.push(...chunk);
  }
  // Rows written with an older column list are mapped by column name.
  const mapped = m.columns.join() === LOG_COLUMNS.join()
    ? rows
    : rows.map((r) => LOG_COLUMNS.map((col) => r[m.columns.indexOf(col)] ?? ""));
  return [...mapped, ...memoryRows];
}

export function getLogStatus() {
  const m = loadMeta();
  return { storedRows: m.rowCount, unsavedRows: memoryRows.length, storageFailed };
}

// Values starting with these characters are run as formulas by spreadsheet
// apps; participant sentences are free text, so neutralize them.
const FORMULA_START = /^[=+\-@\t\r]/;

function csvCell(value) {
  let s = String(value);
  if (typeof value === "string" && FORMULA_START.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV with a UTF-8 BOM so Excel on Windows shows Japanese correctly. */
export function logToCsv(rows = getLogRows()) {
  const lines = [LOG_COLUMNS.join(","), ...rows.map((row) => row.map(csvCell).join(","))];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function clearLog() {
  const m = loadMeta();
  for (let i = 0; i < m.chunkCount; i++) removeKey(chunkKey(i));
  removeKey(LOG_KEY);
  meta = emptyMeta();
  lastChunk = [];
  memoryRows.length = 0;
  storageFailed = false;
}
