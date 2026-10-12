// Index: a reference of what has been taught, not progress (D-68). Three
// levels: the list → a kanji window (the kanji and its 熟語) → the kanji's
// details (readings, bushu, stroke count, stroke order); and the list or a
// kanji window → a kotoba window (its kanji with their readings, 例文).
//
// D-79 everywhere: only kanji and kotoba whose quest intro the player has
// read; readings only once their question is no longer pending; the bushu
// only once the shape question is mastered; 例文 only from conversation lines
// the player has already seen. Windows reached by typing an address follow
// the same rules. Every opening is logged as an event row, not an answer.
//
// Routes never carry a kotoba id, which may spell its reading (D-81): kotoba
// windows use the kotoba's position in the content.

import { h, ja } from "../dom.js";
import { parseRuby, renderRuby } from "../ruby.js";
import { FURIGANA_MODE } from "../state.js";
import { kotobaParts } from "../model.js";
import { visibleSegments } from "../furigana.js";
import {
  indexKanji,
  indexKotoba,
  pendingReadingLeaks,
  pendingReadingTypes,
  questByKotoba,
  readingSettled,
  seenLines,
  shapeSettled,
} from "../reveal.js";
import { recordEvent } from "../event-log.js";
import { uiLabel } from "../ui-labels.js";
import { assetImage } from "../assets.js";
import { backLink, kotobaWithReading, LABELS, READING_DISPLAY, readingNotation } from "./common.js";
import { menuBar } from "./menu.js";
import { speakerName } from "../stages/conversation.js";

export const kanjiHref = (ch) => `#/index/kanji/${encodeURIComponent(ch)}`;
export const kanjiDetailHref = (ch) => `${kanjiHref(ch)}/detail`;

function context(app) {
  const { model, progress } = app;
  const byKotoba = questByKotoba(model);
  const kotoba = indexKotoba(model, progress);
  const allKotoba = [...model.kotoba.values()];
  const never = progress.settings.furiganaMode === FURIGANA_MODE.NEVER;
  const settled = (k) => readingSettled(model, progress, k, byKotoba);
  return {
    model,
    progress,
    kotoba,
    kanji: indexKanji(kotoba),
    settled,
    // Index entries are reference: with furigana set to "never" the reading
    // is written in kana instead; a pending reading is not shown at all.
    display: (k) => (!settled(k) ? READING_DISPLAY.NONE : never ? READING_DISPLAY.KANA : READING_DISPLAY.RUBY),
    kotobaHref: (k) => `#/index/kotoba/${allKotoba.indexOf(k) + 1}`,
  };
}

function screen(app, ...children) {
  return h("div", { class: "screen index" }, menuBar(app, "index"), children);
}

function notAvailable(app, back) {
  return screen(
    app,
    backLink(back, "Kembali"),
    h("h1", { tabindex: "-1" }, "Belum tersedia"),
    h("p", {}, "Isi ini muncul di index setelah kamu menyimak percakapan pengantar quest yang memperkenalkannya.")
  );
}

const pendingNote = () => h("span", { class: "index-kotoba__pending" }, "Cara baca tampil setelah kamu menguasai soal cara bacanya.");

function kotobaRow(c, k, { focus = [] } = {}) {
  return h(
    "li",
    {},
    h(
      "a",
      { class: "index-kotoba__row", href: c.kotobaHref(k) },
      ja("span", { class: "index-kotoba__word" }, kotobaWithReading(k, { focus, display: c.display(k) })),
      h("span", { class: "index-kotoba__meaning" }, k.meaning),
      c.settled(k) ? null : pendingNote()
    )
  );
}

// ---------------------------------------------------------------------------
// Level 1: the list

export function indexScreen(app) {
  const c = context(app);
  recordEvent(app, { questStep: "index", stage: "index", prompt: "daftar", answer: c.kanji.join(" | ") });

  if (!c.kanji.length) {
    return screen(
      app,
      h("h1", { tabindex: "-1" }, "Index"),
      h("p", { class: "notice notice--info" }, "Index masih kosong. Kanji dan kotoba muncul di sini setelah kamu menyimak percakapan pengantar sebuah quest.")
    );
  }
  return screen(
    app,
    h("h1", { tabindex: "-1" }, "Index"),
    h("h2", {}, `Kanji (${c.kanji.length})`),
    h(
      "ul",
      { class: "index-kanji" },
      c.kanji.map((ch) =>
        h(
          "li",
          {},
          h(
            "a",
            { class: "index-kanji__tile", href: kanjiHref(ch) },
            ja("span", { class: "index-kanji__char" }, ch),
            h("span", { class: "index-kanji__meaning" }, c.model.kanji.get(ch)?.meaning ?? "detail belum tersedia")
          )
        )
      )
    ),
    h("h2", {}, `Kotoba (${c.kotoba.length})`),
    h("ul", { class: "index-kotoba" }, c.kotoba.map((k) => kotobaRow(c, k)))
  );
}

// ---------------------------------------------------------------------------
// Level 2: a kanji and its 熟語

export function kanjiScreen(app, ch) {
  const c = context(app);
  if (!c.kanji.includes(ch)) return notAvailable(app, "#/index");
  recordEvent(app, { questStep: "index", stage: "index", prompt: "kanji", answer: ch });
  const entry = c.model.kanji.get(ch);
  const related = c.kotoba.filter((k) => k.word.includes(ch));

  return screen(
    app,
    backLink("#/index", "Index"),
    h(
      "a",
      { class: "kanji-hero", href: kanjiDetailHref(ch), "aria-label": `${ch}: buka detail kanji` },
      ja("span", { class: "kanji-hero__char" }, ch),
      h("span", { class: "kanji-hero__hint" }, "Ketuk untuk detail kanji ›")
    ),
    h("h1", { tabindex: "-1", class: "kanji-hero__meaning" }, entry ? entry.meaning : "Detail kanji ini belum tersedia"),
    h("h2", {}, uiLabel(app, "jukugo"), h("span", { class: "muted" }, ` · kotoba dengan kanji ini (${related.length})`)),
    h("ul", { class: "index-kotoba" }, related.map((k) => kotobaRow(c, k, { focus: [ch] }))),
    h("p", { class: "muted" }, "Kotoba lain dengan kanji ini muncul setelah kamu menyimak percakapan pengantarnya.")
  );
}

// ---------------------------------------------------------------------------
// Level 3: kanji details

function detailRow(label, value) {
  return h("div", { class: "kanji-detail__row" }, h("dt", {}, label), h("dd", {}, value));
}

function strokeOrder(app, entry) {
  if (!entry.strokes) {
    // D-66: no stroke data until the licence is decided; the slot is ready
    // for a KanjiVG file or a team drawing in the same place.
    return h(
      "div",
      { class: "stroke-slot stroke-slot--empty" },
      h("span", {}, "Urutan guratan belum tersedia."),
      h("span", { class: "muted" }, "Menunggu keputusan sumber gambar.")
    );
  }
  const box = h("span", { class: "asset stroke-slot", style: "aspect-ratio: 1 / 1" });
  const img = h("img", { class: "asset__img", src: entry.strokes, alt: `Urutan guratan ${entry.char}` });
  img.addEventListener("error", () => box.replaceChildren(h("span", { class: "asset__missing" }, `✗ ${entry.strokes} hilang`)), { once: true });
  box.append(img);
  return box;
}

export function kanjiDetailScreen(app, ch) {
  const c = context(app);
  if (!c.kanji.includes(ch)) return notAvailable(app, "#/index");
  recordEvent(app, { questStep: "index", stage: "index", prompt: "detail kanji", answer: ch });
  const entry = c.model.kanji.get(ch);
  const head = [backLink(kanjiHref(ch), "Kembali"), ja("p", { class: "kanji-hero__char kanji-hero__char--static" }, ch)];
  if (!entry) {
    return screen(app, head, h("h1", { tabindex: "-1" }, "Detail kanji ini belum tersedia"), h("p", {}, "Kanji ini bukan kanji sasaran quest mana pun."));
  }

  const hiddenTypes = pendingReadingTypes(c.model, c.progress, ch);
  const readingList = (type) => {
    if (hiddenTypes.includes(type)) return h("span", { class: "muted" }, "Tampil setelah soal cara bacanya kamu kuasai.");
    const list = entry.readings[type];
    return list.length ? h("ul", { class: "reading-list" }, list.map((r) => h("li", {}, readingNotation(r)))) : h("span", { class: "muted" }, "tidak ada");
  };
  const bushu = shapeSettled(c.model, c.progress, ch)
    ? h("span", {}, ja("span", { class: "inline-kanji" }, entry.bushu.char), ` ${entry.bushu.name}, "${entry.bushu.meaning}"`)
    : h("span", { class: "muted" }, "Tampil setelah soal Bentuk kanji ini kamu kuasai.");

  return screen(
    app,
    head,
    h("h1", { tabindex: "-1", class: "kanji-hero__meaning" }, entry.meaning),
    h(
      "dl",
      { class: "kanji-detail" },
      detailRow(uiLabel(app, "onyomi"), readingList("onyomi")),
      detailRow(uiLabel(app, "kunyomi"), readingList("kunyomi")),
      detailRow(uiLabel(app, "bushu"), bushu),
      detailRow(uiLabel(app, "strokeCount"), Number.isInteger(entry.strokeCount) ? String(entry.strokeCount) : h("span", { class: "muted" }, "belum diisi")),
      detailRow("JLPT", entry.jlptLevel)
    ),
    sameBushu(app, c, entry),
    h("h2", {}, uiLabel(app, "strokeOrder")),
    strokeOrder(app, entry)
  );
}

/**
 * Other kanji of the index with the same bushu (D-90). Only while this
 * bushu may be shown, and only kanji whose own shape question is no longer
 * pending: listing 休 under 亻 would answer 休's shape question.
 */
function sameBushu(app, c, entry) {
  if (!shapeSettled(c.model, c.progress, entry.char)) return null;
  const forms = new Set([entry.bushu.char, ...(entry.bushu.variants ?? [])]);
  const others = c.kanji
    .filter((ch) => ch !== entry.char)
    .map((ch) => c.model.kanji.get(ch))
    .filter((k) => k && forms.has(k.bushu.char) && shapeSettled(c.model, c.progress, k.char));
  return h(
    "section",
    { class: "same-bushu" },
    h("h2", {}, "Kanji lain dengan ", uiLabel(app, "bushu", { gloss: false }), " ini"),
    others.length
      ? h(
          "ul",
          { class: "same-bushu__list" },
          others.map((k) => h("li", {}, h("a", { class: "same-bushu__kanji", href: kanjiHref(k.char), lang: "ja" }, k.char)))
        )
      : h("p", { class: "muted" }, "Belum ada di index. Kanji lain dengan bushu ini muncul setelah kamu mempelajarinya.")
  );
}

// ---------------------------------------------------------------------------
// Kotoba window

export function kotobaScreen(app, position) {
  const c = context(app);
  const k = [...c.model.kotoba.values()][Number(position) - 1];
  if (!k || !c.kotoba.includes(k)) return notAvailable(app, "#/index");
  recordEvent(app, { questStep: "index", stage: "index", prompt: "kotoba", answer: k.word });

  const settled = c.settled(k);
  const mode = c.progress.settings.furiganaMode;
  const leaks = pendingReadingLeaks(c.model, c.progress);
  const parts = (kotobaParts(k.ruby) ?? []).filter((p) => p.kanji.length);
  const examples = seenLines(c.model, c.progress, k);

  return screen(
    app,
    h(
      "a",
      { class: "back-link", href: "#/index", onClick: (e) => history.length > 1 && (e.preventDefault(), history.back()) },
      h("span", { "aria-hidden": "true" }, "‹ "),
      "Kembali"
    ),
    ja("p", { class: "kotoba-hero" }, kotobaWithReading(k, { display: c.display(k) })),
    h("h1", { tabindex: "-1", class: "kanji-hero__meaning" }, k.meaning),
    h("p", { class: "muted" }, `${LABELS.pos[k.pos]} · `, h("span", { class: `badge badge--${k.readingType}` }, LABELS.readingType[k.readingType])),
    settled ? null : h("p", { class: "notice notice--info" }, "Cara baca kotoba ini tampil setelah kamu menguasai soal cara bacanya."),
    h("h2", {}, "Kanji di kotoba ini"),
    h(
      "ul",
      { class: "kotoba-parts" },
      parts.map((p) => {
        const inIndex = p.text.length === 1 && c.kanji.includes(p.text);
        const char = ja("span", { class: "kotoba-parts__char" }, p.text);
        return h(
          "li",
          {},
          h(
            inIndex ? "a" : "div",
            { class: "kotoba-parts__item", href: inIndex ? kanjiHref(p.text) : null },
            char,
            h(
              "span",
              { class: "kotoba-parts__info" },
              settled ? ja("span", { class: "kotoba-parts__reading" }, p.reading) : h("span", { class: "muted" }, "cara baca belum tampil"),
              h("span", { class: "muted" }, c.model.kanji.get(p.text)?.meaning ?? (p.kanji.length > 1 ? "dibaca bersama" : "detail belum tersedia"))
            )
          )
        );
      })
    ),
    h("h2", {}, uiLabel(app, "example")),
    examples.length
      ? h(
          "ul",
          { class: "dialog index-examples" },
          examples.map(({ line }) =>
            h(
              "li",
              { class: "index-example" },
              h("p", { class: "dialog__speaker" }, speakerName(line.speaker)),
              ja("p", { class: "dialog__ja" }, renderRuby(visibleSegments(parseRuby(line.ja).segments, { mode, answered: true, leaks }))),
              h("p", { class: "dialog__translation" }, line.translation)
            )
          )
        )
      : h("p", { class: "muted" }, "Contoh kalimat muncul setelah kamu menyimak percakapannya.")
  );
}
