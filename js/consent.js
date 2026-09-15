// Consent text for recording answers (data/consent.json). The wording must be
// approved by the thesis supervisor, so it lives in data, not in code (D-50).

/**
 * Consent text versions starting with this prefix are placeholders. Answers
 * recorded under them never leave the device (D-52).
 */
export const PLACEHOLDER_VERSION_PREFIX = "placeholder";
export const isPlaceholderConsentVersion = (version) =>
  typeof version === "string" && version.startsWith(PLACEHOLDER_VERSION_PREFIX);

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isText = (v) => typeof v === "string" && v.trim() !== "";

/** @returns {string[]} problems, empty when the text is usable */
export function validateConsentText(data) {
  const problems = [];
  if (!isPlainObject(data)) return ["Isi file harus berupa objek JSON { ... }."];
  if (!isText(data.version)) problems.push('"version" wajib diisi, misalnya "v1-2026-10".');
  if (!isText(data.title)) problems.push('"title" wajib diisi.');
  if ("isPlaceholder" in data && typeof data.isPlaceholder !== "boolean") problems.push('"isPlaceholder" harus true atau false.');
  if (isText(data.version) && Boolean(data.isPlaceholder) !== isPlaceholderConsentVersion(data.version)) {
    problems.push(
      `"isPlaceholder" dan "version" tidak cocok: teks sementara harus berversi diawali "${PLACEHOLDER_VERSION_PREFIX}", ` +
        `dan teks final tidak boleh berversi diawali "${PLACEHOLDER_VERSION_PREFIX}".`
    );
  }
  if (!Array.isArray(data.sections) || data.sections.length === 0) {
    problems.push('"sections" harus berisi minimal satu bagian.');
  } else {
    data.sections.forEach((section, i) => {
      if (!isPlainObject(section) || !isText(section.heading)) problems.push(`Bagian #${i + 1}: "heading" wajib diisi.`);
      if (!Array.isArray(section?.paragraphs) || !section.paragraphs.length || !section.paragraphs.every(isText)) {
        problems.push(`Bagian #${i + 1}: "paragraphs" harus berisi minimal satu paragraf teks.`);
      }
    });
  }
  return problems;
}

/** @returns {Promise<{text: object|null, error: string|null}>} */
export async function loadConsentText(url) {
  try {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) return { text: null, error: `File ${url} tidak bisa diambil (HTTP ${response.status}).` };
    const data = JSON.parse(await response.text());
    const problems = validateConsentText(data);
    return problems.length ? { text: null, error: `File ${url} tidak valid: ${problems.join(" ")}` } : { text: data, error: null };
  } catch (err) {
    return { text: null, error: `File ${url} tidak bisa dibaca: ${err.message}` };
  }
}
