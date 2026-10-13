// Shared test helpers. Tests run with Node's built-in runner: node --test tests/

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("..", import.meta.url));
export const jsModule = (name, fresh = "") => new URL(`../js/${name}${fresh ? `?${fresh}` : ""}`, import.meta.url).href;

/** data/content.json: schema v2 sample (region B06). */
export function loadSampleContent() {
  return JSON.parse(readFileSync(new URL("../data/content.json", import.meta.url), "utf8"));
}

/**
 * The schema v1 sample (three levels) kept in arsip/. Used only by the
 * v1 session-rule tests until step 2 replaces that engine.
 */
export function loadV1Archive() {
  return JSON.parse(readFileSync(new URL("../arsip/content-v1.json", import.meta.url), "utf8"));
}

export const clone = (value) => JSON.parse(JSON.stringify(value));

/** Deterministic Math.random replacement. */
export function seededRandom(seed = 7) {
  let state = seed;
  return () => (state = (state * 16807) % 2147483647) / 2147483647;
}

/** In-memory localStorage with an optional size limit in characters. */
export class MemoryStorage {
  constructor(limit = Infinity) {
    this.map = new Map();
    this.limit = limit;
  }
  get length() {
    return this.map.size;
  }
  key(i) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setItem(key, value) {
    const others = [...this.map].reduce((n, [k, v]) => n + (k === key ? 0 : k.length + v.length), 0);
    if (others + key.length + value.length > this.limit) {
      const err = new Error("quota exceeded");
      err.name = "QuotaExceededError";
      throw err;
    }
    this.map.set(key, String(value));
  }
  removeItem(key) {
    this.map.delete(key);
  }
  used() {
    return [...this.map].reduce((n, [k, v]) => n + k.length + v.length, 0);
  }
}
