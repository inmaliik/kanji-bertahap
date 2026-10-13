// Layered figures (D-121): the cats now, the player's character later with the
// same mechanism. data/layers.json lists every layer the asset team draws on
// one shared canvas (the template in templat/):
//
//   bodies       a fill (the shape only; its transparency is the mask) and a
//                line (ink outline and shading, stacked on top), plus the
//                anchor points where accessories sit, in canvas pixels
//   patterns     drawn over the whole body zone and cut to each body by the
//                fill's mask, so one pattern fits every body
//   accessories  a canvas half the size, whose center sits on a body anchor
//   colors       fur colors: the fill is painted in this color. With no
//                colors, the fill is shown as drawn (the 12-file option, D-116);
//                switching between the two is a data change only.
//
// A layer may have no file ("polos", "tanpa"): it still counts as a choice.
// Pure except loadLayers().

import { PLACEHOLDER_ACCESSORIES, PLACEHOLDER_BODIES, PLACEHOLDER_PATTERNS } from "./cat-placeholders.js";

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const ID = /^[a-z0-9][a-z0-9-]*$/;
const PATH = /^assets\/[A-Za-z0-9_./-]+\.png$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
const INK = "#403c3c";

/** Accessory canvas as a share of the body canvas. */
export const ACCESSORY_SCALE = 0.5;

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** @returns {{problems: string[], warnings: string[]}} problems make the file unusable */
export function validateLayers(data) {
  const problems = [];
  const warnings = [];
  if (!isPlainObject(data) || !isPlainObject(data.canvas) || !isPlainObject(data.cat)) {
    return { problems: ['Isi file harus berupa { "canvas": { "width", "height" }, "cat": { ... } }.'], warnings };
  }
  const { width, height } = data.canvas;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 64 || height < 64) problems.push('"canvas" harus { "width", "height" } dalam piksel, misalnya 512.');
  const cat = data.cat;
  const ids = (list, what) => {
    const seen = new Set();
    for (const [i, item] of list.entries()) {
      if (!isPlainObject(item) || typeof item.id !== "string" || !ID.test(item.id)) problems.push(`${what} #${i + 1}: "id" harus huruf kecil latin, angka, dan "-".`);
      else if (seen.has(item.id)) problems.push(`${what} "${item.id}" ditulis dua kali.`);
      else seen.add(item.id);
    }
  };
  const file = (value, where, { optional }) => {
    if (value === null && optional) return;
    if (typeof value !== "string" || !PATH.test(value)) problems.push(`${where}: harus jalur berkas PNG di assets/, misalnya assets/kucing/tubuh/duduk-isi.png${optional ? ", atau null untuk pilihan tanpa gambar" : ""}.`);
  };
  for (const key of ["bodies", "patterns", "accessories"]) {
    if (!Array.isArray(cat[key]) || !cat[key].length) problems.push(`"cat.${key}" harus daftar dengan minimal satu pilihan.`);
  }
  if (problems.length) return { problems, warnings };
  if (cat.colors !== undefined && !Array.isArray(cat.colors)) problems.push('"cat.colors" harus daftar warna, atau dihapus jika tubuh digambar berwarna.');

  ids(cat.bodies, "Tubuh");
  ids(cat.patterns, "Corak");
  ids(cat.accessories, "Aksesori");
  if (Array.isArray(cat.colors)) ids(cat.colors, "Warna");
  const inCanvas = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite) && p[0] >= 0 && p[0] <= width && p[1] >= 0 && p[1] <= height;
  for (const body of cat.bodies.filter(isPlainObject)) {
    file(body.fill, `Tubuh ${body.id} › fill`, { optional: false });
    file(body.line, `Tubuh ${body.id} › line`, { optional: false });
    if (!isPlainObject(body.anchors)) problems.push(`Tubuh ${body.id}: "anchors" wajib, misalnya { "kepala": [256, 86], "leher": [256, 262] }.`);
    else {
      for (const [name, point] of Object.entries(body.anchors)) {
        if (!inCanvas(point)) problems.push(`Tubuh ${body.id} › anchors.${name}: harus [x, y] dalam piksel kanvas 0–${width} dan 0–${height}.`);
      }
    }
  }
  for (const p of cat.patterns.filter(isPlainObject)) file(p.image, `Corak ${p.id} › image`, { optional: true });
  for (const a of cat.accessories.filter(isPlainObject)) {
    file(a.image, `Aksesori ${a.id} › image`, { optional: true });
    if (a.image === null) continue;
    const missing = cat.bodies.filter((b) => isPlainObject(b) && !(isPlainObject(b.anchors) && a.anchor in b.anchors)).map((b) => b.id);
    if (typeof a.anchor !== "string") problems.push(`Aksesori ${a.id}: "anchor" wajib, nama titik jangkar tubuh, misalnya "leher".`);
    else if (missing.length) problems.push(`Aksesori ${a.id} memakai titik "${a.anchor}", yang tidak ada di tubuh ${missing.join(", ")}.`);
  }
  for (const c of (cat.colors ?? []).filter(isPlainObject)) {
    if (typeof c.hex !== "string" || !HEX.test(c.hex)) problems.push(`Warna ${c.id}: "hex" harus kode warna seperti #F7E4C8.`);
    else if (contrast(c.hex, INK) < 3) warnings.push(`Warna ${c.id} (${c.hex}) terlalu gelap: garis tinta di atasnya hanya ${contrast(c.hex, INK).toFixed(1)}:1, kurang dari 3:1.`);
  }
  return { problems, warnings };
}

/** Number of different cats the layers allow. */
export function combinationCount(layers) {
  const { bodies, patterns, accessories, colors = [] } = layers.cat;
  return bodies.length * patterns.length * accessories.length * Math.max(1, colors.length);
}

/** Whether fur colors come from data (the 9-file option) or from the drawn fill (the 12-file option). */
export const usesColors = (layers) => Array.isArray(layers?.cat?.colors) && layers.cat.colors.length > 0;

/**
 * The layer files of one cat, with stand-ins for files not delivered yet.
 * @param {object} layers data/layers.json
 * @param {{body: string, pattern: string, accessory: string, color?: string|null}} choice
 * @param {Set<string>} available files that exist
 * @returns {{fill: string, line: string, pattern: string|null, accessory: {image: string, x: number, y: number}|null, color: string|null}}
 */
export function resolveCat(layers, choice, available) {
  const { bodies, patterns, accessories, colors = [] } = layers.cat;
  const pick = (list, id) => Math.max(0, list.findIndex((item) => item.id === id));
  const bi = pick(bodies, choice.body);
  const body = bodies[bi];
  const pi = pick(patterns, choice.pattern);
  const ai = pick(accessories, choice.accessory);
  const use = (path, standIn) => (path && available.has(path) ? path : standIn);
  // Stand-ins follow the position among the choices that have a file.
  const drawn = (list, i) => list.slice(0, i + 1).filter((item) => item.image !== null).length - 1;
  const pattern = patterns[pi].image === null ? null : use(patterns[pi].image, PLACEHOLDER_PATTERNS[drawn(patterns, pi) % PLACEHOLDER_PATTERNS.length]);
  const acc = accessories[ai];
  const anchor = acc.image === null ? null : body.anchors[acc.anchor];
  const color = usesColors(layers) ? (colors.find((c) => c.id === choice.color) ?? colors[0]).hex : null;
  return {
    fill: use(body.fill, PLACEHOLDER_BODIES[bi % PLACEHOLDER_BODIES.length].fill),
    line: use(body.line, PLACEHOLDER_BODIES[bi % PLACEHOLDER_BODIES.length].line),
    pattern,
    accessory: anchor
      ? { image: use(acc.image, PLACEHOLDER_ACCESSORIES[drawn(accessories, ai) % PLACEHOLDER_ACCESSORIES.length]), x: anchor[0] / layers.canvas.width, y: anchor[1] / layers.canvas.height }
      : null,
    color,
  };
}

/** Every file listed in the layers, for the asset check. */
export function layerFiles(layers) {
  const { bodies, patterns, accessories } = layers.cat;
  return [
    ...bodies.flatMap((b) => [{ kind: "tubuh (isi)", id: b.id, path: b.fill }, { kind: "tubuh (garis)", id: b.id, path: b.line }]),
    ...patterns.filter((p) => p.image).map((p) => ({ kind: "corak", id: p.id, path: p.image })),
    ...accessories.filter((a) => a.image).map((a) => ({ kind: "aksesori", id: a.id, path: a.image })),
  ];
}

/**
 * @returns {Promise<{layers: object|null, available: Set<string>, problems: string[], warnings: string[]}>}
 *   never rejects; `available` holds the layer files that exist on the server
 */
export async function loadLayers(url) {
  const none = (problems) => ({ layers: null, available: new Set(), problems, warnings: [] });
  let data;
  try {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) return none([`File ${url} tidak bisa diambil (HTTP ${response.status}).`]);
    data = JSON.parse(await response.text());
  } catch (err) {
    return none([`File ${url} tidak bisa dibaca: ${err.message}`]);
  }
  const { problems, warnings } = validateLayers(data);
  if (problems.length) return { ...none(problems), warnings };
  // Which drawings exist: the rest are shown with stand-ins (D-121).
  const checks = await Promise.all(
    layerFiles(data).map(async ({ path }) => {
      try {
        const response = await fetch(path, { method: "HEAD", cache: "no-cache" });
        return response.ok ? path : null;
      } catch {
        return null;
      }
    })
  );
  return { layers: data, available: new Set(checks.filter(Boolean)), problems, warnings };
}
