// Content preview for the content team and expert validators, plus the
// content warnings page. Reached from Settings, not from the player flow.
// `#/preview/all` shows every level and is laid out for printing.

import { h, ja } from "../dom.js";
import { buildLevelItems } from "../content.js";
import { renderRuby } from "../ruby.js";
import { STAGE_ORDER } from "../session.js";
import { chaptersLabel, kotobaChapters } from "../chapters.js";
import { backLink, chapterLabel, issueList, LABELS, readingsTable, wordWithRuby } from "./common.js";

export const ALL_LEVELS_ROUTE_ID = "all";

const isDraftRevision = (revision) => /^draft/i.test(revision);

const formatDate = (date) => date.toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" });

/** Revision header shown at the top of every preview page, on screen and on paper. */
function revisionHeader(content, title) {
  const draft = isDraftRevision(content.contentRevision);
  return [
    draft ? h("div", { class: "draft-watermark", "aria-hidden": "true" }, "DRAF") : null,
    h(
      "header",
      { class: "preview-header" },
      h("h1", { tabindex: "-1" }, title),
      h(
        "p",
        { class: "preview-header__revision" },
        "Revisi materi: ",
        h("strong", {}, content.contentRevision),
        ` · Dicetak/dibuka: ${formatDate(new Date())}`
      ),
      draft
        ? h(
            "div",
            { class: "draft-banner", role: "note" },
            h("p", { class: "draft-banner__title" }, "DRAF — BELUM DIVERIFIKASI"),
            h(
              "p",
              {},
              "Nomor bab dan isi materi belum diperiksa terhadap buku Minna no Nihongo Shokyu I. ",
              "Dokumen ini tidak boleh dipakai untuk validasi ahli."
            )
          )
        : null
    ),
  ];
}

function list(label, values) {
  return values?.length ? h("p", { class: "preview-list" }, h("span", { class: "muted" }, `${label}: `), ja("span", {}, values.join("、"))) : null;
}

/** Minna chapter the sentence needs, flagged when it is later than the tested kotoba (D-48). */
function sentenceChapterNote(example, kotoba) {
  const value = example.sentenceChapter;
  const ahead = Number.isInteger(value) && Number.isInteger(kotoba.chapter) && value > kotoba.chapter;
  return h(
    "p",
    { class: `sentence-chapter${ahead ? " sentence-chapter--ahead" : ""}` },
    "Bab yang dibutuhkan kalimat: ",
    h("strong", {}, value === null ? "di luar buku" : `bab ${value}`),
    ahead ? ` · ⚠ lebih tinggi dari bab kotoba (bab ${kotoba.chapter})` : null
  );
}

/**
 * One level, as shown to validators.
 * @param {object} level
 * @param {{number?: number, total?: number, revision: string, showItemIds?: boolean}} options
 */
function levelSection(level, { number, total, revision, showItemIds = false }) {
  const items = buildLevelItems(level);
  const draft = isDraftRevision(revision);

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
      sentenceChapterNote(example, item.kotoba),
      list("Pengecoh kalimat", example.distractors)
    );
  };

  const kotobaArticle = (k) =>
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
      list("Pengecoh cara baca (sejenis)", k.readingDistractors),
      list("Pengecoh cara baca (lintas jenis)", k.readingDistractorsCross),
      k.examples.length
        ? h("ol", { class: "examples" }, k.examples.map(sentence))
        : h("p", { class: "muted" }, "Tidak ada contoh kalimat.")
    );

  return h(
    "section",
    { class: "preview-level", "aria-labelledby": `level-title-${level.id}` },
    // Part of the normal flow, so it prints even where a browser drops the
    // fixed watermark: every level starts on a new page with this label.
    draft ? h("p", { class: "draft-inline", role: "note" }, `DRAF — BELUM DIVERIFIKASI · revisi ${revision}`) : null,
    h(
      "header",
      { class: "hero" },
      number ? h("p", { class: "preview-level__number" }, `Level ${number} dari ${total} · revisi ${revision}`) : null,
      ja("p", { class: "hero__kanji" }, level.kanji),
      h("h2", { id: `level-title-${level.id}`, class: "hero__meaning" }, level.meaning),
      h(
        "p",
        { class: "badges" },
        h("span", { class: "badge badge--plain" }, level.id),
        h("span", { class: "badge" }, level.jlptLevel),
        h("span", { class: "badge" }, chaptersLabel(level))
      )
    ),

    h(
      "section",
      { class: "card" },
      h("h3", {}, "Bushu"),
      h(
        "div",
        { class: "bushu" },
        ja("span", { class: "bushu__char" }, level.bushu.char),
        h(
          "div",
          {},
          h("p", { class: "bushu__name" }, level.bushu.name),
          h("p", {}, level.bushu.meaning),
          list("Bentuk lain", level.bushu.variants)
        )
      ),
      h("h4", {}, "Pilihan di tahap Bentuk"),
      h("ul", { class: "option-previews" }, level.bushuOptions.map(bushuOption))
    ),

    h(
      "section",
      { class: "card" },
      h("h3", {}, "Cara baca"),
      readingsTable(level.readings),
      h(
        "p",
        { class: "raw-notation" },
        "Notasi di data — kun'yomi: ",
        ja("span", {}, level.readings.kunyomi.join("、") || "–"),
        " · on'yomi: ",
        ja("span", {}, level.readings.onyomi.join("、") || "–")
      )
    ),

    h("section", { class: "card" }, h("h3", {}, "Kotoba"), level.kotoba.map(kotobaArticle)),

    h("section", { class: "card" }, h("h3", {}, "Tahap Produksi"), h("p", {}, level.productionPrompt)),

    showItemIds
      ? h(
          "section",
          { class: "card no-print" },
          h("h3", {}, "Item soal tahap 1–4"),
          h("p", { class: "muted" }, "ID item diturunkan dari isi materi dan dipakai untuk progres serta log."),
          h(
            "ul",
            { class: "stage-counts" },
            STAGE_ORDER.map((stage) =>
              h(
                "li",
                {},
                h("strong", {}, LABELS.stage[stage]),
                `: ${items[stage].length} item`,
                items[stage].length === 0 ? h("span", { class: "muted" }, " (tahap dilewati)") : null,
                items[stage].length
                  ? h("ul", { class: "item-ids" }, items[stage].map((it) => h("li", {}, h("code", { lang: "ja" }, it.id))))
                  : null
              )
            )
          )
        )
      : null,

    h(
      "div",
      { class: "validator-notes print-only" },
      h("p", {}, `Catatan validator untuk ${level.id} (${level.kanji})`, draft ? h("strong", {}, ` · DRAF revisi ${revision}`) : null, ":")
    )
  );
}

function summaryTable(levels) {
  const exampleCount = (level) => level.kotoba.reduce((n, k) => n + k.examples.length, 0);
  return h(
    "div",
    { class: "table-scroll" },
    h(
      "table",
      { class: "summary-table" },
      h(
        "thead",
        {},
        h("tr", {}, ["No.", "ID", "Kanji", "Arti", "JLPT", "Bab Minna", "Kotoba", "Kalimat"].map((t) => h("th", { scope: "col" }, t)))
      ),
      h(
        "tbody",
        {},
        levels.map((level, i) =>
          h(
            "tr",
            {},
            h("td", {}, String(i + 1)),
            h("td", {}, level.id),
            h("td", {}, ja("span", { class: "summary-table__kanji" }, level.kanji)),
            h("td", {}, level.meaning),
            h("td", {}, level.jlptLevel),
            h("td", {}, kotobaChapters(level).join(", ") || "–"),
            h("td", {}, String(level.kotoba.length)),
            h("td", {}, String(exampleCount(level)))
          )
        )
      )
    )
  );
}

function toolbar() {
  return h(
    "div",
    { class: "preview-toolbar no-print" },
    backLink("#/settings", "Pengaturan"),
    h("button", { type: "button", class: "button", onClick: () => window.print() }, "Cetak / simpan PDF")
  );
}

export function previewScreen(app, levelId) {
  const { content } = app;

  if (levelId === ALL_LEVELS_ROUTE_ID) {
    return h(
      "div",
      { class: "screen preview" },
      toolbar(),
      revisionHeader(content, "Daftar Materi Kanji Bertahap"),
      h("p", { class: "no-print muted" }, "Saat dicetak, setiap level dimulai di halaman baru dan diakhiri kotak catatan validator."),
      h("section", { class: "card preview-summary" }, h("h2", {}, `Ringkasan (${content.levels.length} level)`), summaryTable(content.levels)),
      content.levels.map((level, i) =>
        levelSection(level, { number: i + 1, total: content.levels.length, revision: content.contentRevision })
      )
    );
  }

  const level = content.levels.find((l) => l.id === levelId);
  if (!level) {
    return h("div", { class: "screen" }, backLink("#/settings", "Pengaturan"), h("h1", { tabindex: "-1" }, "Level tidak ditemukan"));
  }
  const index = content.levels.indexOf(level);
  return h(
    "div",
    { class: "screen preview" },
    toolbar(),
    revisionHeader(content, `Pratinjau ${level.id}`),
    levelSection(level, { number: index + 1, total: content.levels.length, revision: content.contentRevision, showItemIds: true })
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
      : h("p", {}, "✓ Tidak ada error dan tidak ada peringatan."),
    app.notes.length
      ? [h("h2", {}, "Catatan"), h("p", { class: "muted" }, "Informasi saja; tidak perlu diperbaiki."), issueList(app.notes)]
      : null
  );
}
