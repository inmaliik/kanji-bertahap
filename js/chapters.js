// Minna no Nihongo chapter information of a level, derived from its kotoba.
// Chapters are informational only: level order follows the Hyouki course
// (array order in content.json), not the textbook (DECISIONS D-39).
// Pure module: used by the validator (Node) and the UI.

const isChapter = (value) => Number.isInteger(value);

/** Sorted unique chapters of the level's kotoba, ignoring kotoba outside the book. */
export function kotobaChapters(level) {
  const chapters = (level.kotoba ?? []).map((k) => k?.chapter).filter(isChapter);
  return [...new Set(chapters)].sort((a, b) => a - b);
}

/** The level's chapter: the smallest chapter among its kotoba, or null. */
export function levelChapter(level) {
  return kotobaChapters(level)[0] ?? null;
}

/** True if at least one kotoba of the level is marked as outside the book. */
export function hasKotobaOutsideBook(level) {
  return (level.kotoba ?? []).some((k) => k && k.chapter === null);
}

/** Label for cards and previews, e.g. "Minna bab 3, 6, 13" or "Minna bab 1 · di luar buku". */
export function chaptersLabel(level) {
  const chapters = kotobaChapters(level);
  const parts = [];
  if (chapters.length) parts.push(`Minna bab ${chapters.join(", ")}`);
  if (hasKotobaOutsideBook(level)) parts.push(chapters.length ? "di luar buku" : "Di luar buku Minna");
  return parts.join(" · ");
}

/** Chapters of the level above `limit` (kotoba the class has not reached yet). */
export function chaptersAbove(level, limit) {
  return kotobaChapters(level).filter((c) => c > limit);
}
