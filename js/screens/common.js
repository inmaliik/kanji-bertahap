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

/** Text with every occurrence of `kanji` wrapped in a focus highlight. */
export function highlightKanji(text, kanji) {
  return text.split(kanji).flatMap((part, i) => (i === 0 ? [part] : [h("mark", { class: "kanji-focus" }, kanji), part]));
}

/** Word with furigana, highlighting the ruby segment that contains `kanji`. */
export function wordWithRubyFocus(kotoba, kanji) {
  const segments = alignReading(kotoba.word, kotoba.reading) ?? [{ text: kotoba.word, ruby: kotoba.reading }];
  let start = 0;
  for (const seg of segments) {
    if (seg.ruby !== null && seg.text.includes(kanji)) {
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
 * Reading-stage kotoba of a level side by side, plus the readings table.
 * Only kotoba accepted by `isRevealed` are shown, so feedback never gives away
 * the answer of a question that is still ahead.
 */
export function readingContrast(level, isRevealed) {
  const readingKotoba = level.kotoba.filter((k) => k.readingType === "kunyomi" || k.readingType === "onyomi");
  const rows = readingKotoba.filter(isRevealed);
  const hiddenTypes = ["kunyomi", "onyomi"].filter((type) =>
    readingKotoba.some((k) => k.readingType === type && !isRevealed(k))
  );
  return h(
    "div",
    { class: "contrast" },
    h("p", { class: "contrast__title" }, "Kanji yang sama, cara baca berbeda"),
    h(
      "ul",
      { class: "contrast__list" },
      rows.map((k) =>
        h(
          "li",
          { class: "contrast__row" },
          h("span", { class: `badge badge--${k.readingType}` }, LABELS.readingType[k.readingType]),
          ja("span", { class: "contrast__word" }, wordWithRubyFocus(k, level.kanji)),
          h("span", { class: "contrast__meaning" }, k.meaning)
        )
      )
    ),
    readingsTable(level.readings, hiddenTypes)
  );
}
