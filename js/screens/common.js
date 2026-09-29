// Components shared by several screens.

import { h, ja } from "../dom.js";
import { renderRuby, parseRuby } from "../ruby.js";
import { splitReadingNotation } from "../jp-text.js";

export const LABELS = {
  readingType: { kunyomi: "Kun'yomi", onyomi: "On'yomi", special: "Bacaan khusus" },
  pos: {
    verb: "kata kerja",
    noun: "kata benda",
    "i-adj": "adjektiva-i",
    "na-adj": "adjektiva-na",
    adverb: "adverbia",
    other: "lainnya",
  },
  stage: {
    intro: "Percakapan",
    shape: "Bentuk",
    reading: "Cara baca",
    test: "Uji konteks",
    production: "Produksi",
  },
  phase: {
    intro: "Pengantar",
    learning: "Putaran belajar",
    production: "Produksi",
    consolidation: "Putaran pemantapan",
    review: "Ulangan",
  },
};

export const chapterLabel = (chapter) => (chapter === null ? "Di luar buku" : `Bab ${chapter}`);

export function backLink(href, text) {
  return h("a", { class: "back-link", href }, h("span", { "aria-hidden": "true" }, "‹ "), text);
}

const SEVERITY = {
  error: { icon: "✗", label: "Error" },
  warning: { icon: "⚠", label: "Peringatan" },
  note: { icon: "ℹ", label: "Catatan" },
};

/**
 * @param {Array<object>} issues items from validateContent()
 * @param {(issue: object) => string|null} [locate] extra location line, e.g. CSV row numbers
 */
export function issueList(issues, locate = () => null) {
  return h(
    "ul",
    { class: "issues" },
    issues.map((issue) => {
      const { icon, label } = SEVERITY[issue.severity];
      const location = locate(issue);
      return h(
        "li",
        { class: `issue issue--${issue.severity}${issue.prominent ? " issue--prominent" : ""}` },
        h(
          "p",
          { class: "issue__head" },
          h("span", { class: "issue__icon", "aria-hidden": "true" }, icon),
          h("span", { class: "issue__severity" }, label),
          h("span", { class: "issue__where" }, issue.where || "content.json")
        ),
        location ? h("p", { class: "issue__location" }, location) : null,
        h("p", { class: "issue__message" }, issue.message),
        issue.path ? h("p", { class: "issue__path" }, h("code", {}, issue.path), ` · ${issue.code}`) : null
      );
    })
  );
}

/** Segments of a kotoba's per-kanji furigana (schema v2 `ruby`). */
export const kotobaSegments = (kotoba) => parseRuby(kotoba.ruby).segments;

/**
 * A kotoba with its furigana, the ruby part containing one of `focus`
 * highlighted. With `showReading` false (furigana setting "never"), the word
 * is shown plain with its reading in kana after it, because the reading is
 * the point of the feedback where this is used.
 */
export function kotobaWithReading(kotoba, { focus = [], showReading = true } = {}) {
  if (!showReading) return [kotoba.word, h("span", { class: "reading-inline" }, ` (${kotoba.reading})`)];
  const segments = kotobaSegments(kotoba);
  let start = 0;
  for (const seg of segments) {
    if (seg.ruby !== null && focus.some((ch) => seg.text.includes(ch))) {
      return renderRuby(segments, {
        range: { start, end: start + seg.text.length },
        wrap: (inner) => h("mark", { class: "kanji-focus" }, inner),
      });
    }
    start += seg.text.length;
  }
  return renderRuby(segments);
}

/**
 * A reading such as た(べる), shown as the kanji's reading with the okurigana
 * visually subordinate, never as the raw dictionary-form notation.
 */
export function readingNotation(notation) {
  const { kanjiPart, okurigana } = splitReadingNotation(notation);
  return ja(
    "span",
    { class: "reading-notation" },
    h("span", { class: "reading-notation__kanji" }, kanjiPart),
    okurigana
      ? [
          h("span", { class: "sr-only", lang: "id" }, ", okurigana "),
          h("span", { class: "reading-notation__okurigana" }, okurigana),
        ]
      : null
  );
}

/**
 * Table of kun'yomi and on'yomi with a legend taken from the data itself.
 * @param {string[]} [hiddenTypes] reading types whose row must not be revealed yet
 */
export function readingsTable(readings, hiddenTypes = []) {
  const row = (label, list, type) => {
    let cell;
    if (hiddenTypes.includes(type)) {
      cell = h("span", { class: "muted" }, `Ditampilkan setelah soal ${label} dijawab.`);
    } else if (list.length) {
      cell = h("ul", { class: "reading-list" }, list.map((r) => h("li", {}, readingNotation(r))));
    } else {
      cell = h("span", { class: "muted" }, "tidak ada");
    }
    return h("tr", {}, h("th", { scope: "row" }, label), h("td", {}, cell));
  };

  const sample = [...readings.kunyomi, ...readings.onyomi].find((r) => splitReadingNotation(r).okurigana);
  return h(
    "div",
    { class: "readings-block" },
    h("table", { class: "readings" }, h("tbody", {}, row("Kun'yomi", readings.kunyomi, "kunyomi"), row("On'yomi", readings.onyomi, "onyomi"))),
    sample
      ? h(
          "p",
          { class: "reading-legend" },
          h("span", { class: "reading-legend__item" }, readingNotation(sample)),
          h(
            "span",
            {},
            h("strong", {}, "Huruf besar"),
            ": bacaan kanji. ",
            h("span", { class: "reading-legend__okurigana-label" }, "Huruf kecil bergaris putus-putus"),
            ": okurigana, huruf yang ditulis setelah kanji."
          )
        )
      : null
  );
}

/** Text with every character in `kanji` wrapped in a focus highlight. */
export function highlightKanji(text, kanji) {
  return Array.from(text).map((ch) => (kanji.includes(ch) ? h("mark", { class: "kanji-focus" }, ch) : ch));
}
