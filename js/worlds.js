// Worlds: the layer above regions (D-116, D-117). A world is one book of
// みんなの日本語 and covers a fixed range of chapters; a region belongs to the
// world whose range holds its chapter, so the content never names its world.
// Worlds open freely; regions inside a world open one after another.
// Pure module: used by the validator (Node) and the UI.

export const WORLDS = Object.freeze([
  Object.freeze({ number: 1, id: "D1", book: "初級I", bookLabel: "bookTitle", from: 1, to: 25 }),
  Object.freeze({ number: 2, id: "D2", book: "初級II", bookLabel: "bookTitle2", from: 26, to: 50 }),
]);

/** The world whose range holds `chapter`, or null outside every world. */
export const worldOf = (chapter) => WORLDS.find((w) => Number.isInteger(chapter) && chapter >= w.from && chapter <= w.to) ?? null;

/** Every chapter of the world, from its first to its last. */
export const worldChapters = (world) => Array.from({ length: world.to - world.from + 1 }, (_, i) => world.from + i);

/**
 * Chapters as short ranges: [1, 2, 3, 5] → "1–3, 5".
 * @param {number[]} chapters
 */
export function chapterRanges(chapters) {
  const sorted = [...new Set(chapters)].sort((a, b) => a - b);
  const ranges = [];
  for (const c of sorted) {
    const last = ranges.at(-1);
    if (last && c === last[1] + 1) last[1] = c;
    else ranges.push([c, c]);
  }
  return ranges.map(([a, b]) => (a === b ? `${a}` : `${a}–${b}`)).join(", ");
}
