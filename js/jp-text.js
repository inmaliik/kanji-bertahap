// Character classification helpers for Japanese text.
// Pure module: no DOM access, so it can be imported by Node tools as well.

function codePoint(ch) {
  return ch.codePointAt(0);
}

export function isHiragana(ch) {
  const c = codePoint(ch);
  return c >= 0x3041 && c <= 0x309f;
}

export function isKatakana(ch) {
  const c = codePoint(ch);
  // Includes the prolonged sound mark (ー) and middle dot (・).
  return (c >= 0x30a0 && c <= 0x30ff) || (c >= 0x31f0 && c <= 0x31ff);
}

export function isKana(ch) {
  return isHiragana(ch) || isKatakana(ch);
}

export function isKanji(ch) {
  const c = codePoint(ch);
  return (
    (c >= 0x4e00 && c <= 0x9fff) || // CJK Unified Ideographs
    (c >= 0x3400 && c <= 0x4dbf) || // Extension A
    (c >= 0xf900 && c <= 0xfaff) || // Compatibility Ideographs
    (c >= 0x20000 && c <= 0x2fa1f) || // Extensions B+ and supplement
    c === 0x3005 || // 々 iteration mark
    c === 0x3006 // 〆
  );
}

// Kangxi Radicals and CJK Radicals Supplement blocks. Characters here often
// render as missing glyphs on older phones and do not match the unified
// ideograph that learners see in dictionaries.
export function isRadicalBlock(ch) {
  const c = codePoint(ch);
  return c >= 0x2e80 && c <= 0x2fdf;
}

export function isSingleChar(str) {
  return typeof str === "string" && Array.from(str).length === 1;
}

export function isAllKana(str) {
  return Array.from(str).every(isKana);
}

export function containsKanji(str) {
  return Array.from(str).some(isKanji);
}

export function toHiragana(str) {
  return Array.from(str)
    .map((ch) => {
      const c = codePoint(ch);
      return c >= 0x30a1 && c <= 0x30f6 ? String.fromCodePoint(c - 0x60) : ch;
    })
    .join("");
}
