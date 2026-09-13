// Components shared by several screens.

import { h, ja } from "../dom.js";
import { renderRuby, alignReading } from "../ruby.js";
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
    shape: "Bentuk",
    kunyomi: "Kun'yomi",
    onyomi: "On'yomi",
    sentence: "Kotoba dalam kalimat",
    production: "Produksi",
  },
  stageNumber: { shape: 1, kunyomi: 2, onyomi: 3, sentence: 4, production: 5 },
  phase: {
    learning: "Putaran belajar",
    production: "Produksi",
    consolidation: "Putaran pemantapan",
  },
};

export const chapterLabel = (chapter) => (chapter === null ? "Di luar buku" : `Bab ${chapter}`);

export function backLink(href, text) {
  return h("a", { class: "back-link", href }, h("span", { "aria-hidden": "true" }, "‹ "), text);
}

export function issueList(issues) {
  return h(
    "ul",
    { class: "issues" },
    issues.map((issue) => {
      const isError = issue.severity === "error";
      return h(
        "li",
        { class: `issue ${isError ? "issue--error" : "issue--warning"}${issue.prominent ? " issue--prominent" : ""}` },
        h(
          "p",
          { class: "issue__head" },
          h("span", { class: "issue__icon", "aria-hidden": "true" }, isError ? "✗" : "⚠"),
          h("span", { class: "issue__severity" }, isError ? "Error" : "Peringatan"),
          h("span", { class: "issue__where" }, issue.where || "content.json")
        ),
        h("p", { class: "issue__message" }, issue.message),
        issue.path ? h("p", { class: "issue__path" }, h("code", {}, issue.path), ` · ${issue.code}`) : null
      );
    })
  );
}

export function wordWithRuby(kotoba) {
  const segments = alignReading(kotoba.word, kotoba.reading) ?? [{ text: kotoba.word, ruby: kotoba.reading }];
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

/** Table of kun'yomi and on'yomi with a legend taken from the data itself. */
export function readingsTable(readings) {
  const row = (label, list) =>
    h(
      "tr",
      {},
      h("th", { scope: "row" }, label),
      h(
        "td",
        {},
        list.length
          ? h("ul", { class: "reading-list" }, list.map((r) => h("li", {}, readingNotation(r))))
          : h("span", { class: "muted" }, "tidak ada")
      )
    );

  const sample = [...readings.kunyomi, ...readings.onyomi].find((r) => splitReadingNotation(r).okurigana);
  return h(
    "div",
    { class: "readings-block" },
    h("table", { class: "readings" }, h("tbody", {}, row("Kun'yomi", readings.kunyomi), row("On'yomi", readings.onyomi))),
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
