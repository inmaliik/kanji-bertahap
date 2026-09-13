// Furigana markup: "[漢字|かんじ]" inside a sentence.
// parseRuby() and alignReading() are pure; renderRuby() needs a DOM and is
// only called in the browser.

import { isKana, toHiragana } from "./jp-text.js";

const OPEN = "[";
const CLOSE = "]";
const SEP = "|";
const FULLWIDTH_MARKS = { "［": OPEN, "］": CLOSE, "｜": SEP };

export class RubySyntaxError extends Error {
  constructor(message, text, charIndex) {
    super(message);
    this.name = "RubySyntaxError";
    this.text = text;
    this.charIndex = charIndex; // 0-based index into Array.from(text)
  }

  // Human-readable excerpt with the offending character marked, e.g.
  // "パンを⟪[⟫食べます". Sentences are short, so a window of 10 chars is enough.
  get excerpt() {
    const chars = Array.from(this.text);
    const i = Math.min(this.charIndex, chars.length);
    const before = chars.slice(Math.max(0, i - 10), i).join("");
    const mark = i < chars.length ? chars[i] : "(akhir teks)";
    const after = chars.slice(i + 1, i + 11).join("");
    const lead = i > 10 ? "…" : "";
    const tail = i + 11 < chars.length ? "…" : "";
    return `${lead}${before}⟪${mark}⟫${after}${tail}`;
  }
}

function fail(message, text, charIndex) {
  throw new RubySyntaxError(message, text, charIndex);
}

/**
 * Parse ruby markup into segments.
 * @returns {{ segments: Array<{text: string, ruby: string|null}>, plain: string }}
 * @throws {RubySyntaxError}
 */
export function parseRuby(text) {
  const chars = Array.from(text);

  const fwIndex = chars.findIndex((ch) => ch in FULLWIDTH_MARKS);
  if (fwIndex !== -1) {
    const ch = chars[fwIndex];
    fail(
      `Tanda "${ch}" adalah versi lebar penuh (dari keyboard Jepang). ` +
        `Gunakan "${FULLWIDTH_MARKS[ch]}" biasa: matikan IME Jepang saat mengetik [ | ].`,
      text,
      fwIndex
    );
  }

  const segments = [];
  let plainText = "";
  let base = null; // null = outside brackets
  let reading = null; // null = separator not seen yet
  let openIndex = -1;

  const pushText = (str) => {
    if (!str) return;
    const last = segments[segments.length - 1];
    if (last && last.ruby === null) last.text += str;
    else segments.push({ text: str, ruby: null });
  };

  chars.forEach((ch, i) => {
    if (base === null) {
      if (ch === OPEN) {
        base = "";
        openIndex = i;
      } else if (ch === CLOSE) {
        fail(`Ada "${CLOSE}" tanpa pasangan "${OPEN}" sebelumnya.`, text, i);
      } else if (ch === SEP) {
        fail(`Ada "${SEP}" di luar kurung. Format yang benar: [漢字|かんじ].`, text, i);
      } else {
        pushText(ch);
        plainText += ch;
      }
      return;
    }

    // Inside brackets.
    if (ch === OPEN) {
      fail(`Ada "${OPEN}" baru sebelum "${OPEN}" sebelumnya ditutup dengan "${CLOSE}".`, text, i);
    } else if (ch === SEP) {
      if (reading !== null) {
        fail(`Satu kurung hanya boleh berisi satu "${SEP}".`, text, i);
      }
      if (base === "") fail(`Bagian kanji sebelum "${SEP}" kosong.`, text, i);
      reading = "";
    } else if (ch === CLOSE) {
      if (reading === null) {
        fail(`Kurung tidak berisi "${SEP}". Format yang benar: [漢字|かんじ].`, text, i);
      }
      if (reading === "") fail(`Bagian furigana setelah "${SEP}" kosong.`, text, i);
      segments.push({ text: base, ruby: reading });
      plainText += base;
      base = null;
      reading = null;
    } else if (reading === null) {
      base += ch;
    } else {
      reading += ch;
    }
  });

  if (base !== null) {
    fail(`Ada "${OPEN}" yang tidak ditutup dengan "${CLOSE}".`, text, openIndex);
  }

  return { segments, plain: plainText };
}

/**
 * Split a word into kanji/kana runs and assign each kanji run its part of
 * the reading, anchored on the kana runs. E.g. 食べます + たべます →
 * [{食, た}, {べます, null}].
 * @returns {Array<{text: string, ruby: string|null}> | null} null if the kana
 *   parts of the word do not appear in the reading.
 */
export function alignReading(word, reading) {
  const runs = [];
  for (const ch of Array.from(word)) {
    const kana = isKana(ch);
    const last = runs[runs.length - 1];
    if (last && last.kana === kana) last.text += ch;
    else runs.push({ text: ch, kana });
  }

  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = runs
    .map((run) => (run.kana ? `(${escape(toHiragana(run.text))})` : "(.+?)"))
    .join("");
  const match = new RegExp(`^${pattern}$`, "u").exec(toHiragana(reading));
  if (!match) return null;

  // Slice the original reading (hiragana conversion keeps lengths intact) so
  // katakana in the reading is preserved.
  let offset = 0;
  return runs.map((run, i) => {
    const len = match[i + 1].length;
    const part = reading.slice(offset, offset + len);
    offset += len;
    return { text: run.text, ruby: run.kana ? null : part };
  });
}

/**
 * Build DOM nodes for ruby segments.
 * @param {Array<{text: string, ruby: string|null}>} segments
 * @param {object} [options]
 * @param {{start: number, end: number}} [options.range] plain-text range to wrap
 * @param {(fragment: DocumentFragment) => Node} [options.wrap] receives the
 *   nodes inside `range` and returns the node to insert instead
 */
export function renderRuby(segments, { range = null, wrap = (fragment) => fragment } = {}) {
  const out = document.createDocumentFragment();
  let inner = null;
  let pos = 0;

  const target = (at) => {
    if (range && at >= range.start && at < range.end) {
      if (!inner) inner = document.createDocumentFragment();
      return inner;
    }
    if (inner) {
      out.appendChild(wrap(inner));
      inner = null;
    }
    return out;
  };

  const rubyNode = (seg) => {
    const ruby = document.createElement("ruby");
    ruby.append(seg.text);
    const rpOpen = document.createElement("rp");
    rpOpen.textContent = "(";
    const rt = document.createElement("rt");
    rt.textContent = seg.ruby;
    const rpClose = document.createElement("rp");
    rpClose.textContent = ")";
    ruby.append(rpOpen, rt, rpClose);
    return ruby;
  };

  for (const seg of segments) {
    if (seg.ruby !== null) {
      // Ruby segments are atomic; the validator guarantees ranges never split them.
      target(pos).appendChild(rubyNode(seg));
      pos += seg.text.length;
      continue;
    }
    // Plain text may be split at range boundaries.
    const cuts = [0, seg.text.length];
    if (range) {
      for (const edge of [range.start, range.end]) {
        const local = edge - pos;
        if (local > 0 && local < seg.text.length) cuts.push(local);
      }
    }
    cuts.sort((a, b) => a - b);
    for (let i = 0; i < cuts.length - 1; i++) {
      if (cuts[i] === cuts[i + 1]) continue;
      target(pos + cuts[i]).append(seg.text.slice(cuts[i], cuts[i + 1]));
    }
    pos += seg.text.length;
  }
  target(Infinity);
  return out;
}

/** Copy of `segments` with the furigana removed wherever `hide(segment)` is true. */
export function hideRuby(segments, hide) {
  return segments.map((seg) => (seg.ruby !== null && hide(seg) ? { text: seg.text, ruby: null } : seg));
}
