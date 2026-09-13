// Content preview for the content team and expert validators, plus the
// content warnings page. Reached from Settings, not from the player flow.

import { h, ja } from "../dom.js";
import { buildLevelItems } from "../content.js";
import { renderRuby } from "../ruby.js";
import { STAGE_ORDER } from "../session.js";
import { backLink, chapterLabel, issueList, LABELS, readingsTable, wordWithRuby } from "./common.js";

export function previewScreen(app, levelId) {
  const level = app.content.levels.find((l) => l.id === levelId);
  if (!level) {
    return h("div", { class: "screen" }, backLink("#/settings", "Pengaturan"), h("h1", { tabindex: "-1" }, "Level tidak ditemukan"));
  }
  const items = buildLevelItems(level);

  const bushuOption = (opt) => {
    const correct = opt === level.bushu.char;
    return h(
      "li",
      { class: `option-preview${correct ? " option-preview--correct" : ""}` },
      ja("span", { class: "option-preview__char" }, opt),
      correct ? h("span", { class: "option-preview__tag" }, "✓ jawaban") : null
    );
  };

  const sentence = (example) => {
    const item = items.sentence.find((it) => it.example === example);
    return h(
      "li",
      { class: "example" },
      ja(
        "p",
        { class: "example__ja" },
        renderRuby(item.segments, {
          range: item.blankRange,
          wrap: (inner) => h("mark", { class: "blank", title: "Bagian yang dikosongkan" }, inner),
        })
      ),
      h("p", { class: "example__translation" }, example.translation),
      example.distractors?.length
        ? h("p", { class: "muted" }, "Pengecoh manual: ", ja("span", {}, example.distractors.join("、")))
        : null
    );
  };

  const stageCounts = STAGE_ORDER.map((stage) => {
    const list = items[stage];
    return h(
      "li",
      {},
      h("strong", {}, LABELS.stage[stage]),
      `: ${list.length} item`,
      list.length === 0 ? h("span", { class: "muted" }, " (tahap dilewati)") : null,
      list.length ? h("ul", { class: "item-ids" }, list.map((it) => h("li", {}, h("code", { lang: "ja" }, it.id)))) : null
    );
  });

  return h(
    "div",
    { class: "screen" },
    backLink("#/settings", "Pengaturan"),
    h(
      "header",
      { class: "hero" },
      ja("p", { class: "hero__kanji" }, level.kanji),
      h("h1", { class: "hero__meaning", tabindex: "-1" }, level.meaning),
      h(
        "p",
        { class: "badges" },
        h("span", { class: "badge" }, level.jlptLevel),
        h("span", { class: "badge" }, chapterLabel(level.chapter)),
        h("span", { class: "badge badge--plain" }, level.id)
      )
    ),

    h(
      "section",
      { class: "card" },
      h("h2", {}, "Bushu"),
      h(
        "div",
        { class: "bushu" },
        ja("span", { class: "bushu__char" }, level.bushu.char),
        h(
          "div",
          {},
          h("p", { class: "bushu__name" }, level.bushu.name),
          h("p", {}, level.bushu.meaning),
          level.bushu.variants?.length
            ? h("p", { class: "muted" }, "Bentuk lain: ", ja("span", { class: "inline-kanji" }, level.bushu.variants.join("、")))
            : null
        )
      ),
      h("h3", {}, "Pilihan di tahap Bentuk"),
      h("ul", { class: "option-previews" }, level.bushuOptions.map(bushuOption))
    ),

    h("section", { class: "card" }, h("h2", {}, "Cara baca"), readingsTable(level.readings)),

    h(
      "section",
      { class: "card" },
      h("h2", {}, "Kotoba"),
      level.kotoba.map((k) =>
        h(
          "article",
          { class: "kotoba" },
          h(
            "div",
            { class: "kotoba__head" },
            ja("p", { class: "kotoba__word" }, wordWithRuby(k)),
            h("span", { class: `badge badge--${k.readingType}` }, LABELS.readingType[k.readingType])
          ),
          h("p", {}, k.meaning),
          h("p", { class: "muted" }, `${LABELS.pos[k.pos]} · ${chapterLabel(k.chapter)}`),
          k.note ? h("p", { class: "kotoba__note" }, k.note) : null,
          k.readingDistractors?.length
            ? h("p", { class: "muted" }, "Pengecoh cara baca manual: ", ja("span", {}, k.readingDistractors.join("、")))
            : null,
          k.examples.length
            ? h("ol", { class: "examples" }, k.examples.map(sentence))
            : h("p", { class: "muted" }, "Tidak ada contoh kalimat.")
        )
      )
    ),

    h("section", { class: "card" }, h("h2", {}, "Tahap Produksi"), h("p", {}, level.productionPrompt)),

    h(
      "section",
      { class: "card" },
      h("h2", {}, "Item soal tahap 1–4"),
      h("p", { class: "muted" }, "ID item diturunkan dari isi materi dan dipakai untuk progres serta log."),
      h("ul", { class: "stage-counts" }, stageCounts)
    )
  );
}

export function contentCheckScreen(app) {
  return h(
    "div",
    { class: "screen" },
    backLink("#/", "Daftar level"),
    h("h1", { tabindex: "-1" }, "Pemeriksaan konten"),
    app.warnings.length
      ? [
          h("p", {}, `Materi bisa dimainkan, tetapi ada ${app.warnings.length} peringatan yang sebaiknya diperiksa tim konten.`),
          issueList(app.warnings),
        ]
      : h("p", {}, "✓ Tidak ada error dan tidak ada peringatan.")
  );
}
