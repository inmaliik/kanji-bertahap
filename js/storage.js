// localStorage wrapper that never throws. Storage can be unavailable (private
// browsing, disabled site data) or full; the game must keep running anyway.
// The backend is injectable so the pure modules can be tested in Node.

let backend = null;
let lastError = null;

function defaultBackend() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // Accessing localStorage itself can throw when site data is blocked.
  }
}

export function setStorageBackend(storage) {
  backend = storage;
}

function store() {
  if (backend === null) backend = defaultBackend();
  return backend;
}

export function readJson(key) {
  try {
    const raw = store()?.getItem(key);
    if (raw === null || raw === undefined) return { ok: true, value: null };
    return { ok: true, value: JSON.parse(raw) };
  } catch (err) {
    lastError = err;
    return { ok: false, value: null, raw: safeRaw(key), error: err };
  }
}

function safeRaw(key) {
  try {
    return store()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** @returns {boolean} true if the value was written */
export function writeJson(key, value) {
  try {
    const s = store();
    if (!s) return false;
    s.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    lastError = err; // Usually QuotaExceededError.
    return false;
  }
}

export function writeRaw(key, raw) {
  try {
    store()?.setItem(key, raw);
    return true;
  } catch (err) {
    lastError = err;
    return false;
  }
}

export function removeKey(key) {
  try {
    store()?.removeItem(key);
  } catch (err) {
    lastError = err;
  }
}

/** Characters used by keys starting with `prefix` (keys and values). */
export function usedChars(prefix) {
  try {
    const s = store();
    if (!s) return 0;
    let total = 0;
    for (let i = 0; i < s.length; i++) {
      const key = s.key(i);
      if (key?.startsWith(prefix)) total += key.length + (s.getItem(key)?.length ?? 0);
    }
    return total;
  } catch {
    return 0;
  }
}

export function isStorageAvailable() {
  return store() !== null;
}

export function getLastStorageError() {
  return lastError;
}
