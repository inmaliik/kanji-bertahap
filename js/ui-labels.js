// Japanese interface labels (data/ui.json, D-76). Labels are written with the
// same furigana markup as the material and always shown with furigana; the
// player's furigana setting applies to the material only. An optional
// Indonesian gloss is shown small next to the label.

import { h, ja } from "./dom.js";
import { parseRuby, renderRuby, RubySyntaxError } from "./ruby.js";
import { isKanji } from "./jp-text.js";

/** Labels the code uses, with the Indonesian text shown if a label is missing. */
export const UI_LABEL_FALLBACKS = Object.freeze({
  review: "Ulangan wilayah",
  onyomi: "On'yomi",
  kunyomi: "Kun'yomi",
  bushu: "Bushu",
  strokeCount: "Jumlah guratan",
  strokeOrder: "Cara menulis",
  jukugo: "Kata majemuk",
  example: "Contoh kalimat",
  bookTitle: "Minna no Nihongo Shokyu I",
});

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** @returns {string[]} problems, empty when the file is usable */
export function validateUiLabels(data) {
  if (!isPlainObject(data) || !isPlainObject(data.labels)) return ['Isi file harus berupa { "labels": { ... } }.'];
  const problems = [];
  for (const key of Object.keys(UI_LABEL_FALLBACKS)) {
    if (!(key in data.labels)) problems.push(`Label "${key}" tidak ada; aplikasi memakai teks Indonesia "${UI_LABEL_FALLBACKS[key]}".`);
  }
  for (const [key, label] of Object.entries(data.labels)) {
    if (!(key in UI_LABEL_FALLBACKS)) problems.push(`Label "${key}" tidak dipakai aplikasi. Periksa salah ketik.`);
    if (!isPlainObject(label) || typeof label.ja !== "string" || !label.ja.trim()) {
      problems.push(`Label "${key}": "ja" wajib diisi teks Jepang dengan furigana.`);
      continue;
    }
    if (label.id !== undefined && (typeof label.id !== "string" || !label.id.trim())) problems.push(`Label "${key}": "id" harus teks, atau dihapus.`);
    try {
      const { segments } = parseRuby(label.ja);
      const bare = segments.filter((s) => s.ruby === null).flatMap((s) => Array.from(s.text)).filter(isKanji);
      if (bare.length) problems.push(`Label "${key}": kanji tanpa furigana (${bare.join(" ")}). Label selalu tampil berfurigana.`);
    } catch (err) {
      if (!(err instanceof RubySyntaxError)) throw err;
      problems.push(`Label "${key}": sintaks furigana salah: ${err.message}`);
    }
  }
  return problems;
}

/** @returns {Promise<{labels: object, problems: string[]}>} never rejects */
export async function loadUiLabels(url) {
  try {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) return { labels: {}, problems: [`File ${url} tidak bisa diambil (HTTP ${response.status}).`] };
    const data = JSON.parse(await response.text());
    const problems = validateUiLabels(data);
    const labels = {};
    for (const [key, label] of Object.entries(isPlainObject(data?.labels) ? data.labels : {})) {
      try {
        labels[key] = { segments: parseRuby(label.ja).segments, gloss: typeof label.id === "string" ? label.id : null };
      } catch {
        // Reported by validateUiLabels; the fallback text is used.
      }
    }
    return { labels, problems };
  } catch (err) {
    return { labels: {}, problems: [`File ${url} tidak bisa dibaca: ${err.message}`] };
  }
}

/**
 * A label: Japanese with furigana plus the small Indonesian gloss, or the
 * Indonesian fallback when data/ui.json lacks it.
 * @param {{labels: object}} app
 * @param {string} key
 * @param {{gloss?: boolean}} [options]
 */
export function uiLabel(app, key, { gloss = true } = {}) {
  const label = app.uiLabels?.[key];
  if (!label) return h("span", { class: "ui-label" }, UI_LABEL_FALLBACKS[key] ?? key);
  return h(
    "span",
    { class: "ui-label" },
    ja("span", { class: "ui-label__ja" }, renderRuby(label.segments)),
    gloss && label.gloss ? h("span", { class: "ui-label__gloss" }, ` ${label.gloss}`) : null
  );
}
