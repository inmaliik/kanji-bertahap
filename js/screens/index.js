// Index: a reference of what has been taught, not progress (D-68). It lists
// only kanji and kotoba whose quest intro the player has already read (D-79),
// so it never shows material before the quest that introduces it. Readings
// appear once the reading question is no longer pending. Each opening is
// logged as an event row (not an answer), with the quests still open.
//
// Step 3 builds the list; the kanji window (readings, bushu, stroke count,
// stroke order) and the kotoba window follow in step 4.

import { h, ja } from "../dom.js";
import { FURIGANA_MODE } from "../state.js";
import { indexKanji, indexKotoba, questByKotoba, readingSettled } from "../reveal.js";
import { recordEvent } from "../event-log.js";
import { kotobaWithReading, READING_DISPLAY } from "./common.js";
import { menuBar } from "./menu.js";

export function indexScreen(app) {
  const { model, progress } = app;
  const byKotoba = questByKotoba(model);
  const kotoba = indexKotoba(model, progress);
  const kanji = indexKanji(kotoba);
  const showReading = progress.settings.furiganaMode !== FURIGANA_MODE.NEVER;

  recordEvent(app, { questStep: "index", stage: "index", prompt: "daftar index", answer: kanji.join(" | ") });

  const body = kanji.length
    ? [
        h("h2", {}, `Kanji (${kanji.length})`),
        h(
          "ul",
          { class: "index-kanji" },
          kanji.map((ch) => {
            const entry = model.kanji.get(ch);
            return h(
              "li",
              { class: "index-kanji__tile" },
              ja("span", { class: "index-kanji__char" }, ch),
              h("span", { class: "index-kanji__meaning" }, entry ? entry.meaning : "detail belum tersedia")
            );
          })
        ),
        h("h2", {}, `Kotoba (${kotoba.length})`),
        h(
          "ul",
          { class: "index-kotoba" },
          kotoba.map((k) => {
            const settled = readingSettled(model, progress, k, byKotoba);
            return h(
              "li",
              { class: "index-kotoba__row" },
              ja("span", { class: "index-kotoba__word" }, kotobaWithReading(k, { display: !settled ? READING_DISPLAY.NONE : showReading ? READING_DISPLAY.RUBY : READING_DISPLAY.KANA })),
              h("span", { class: "index-kotoba__meaning" }, k.meaning),
              settled ? null : h("span", { class: "index-kotoba__pending" }, "Cara baca tampil setelah kamu menguasai soal cara bacanya.")
            );
          })
        ),
        h("p", { class: "muted" }, "Jendela detail kanji dan kotoba sedang dibangun (langkah 4)."),
      ]
    : h(
        "p",
        { class: "notice notice--info" },
        "Index masih kosong. Kanji dan kotoba muncul di sini setelah kamu menyimak percakapan pengantar sebuah quest."
      );

  return h("div", { class: "screen index" }, menuBar(app, "index"), h("h1", { tabindex: "-1" }, "Index"), body);
}
