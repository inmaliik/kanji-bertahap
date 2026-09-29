// Answer log for measuring the product's effectiveness.
//
// Rows are stored in localStorage in chunks of LOG_CHUNK_SIZE, as arrays in
// LOG_COLUMNS order, so each answer rewrites one small chunk instead of the
// whole history. Logging never throws and never blocks the game: if storage
// fails, rows are kept in memory for the current page and the failure is
// reported through getLogStatus().
//
// Rows are append-only. `sentCount` marks how many leading stored rows were
// delivered to the remote endpoint (see log-sender.js).

import { readJson, writeJson, removeKey } from "./storage.js";
import { createId } from "./state.js";

export const LOG_KEY = "kanjiGame.log.v1";
const LOG_CHUNK_SIZE = 200;

export const LOG_COLUMNS = [
  "rowId", // unique per row; lets the spreadsheet drop rows sent twice after a network drop
  "timestamp", // ISO-8601, device clock
  "appVersion",
  "contentRevision", // content.json revision the answer was given against
  "playerId", // random per device/player; new after progress reset
  "participantCode", // optional anonymous code entered in Settings
  "consentStatus", // "agreed" for answers; "withdrawn" for the one row written when consent is withdrawn
  "consentVersion", // version of data/consent.json the player agreed to
  "consentAt", // when the player agreed (also on the withdrawal row)
  "sessionId", // one per opening of a quest or review
  "levelId", // quest (Q-…) or region review (REV-B06) where the row was written
  "isReview", // 1 for region reviews (復習)
  "regionId", // region of the quest or review, e.g. B06
  "questId", // quest the item comes from (for review rows: the quest the sampled item belongs to)
  "questStep", // intro | practice | test | production | consolidation | review | spacer
  "phase", // learning | consolidation | spacer (mastered item shown between repeats) | production | review | intro
  "stage", // intro | shape | reading | test | production
  "itemId", // K:<kanji>:shape, W:<kotoba>:reading, C:<conversation>:test, Q:<quest>:production
  "conversationId", // intro and test rows: the conversation shown
  "blankLine", // test rows: 1-based number of the line with the blank
  "targetKanji", // target kanji of the quest, separated by " | "
  "prompt", // what was shown (kanji, word, or line with ___ for the blank)
  "options", // choices in the order shown, separated by " | "
  "optionTypes", // per option, same order: answer | manual | manual-cross | auto
  "correctAnswer",
  "answer",
  "answerType", // type of the chosen option (see optionTypes)
  "hintUsed", // test rows: 1 if "Tampilkan arti" was pressed before answering
  "furiganaMode", // player's furigana setting when the row was written: always | after | never
  "isCorrect", // 1 / 0; empty for production and intro rows
  "streakAfter",
  "responseMs", // from question shown to answer; intro rows: time spent in the intro conversation
  "wasHidden", // 1 if the tab was hidden while the question was open
  "introReplays", // intro rows: how many times the conversation was replayed
  "selfAssessment", // production only: similar | unsure
  "containsKanji", // production only: 1 if the sentence contains a target kanji of the quest
];

const chunkKey = (index) => `${LOG_KEY}.chunk.${index}`;

// { version, columns, chunkCount, rowCount, sentCount, lastExportAt, exportedRowCount }
let meta = null;
let lastChunk = null; // rows of the newest chunk
const memoryRows = []; // rows that could not be written to storage
let memorySentCount = 0;
let storageFailed = false;
let generation = 0; // bumped by clearLog so an in-flight send cannot mark new rows as sent
const appendListeners = new Set();

function emptyMeta() {
  return {
    version: 1,
    columns: LOG_COLUMNS,
    chunkCount: 0,
    rowCount: 0,
    sentCount: 0,
    lastExportAt: null,
    exportedRowCount: 0,
  };
}

function loadMeta() {
  if (meta) return meta;
  const { ok, value } = readJson(LOG_KEY);
  meta = ok && value && Array.isArray(value.columns) ? { ...emptyMeta(), ...value } : emptyMeta();
  if (meta.columns.join() !== LOG_COLUMNS.join()) migrateColumns();
  if (meta.chunkCount > 0) {
    const chunk = readJson(chunkKey(meta.chunkCount - 1));
    lastChunk = Array.isArray(chunk.value) ? chunk.value : [];
  } else {
    lastChunk = [];
  }
  return meta;
}

function saveMeta(next) {
  if (!writeJson(LOG_KEY, next)) return false;
  meta = next;
  return true;
}

// Rewrite rows stored with an older column list into the current order, once,
// so old and new rows never mix column orders. Unknown old columns are dropped;
// new columns are empty for old rows.
function migrateColumns() {
  const oldColumns = meta.columns;
  for (let i = 0; i < meta.chunkCount; i++) {
    const chunk = readJson(chunkKey(i)).value;
    if (!Array.isArray(chunk)) continue;
    const mapped = chunk.map((row) => LOG_COLUMNS.map((col) => row[oldColumns.indexOf(col)] ?? ""));
    writeJson(chunkKey(i), mapped);
  }
  meta = { ...meta, columns: LOG_COLUMNS };
  writeJson(LOG_KEY, meta);
}

function toRow(record) {
  return LOG_COLUMNS.map((col) => {
    const v = record[col];
    if (v === undefined || v === null) return "";
    if (typeof v === "boolean") return v ? 1 : 0;
    return v;
  });
}

/** Called with no arguments after every appended row. */
export function onLogAppended(listener) {
  appendListeners.add(listener);
  return () => appendListeners.delete(listener);
}

/**
 * Append one answer. Missing columns are written as empty.
 * @returns {boolean} true if persisted to storage
 */
export function logAnswer(record) {
  let persisted = false;
  try {
    const row = toRow({ rowId: createId(), timestamp: new Date().toISOString(), ...record });
    const m = loadMeta();
    // Build the new state first and commit it to memory only after both
    // writes succeed, so a failed write can never overwrite a full chunk.
    const startNew = m.chunkCount === 0 || lastChunk.length >= LOG_CHUNK_SIZE;
    const chunkIndex = startNew ? m.chunkCount : m.chunkCount - 1;
    const nextChunk = startNew ? [row] : [...lastChunk, row];
    const nextMeta = { ...m, chunkCount: chunkIndex + 1, rowCount: m.rowCount + 1 };
    if (writeJson(chunkKey(chunkIndex), nextChunk) && saveMeta(nextMeta)) {
      lastChunk = nextChunk;
      persisted = true;
    } else {
      memoryRows.push(row);
      storageFailed = true;
    }
  } catch (err) {
    storageFailed = true;
    console.warn("Log gagal ditulis:", err);
  }
  for (const listener of appendListeners) {
    try {
      listener();
    } catch (err) {
      console.warn(err);
    }
  }
  return persisted;
}

/** Stored rows in [start, start + limit), reading only the chunks involved. */
function readStoredRows(start = 0, limit = Infinity) {
  const m = loadMeta();
  const end = Math.min(m.rowCount, start + limit);
  const rows = [];
  for (let chunk = Math.floor(start / LOG_CHUNK_SIZE); chunk < m.chunkCount; chunk++) {
    const chunkStart = chunk * LOG_CHUNK_SIZE;
    if (chunkStart >= end) break;
    const value = readJson(chunkKey(chunk)).value;
    if (!Array.isArray(value)) continue;
    rows.push(...value.slice(Math.max(0, start - chunkStart), end - chunkStart));
  }
  return rows;
}

/** @returns {Array<Array>} stored rows followed by unsaved in-memory rows */
export function getLogRows() {
  return [...readStoredRows(), ...memoryRows];
}

/**
 * Next rows the remote endpoint has not received: stored rows first, then
 * rows that only exist in memory because storage was full.
 * Pass the returned batch to markSent() once the endpoint confirms it.
 * @returns {{rows: Array<Array>, source: "stored"|"memory"|null, generation: number}}
 */
export function getUnsentBatch(limit) {
  const m = loadMeta();
  if (m.sentCount < m.rowCount) return { rows: readStoredRows(m.sentCount, limit), source: "stored", generation };
  if (memorySentCount < memoryRows.length) {
    return { rows: memoryRows.slice(memorySentCount, memorySentCount + limit), source: "memory", generation };
  }
  return { rows: [], source: null, generation };
}

export function markSent({ rows, source, generation: batchGeneration }) {
  if (batchGeneration !== generation) return; // the log was cleared meanwhile
  const count = rows.length;
  if (source === "memory") {
    memorySentCount = Math.min(memoryRows.length, memorySentCount + count);
    return;
  }
  const m = loadMeta();
  saveMeta({ ...m, sentCount: Math.min(m.rowCount, m.sentCount + count) });
}

export function markExported() {
  const m = loadMeta();
  saveMeta({ ...m, lastExportAt: new Date().toISOString(), exportedRowCount: m.rowCount + memoryRows.length });
}

export function getLogStatus() {
  const m = loadMeta();
  const totalRows = m.rowCount + memoryRows.length;
  return {
    storedRows: m.rowCount,
    unsavedRows: memoryRows.length,
    totalRows,
    unsentRows: m.rowCount - m.sentCount + (memoryRows.length - memorySentCount),
    lastExportAt: m.lastExportAt,
    rowsSinceExport: Math.max(0, totalRows - m.exportedRowCount),
    storageFailed,
  };
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

const toRecord = (row) => Object.fromEntries(LOG_COLUMNS.map((column, i) => [column, row[i]]));

/**
 * Delete the rows matching `predicate(record)` from the local log, e.g. when a
 * participant withdraws consent (D-53). The sent and exported markers are
 * recounted so rows that were not sent yet still get sent.
 * @returns {number} rows deleted
 */
export function deleteRows(predicate) {
  const m = loadMeta();
  const stored = readStoredRows();
  const keepStored = stored.map((row) => !predicate(toRecord(row)));
  const keepMemory = memoryRows.map((row) => !predicate(toRecord(row)));
  const keptWithin = (flags, count) => flags.slice(0, count).filter(Boolean).length;

  const keptRows = stored.filter((_, i) => keepStored[i]);
  const deleted = stored.length - keptRows.length + keepMemory.filter((keep) => !keep).length;
  if (!deleted) return 0;

  // Write the new chunks over the old keys first, then drop leftover keys.
  const chunks = [];
  for (let i = 0; i < keptRows.length; i += LOG_CHUNK_SIZE) chunks.push(keptRows.slice(i, i + LOG_CHUNK_SIZE));
  chunks.forEach((chunk, i) => writeJson(chunkKey(i), chunk));
  for (let i = chunks.length; i < m.chunkCount; i++) removeKey(chunkKey(i));

  const allKeep = [...keepStored, ...keepMemory];
  saveMeta({
    ...m,
    chunkCount: chunks.length,
    rowCount: keptRows.length,
    sentCount: keptWithin(keepStored, m.sentCount),
    exportedRowCount: keptWithin(allKeep, m.exportedRowCount),
  });
  lastChunk = chunks[chunks.length - 1] ?? [];
  memorySentCount = keptWithin(keepMemory, memorySentCount);
  const keptMemory = memoryRows.filter((_, i) => keepMemory[i]);
  memoryRows.length = 0;
  memoryRows.push(...keptMemory);
  generation += 1; // row positions changed: an in-flight send must not mark anything
  return deleted;
}

export function clearLog() {
  const m = loadMeta();
  for (let i = 0; i < m.chunkCount; i++) removeKey(chunkKey(i));
  removeKey(LOG_KEY);
  meta = emptyMeta();
  lastChunk = [];
  memoryRows.length = 0;
  memorySentCount = 0;
  storageFailed = false;
  generation += 1;
}
