// Sends answer log rows to a Google Apps Script Web App.
//
// Requests are simple POSTs with a text/plain body, which browsers send
// without a CORS preflight (Apps Script cannot answer preflights). Rows are
// sent in batches, oldest first; a batch counts as delivered only when the
// endpoint replies {"ok": true}. Every failure is recorded in the status and
// retried later; nothing here ever throws into the game.

import {
  LOG_REMOTE_BATCH_SIZE,
  LOG_REMOTE_ENABLED,
  LOG_REMOTE_RETRY_MS,
  LOG_REMOTE_TIMEOUT_MS,
  LOG_REMOTE_URL,
} from "./config.js";
import { getLogStatus, getUnsentBatch, LOG_COLUMNS, markSent } from "./logger.js";
import { isPlaceholderConsentVersion } from "./consent.js";

const APP_ID = "kanji-bertahap"; // checked by the Apps Script
const FLUSH_DELAY_MS = 2000; // group answers given in quick succession

const status = {
  sending: false,
  lastAttemptAt: null,
  lastSuccessAt: null,
  lastError: null,
};
const listeners = new Set();
let flushTimer = null;
let started = false;
let blockedReason = null; // set while sending is forced off (D-52)

class SendError extends Error {}

export function isRemoteLogEnabled() {
  return LOG_REMOTE_ENABLED && LOG_REMOTE_URL.trim() !== "";
}

export function getSenderStatus() {
  return {
    enabled: LOG_REMOTE_ENABLED,
    configured: isRemoteLogEnabled(),
    blockedReason,
    ...status,
    unsentRows: getLogStatus().unsentRows,
  };
}

/** @returns {() => void} unsubscribe */
export function subscribeSenderStatus(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const listener of listeners) {
    try {
      listener(getSenderStatus());
    } catch (err) {
      console.warn(err);
    }
  }
}

function describeError(err) {
  if (err instanceof SendError) return err.message;
  if (err?.name === "AbortError") {
    return `Server tidak membalas dalam ${Math.round(LOG_REMOTE_TIMEOUT_MS / 1000)} detik. Akan dicoba lagi.`;
  }
  return (
    "Tidak bisa terhubung ke server. Kemungkinan jaringan mati, URL salah, atau Web App belum " +
    'di-deploy dengan akses "Siapa saja" (Anyone).'
  );
}

async function postBatch(rows) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOG_REMOTE_TIMEOUT_MS);
  try {
    const response = await fetch(LOG_REMOTE_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ app: APP_ID, columns: LOG_COLUMNS, rows }),
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await response.text();
    if (!response.ok) throw new SendError(`Server membalas dengan kode HTTP ${response.status}.`);
    let reply;
    try {
      reply = JSON.parse(text);
    } catch {
      throw new SendError(
        'Balasan server bukan JSON. Periksa bahwa URL berakhiran "/exec" dan Web App di-deploy dengan akses "Siapa saja" (Anyone).'
      );
    }
    if (reply?.ok !== true) throw new SendError(`Server menolak data: ${reply?.error ?? "tanpa keterangan"}.`);
  } finally {
    clearTimeout(timer);
  }
}

const CONSENT_VERSION_COLUMN = LOG_COLUMNS.indexOf("consentVersion");

/**
 * Rows that may leave the device: never those recorded under a placeholder
 * consent text, even after the final text is in place (D-52). Filtered rows
 * are still marked as processed, so they stay only in the local log and CSV.
 */
export function sendableRows(rows) {
  return rows.filter((row) => !isPlaceholderConsentVersion(row[CONSENT_VERSION_COLUMN]));
}

/** Send all unsent rows now. Safe to call at any time. */
export async function flushLog() {
  if (!isRemoteLogEnabled() || blockedReason || status.sending) return;
  if (globalThis.navigator?.onLine === false) {
    status.lastError = "Perangkat sedang offline. Log tetap tersimpan dan akan dikirim saat jaringan kembali.";
    notify();
    return;
  }
  status.sending = true;
  status.lastAttemptAt = new Date().toISOString();
  notify();
  try {
    for (;;) {
      const batch = getUnsentBatch(LOG_REMOTE_BATCH_SIZE);
      if (!batch.rows.length) break;
      const rows = sendableRows(batch.rows);
      if (rows.length) await postBatch(rows);
      markSent(batch);
      status.lastSuccessAt = new Date().toISOString();
      status.lastError = null;
      notify();
    }
  } catch (err) {
    status.lastError = describeError(err);
  } finally {
    status.sending = false;
    notify();
  }
}

/** Debounced flush, called after every logged answer. */
export function scheduleFlush() {
  if (!isRemoteLogEnabled() || blockedReason) return;
  clearTimeout(flushTimer);
  flushTimer = setTimeout(flushLog, FLUSH_DELAY_MS);
}

/**
 * Start background sending: now, when the network returns, and periodically.
 * @param {{blockedReason?: string|null}} [options] a reason forces sending off for this page
 */
export function startLogSender({ blockedReason: reason = null } = {}) {
  blockedReason = reason;
  if (started || !isRemoteLogEnabled() || blockedReason) return;
  started = true;
  window.addEventListener("online", flushLog);
  setInterval(() => {
    if (getLogStatus().unsentRows > 0) flushLog();
  }, LOG_REMOTE_RETRY_MS);
  flushLog();
}
