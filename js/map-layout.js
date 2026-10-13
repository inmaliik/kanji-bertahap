// The map as a column of image segments joined top to bottom (D-108).
// data/map.json lists the segments in order; segment n of the list is the
// file assets/peta/<name>.png (the "potongan-peta" slot of data/assets.json).
// A region's pin names its segment (1 = top) and a position in percent of
// that segment. Adding a chapter means adding one segment at the bottom.

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const NAME = /^[a-z0-9][a-z0-9-]*$/;

/** Locations per segment for regions whose pin is not filled in yet. */
export const TEMPORARY_PER_SEGMENT = 3;

/** @returns {string[]} problems; an empty list means the file is usable */
export function validateMapLayout(data) {
  if (!isPlainObject(data) || !Array.isArray(data.segments)) return ['Isi file harus berupa { "segments": ["potongan-01", ...] }.'];
  const problems = [];
  if (!data.segments.length) problems.push("Daftar potongan kosong; minimal satu potongan.");
  const seen = new Set();
  data.segments.forEach((name, i) => {
    if (typeof name !== "string" || !NAME.test(name)) problems.push(`Potongan ke-${i + 1}: nama berkas harus huruf kecil latin, angka, dan "-", tanpa .png.`);
    else if (seen.has(name)) problems.push(`Potongan ke-${i + 1}: "${name}" sudah dipakai di atasnya.`);
    seen.add(name);
  });
  return problems;
}

/** @returns {Promise<{layout: {segments: string[]}, problems: string[]}>} never rejects; falls back to one segment */
export async function loadMapLayout(url) {
  const fallback = { segments: ["potongan-01"] };
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
 * Where each region sits. Regions without a pin get a temporary place,
 * three per segment in play order, zigzagging down.
 * @returns {{places: Array<{segment: number, x: number, y: number, temporary: boolean}>, segmentCount: number}}
 */
export function placeLocations(regions, layout) {
  const places = regions.map((region, i) => {
    if (region.pin) return { ...region.pin, temporary: false };
    const k = i % TEMPORARY_PER_SEGMENT;
    return { segment: Math.floor(i / TEMPORARY_PER_SEGMENT) + 1, x: k % 2 ? 30 : 70, y: 25 + k * 30, temporary: true };
  });
  const segmentCount = Math.max(layout.segments.length, ...places.map((p) => p.segment), 1);
  return { places, segmentCount };
}

/** A place in percent of the whole column (all segments have the same size). */
export const columnPoint = (place, segmentCount) => ({ x: place.x, y: ((place.segment - 1 + place.y / 100) / segmentCount) * 100 });

/** Pins pointing below the last listed segment: the map draws an unlisted placeholder there. */
export function unlistedSegments(regions, layout) {
  return regions.filter((r) => r.pin && r.pin.segment > layout.segments.length).map((r) => ({ region: r, segment: r.pin.segment }));
}
