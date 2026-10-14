// The map as a column of image segments joined top to bottom (D-108). Every
// world has its own map (D-117): data/map.json lists the segments of each
// world in order; segment n of a world's list is the file
// assets/peta/<name>.png (the "potongan-peta" slot of data/assets.json).
// A region's pin names its segment (1 = top of its world's map) and a
// position in percent of that segment. Adding a chapter means adding one
// segment at the bottom of its world. A world may also give default pins per
// chapter ("pins": { "1": { "segment": 1, "x": 34, "y": 75 } }), used while the
// wilayah tab leaves a region's pin empty; the tab always wins.

import { WORLDS } from "./worlds.js";

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const NAME = /^[a-z0-9][a-z0-9-]*$/;

/** Used when data/map.json cannot be read. */
export const FALLBACK_LAYOUT = Object.freeze({ worlds: [{ world: 1, segments: ["potongan-01"] }] });

/** Segment names of one world; empty when the world is not listed yet. */
export const segmentsOf = (layout, world) => layout.worlds.find((w) => w.world === world)?.segments ?? [];

/** Default pins of one world, by chapter number; empty when it has none. */
export const defaultPinsOf = (layout, world) => layout.worlds.find((w) => w.world === world)?.pins ?? {};

/** Locations per segment for regions whose pin is not filled in yet. */
export const TEMPORARY_PER_SEGMENT = 3;

/** @returns {string[]} problems; an empty list means the file is usable */
export function validateMapLayout(data) {
  const shape = 'Isi file harus berupa { "worlds": [ { "world": 1, "segments": ["potongan-01", ...] } ] }.';
  if (!isPlainObject(data) || !Array.isArray(data.worlds)) return [shape];
  const problems = [];
  if (!data.worlds.length) problems.push("Daftar dunia kosong; minimal satu dunia.");
  const worlds = new Set();
  const names = new Set();
  data.worlds.forEach((entry, k) => {
    if (!isPlainObject(entry) || !Array.isArray(entry.segments)) {
      problems.push(`Dunia ke-${k + 1}: ${shape}`);
      return;
    }
    const where = WORLDS.some((w) => w.number === entry.world) ? `Dunia ${entry.world}` : `Dunia ke-${k + 1}`;
    if (!WORLDS.some((w) => w.number === entry.world)) problems.push(`${where}: "world" harus salah satu dari ${WORLDS.map((w) => w.number).join(", ")}.`);
    else if (worlds.has(entry.world)) problems.push(`${where} sudah didaftar di atasnya.`);
    worlds.add(entry.world);
    if (!entry.segments.length) problems.push(`${where}: daftar potongan kosong; minimal satu potongan.`);
    entry.segments.forEach((name, i) => {
      if (typeof name !== "string" || !NAME.test(name)) problems.push(`${where}, potongan ke-${i + 1}: nama berkas harus huruf kecil latin, angka, dan "-", tanpa .png.`);
      else if (names.has(name)) problems.push(`${where}, potongan ke-${i + 1}: "${name}" sudah dipakai di atasnya.`);
      names.add(name);
    });
    if (entry.pins !== undefined) {
      if (!isPlainObject(entry.pins)) problems.push(`${where}: "pins" harus berupa { "<bab>": { "segment": 1, "x": 50, "y": 50 } }.`);
      else {
        for (const [chapter, pin] of Object.entries(entry.pins)) {
          const ok = /^[1-9][0-9]*$/.test(chapter) && isPlainObject(pin) && Number.isInteger(pin.segment) && pin.segment >= 1 &&
            [pin.x, pin.y].every((v) => typeof v === "number" && v >= 0 && v <= 100);
          if (!ok) problems.push(`${where}, pin bawaan bab ${chapter}: harus { "segment": nomor potongan (1 = paling atas), "x": 0–100, "y": 0–100 }.`);
        }
      }
    }
  });
  return problems;
}

/** @returns {Promise<{layout: {worlds: Array<{world: number, segments: string[]}>}, problems: string[]}>} never rejects; falls back to one segment */
export async function loadMapLayout(url) {
  const fallback = FALLBACK_LAYOUT;
  try {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) return { layout: fallback, problems: [`File ${url} tidak bisa diambil (HTTP ${response.status}).`] };
    const data = JSON.parse(await response.text());
    const problems = validateMapLayout(data);
    return { layout: problems.length ? fallback : data, problems };
  } catch (err) {
    return { layout: fallback, problems: [`File ${url} tidak bisa dibaca: ${err.message}`] };
  }
}

/**
 * Where each region of one world sits: its pin from the wilayah tab, else the
 * world's default pin for its chapter, else a temporary place, three per
 * segment in play order, zigzagging down.
 * @param {object[]} regions the regions of one world
 * @param {string[]} segments that world's segment names (segmentsOf)
 * @param {Record<string, {segment: number, x: number, y: number}>} [defaults] defaultPinsOf
 * @returns {{places: Array<{segment: number, x: number, y: number, temporary: boolean}>, segmentCount: number}}
 */
export function placeLocations(regions, segments, defaults = {}) {
  const places = regions.map((region, i) => {
    if (region.pin) return { ...region.pin, temporary: false };
    const fallback = defaults[String(region.chapter)];
    if (fallback) return { segment: fallback.segment, x: fallback.x, y: fallback.y, temporary: false };
    const k = i % TEMPORARY_PER_SEGMENT;
    return { segment: Math.floor(i / TEMPORARY_PER_SEGMENT) + 1, x: k % 2 ? 30 : 70, y: 25 + k * 30, temporary: true };
  });
  const segmentCount = Math.max(segments.length, ...places.map((p) => p.segment), 1);
  return { places, segmentCount };
}

/** A place in percent of the whole column (all segments have the same size). */
export const columnPoint = (place, segmentCount) => ({ x: place.x, y: ((place.segment - 1 + place.y / 100) / segmentCount) * 100 });

/** Pins pointing below the last listed segment of their world: the map draws an unlisted placeholder there. */
export function unlistedSegments(regions, layout) {
  return regions
    .filter((r) => r.pin && r.pin.segment > segmentsOf(layout, r.world).length)
    .map((r) => ({ region: r, segment: r.pin.segment, listed: segmentsOf(layout, r.world).length }));
}
