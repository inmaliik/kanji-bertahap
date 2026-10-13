// Loads data/content.json and validates it. Only loadContent() touches the
// network.

import { validateContent } from "./validate.js";

/**
 * Translate a JSON.parse error into an Indonesian message with line/column.
 * Shared with the Node tools.
 */
export function describeJsonError(err, text) {
  const lineCol = /line (\d+) column (\d+)/.exec(err.message);
  let line;
  let column;
  if (lineCol) {
    line = Number(lineCol[1]);
    column = Number(lineCol[2]);
  } else {
    const pos = /position (\d+)/.exec(err.message);
    if (pos) {
      const before = text.slice(0, Number(pos[1])).split("\n");
      line = before.length;
      column = before[before.length - 1].length + 1;
    }
  }
  const where = line ? `baris ${line}, kolom ${column}` : "lokasi tidak diketahui";
  return {
    line,
    column,
    message:
      `Format JSON rusak di ${where}. Penyebab paling sering: koma hilang atau berlebih ` +
      `di akhir baris, atau tanda kutip yang tidak ditutup. (Pesan asli: ${err.message})`,
  };
}

/**
 * @returns {Promise<{content: object|null, errors: Array<object>, warnings: Array<object>, notes: Array<object>}>}
 */
export async function loadContent(url) {
  const fail = (message) => ({
    content: null,
    errors: [{ severity: "error", code: "LOAD_FAILED", where: url, path: "", message, prominent: true }],
    warnings: [],
    notes: [],
  });

  let text;
  try {
    // no-cache: edits to content.json show up on a normal reload.
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) return fail(`File tidak bisa diambil (HTTP ${response.status}). Pastikan file ${url} ada.`);
    text = await response.text();
  } catch (err) {
    return fail(`File tidak bisa diambil: ${err.message}`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    return fail(describeJsonError(err, text).message);
  }

  const { errors, warnings, notes } = validateContent(data);
  return { content: errors.length ? null : data, errors, warnings, notes };
}
