// Printable preview of the material for expert validators and the content
// team (D-109): every region with its quests, the kanji and kotoba data, the
// distractors, the intro and test conversations with their scene
// illustrations, and the validator's warnings next to the part they concern.
// `#/preview/all` shows everything; `#/preview/B06` one region. Not linked
// from the player flow (D-86): it shows answers.

import { h, ja } from "../dom.js";
import { castFor } from "../cast.js";
import { isOwnBushu, kanjiReadingIn } from "../model.js";
import { parseRuby, renderRuby } from "../ruby.js";
import { PLAYER_SPEAKER, UNKNOWN_VALUE } from "../validate.js";
import { sceneFigure } from "../stages/conversation.js";
import { disclaimer } from "./about.js";
import { backLink, chapterLabel, kotobaWithReading, LABELS, readingNotation } from "./common.js";

export const ALL_REGIONS = "all";

const isDraftRevision = (revision) => /^draft/i.test(revision);
const formatDate = (date) => date.toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" });

/** Validator issues grouped by the part of content.json they concern. */
function issueIndex(app) {
  const issues = [...app.warnings];
  return (prefix) => issues.filter((i) => i.path === prefix || i.path?.startsWith(`${prefix}.`) || i.path?.startsWith(`${prefix}[`));
}

// The draft banner already says what a draft allows; the flags drop that sentence.
const DRAFT_SENTENCE = / Boleh selama revisi masih draf; menjadi error saat rilis\./;

/** Validator warnings for one part, one short line each. */
function flags(issues) {
  if (!issues.length) return null;
  return h(
    "div",
    { class: "preview-flags", role: "note" },
    h("p", { class: "preview-flags__title" }, `⚠ Catatan pemeriksaan otomatis (${issues.length})`),
    h(
      "ul",
      {},
      issues.map((issue) =>
        h("li", {}, h("span", { class: "preview-flags__where" }, `${issue.where || issue.path}: `), issue.message.replace(DRAFT_SENTENCE, ""), h("span", { class: "muted" }, ` [${issue.code}]`))
      )
    )
  );
}

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
              "Nomor bab dan isi materi belum diperiksa terhadap buku. Bagian bertanda «BELUM DIISI», «PERIKSA», atau ",
              "«TULIS ULANG» masih ditunggu dari tim konten. Dokumen ini belum boleh dipakai untuk validasi ahli."
            )
          )
        : null
    ),
  ];
}

const list = (label, values) =>
  values?.length ? h("p", { class: "preview-list" }, h("span", { class: "muted" }, `${label}: `), ja("span", {}, values.join("、"))) : null;

function sentenceChapterNote(conversation, chapter) {
  const value = conversation.sentenceChapter;
  const ahead = Number.isInteger(value) && value > chapter;
  const text = value === null ? "di luar buku" : value === UNKNOWN_VALUE ? "belum diperiksa (?)" : `bab ${value}`;
  return h(
    "p",
    { class: `sentence-chapter${ahead || value === UNKNOWN_VALUE ? " sentence-chapter--ahead" : ""}` },
    "Bab yang dibutuhkan percakapan: ",
    h("strong", {}, text),
    ahead ? ` · ⚠ lebih tinggi dari bab wilayah (bab ${chapter})` : null
  );
}

/** One conversation as a script: speaker, line with all furigana, translation. */
function conversationBlock(app, conversation, { role, chapter, cast }) {
  const lines = conversation.lines.map((line) => {
    const { segments, plain } = parseRuby(line.ja);
    const mark = line.blank ?? line.highlight ?? null;
    const start = mark ? plain.indexOf(mark) : -1;
    const range = start === -1 ? null : { start, end: start + mark.length };
    const wrap = line.blank
      ? (inner) => h("mark", { class: "blank", title: "Bagian yang dikosongkan" }, inner)
      : (inner) => h("mark", { class: "highlight" }, inner);
    return h(
      "li",
      { class: "script__line" },
      h("span", { class: "script__speaker" }, line.speaker === PLAYER_SPEAKER ? "Pemain" : cast.nameOf(line.speaker)),
      h(
        "div",
        { class: "script__body" },
        ja("p", { class: "script__ja" }, renderRuby(segments, range ? { range, wrap } : {})),
        h("p", { class: "script__translation" }, line.translation),
        line.blank
          ? h(
              "p",
              { class: "script__answer" },
              "Jawaban: ",
              ja("strong", {}, line.blank),
              " · pengecoh: ",
              ja("span", {}, (line.distractors ?? []).join("、") || "–")
            )
          : null
      )
    );
  });
  return h(
    "section",
    { class: `script${conversation.isPlaceholder ? " script--placeholder" : ""}` },
    h(
      "h5",
      { class: "script__title" },
      role === "intro" ? "Percakapan pengantar" : "Percakapan uji",
      h("span", { class: "muted" }, ` · ${conversation.id}`),
      conversation.isPlaceholder ? h("span", { class: "script__flag" }, " · SEMENTARA, akan diganti tim konten") : null
    ),
    sceneFigure(conversation, app.assets?.get("adegan")),
    h("ol", { class: "script__lines" }, lines),
    sentenceChapterNote(conversation, chapter)
  );
}

function kanjiBlock(model, char, quest) {
  const k = model.kanji.get(char);
  if (!k) return null;
  const own = isOwnBushu(k);
  const kotoba = model.kotoba.get(quest.kotoba);
  const reading = kotoba ? kanjiReadingIn(kotoba, char) : null;
  return h(
    "div",
    { class: "preview-kanji" },
    ja("p", { class: "preview-kanji__char" }, char),
    h(
      "div",
      { class: "preview-kanji__body" },
      h("p", {}, h("strong", {}, k.meaning), ` · ${k.jlptLevel} · ${k.strokeCount === UNKNOWN_VALUE ? "jumlah guratan belum diperiksa (?)" : `${k.strokeCount} guratan`}`),
      h(
        "p",
        {},
        "Bushu: ",
        ja("strong", {}, k.bushu.char),
        ` ${k.bushu.name} — ${k.bushu.meaning}`,
        k.bushu.variants?.length ? ja("span", { class: "muted" }, ` (bentuk lain: ${k.bushu.variants.join("、")})`) : null
      ),
      own
        ? h("p", { class: "muted" }, "Kanji ini sekaligus bushu: tidak ada soal Bentuk, diganti kartu perkenalan tanpa nilai (D-90).")
        : h(
            "p",
            {},
            "Pilihan soal Bentuk: ",
            k.bushuOptions.map((opt) =>
              ja("span", { class: `option-chip${opt === k.bushu.char ? " option-chip--correct" : ""}` }, opt === k.bushu.char ? `${opt} ✓` : opt)
            )
          ),
      h(
        "p",
        { class: "preview-readings" },
        ["kunyomi", "onyomi"].map((type) => [
          h("span", { class: "muted" }, `${LABELS.readingType[type]}: `),
          k.readings[type].length ? k.readings[type].map((r, i) => [i ? "、" : "", readingNotation(r)]) : "–",
          type === "kunyomi" ? " · " : "",
        ])
      ),
      reading ? h("p", { class: "muted" }, "Bacaan di kotoba quest ini: ", ja("span", {}, reading)) : null
    )
  );
}

function kotobaBlock(k) {
  return h(
    "div",
    { class: "preview-kotoba" },
    h(
      "p",
      { class: "preview-kotoba__head" },
      ja("span", { class: "preview-kotoba__word" }, kotobaWithReading(k)),
      h("span", { class: `badge badge--${k.readingType}` }, LABELS.readingType[k.readingType])
    ),
    h("p", {}, k.meaning, h("span", { class: "muted" }, ` · ${LABELS.pos[k.pos]} · ${chapterLabel(k.chapter)} · id ${k.id}`)),
    k.note ? h("p", { class: "kotoba__note" }, k.note) : null,
    list("Pengecoh cara baca (sejenis)", k.readingDistractors),
    list("Pengecoh cara baca (lintas jenis)", k.readingDistractorsCross)
  );
}

function questSection(app, ctx, region, quest, n) {
  const { model, issuesAt, kanjiSeenAt, kotobaIndex } = ctx;
  const kotoba = model.kotoba.get(quest.kotoba);
  const cast = castFor(app);
  const kotobaIssues = kotoba ? issuesAt(`kotoba[${kotobaIndex.get(kotoba.id)}]`) : [];
  const kanjiBlocks = quest.targetKanji.map((char) => {
    const seen = kanjiSeenAt.get(char);
    if (seen) return h("p", { class: "muted" }, "Data kanji ", ja("strong", {}, char), `: lihat ${seen}.`);
    kanjiSeenAt.set(char, `Bab ${region.chapter} Quest ${n}`);
    return [kanjiBlock(model, char, quest), flags(issuesAt(`kanji[${ctx.kanjiIndex.get(char)}]`))];
  });
  return h(
    "article",
    { class: "preview-quest" },
    h(
      "h4",
      { class: "preview-quest__title" },
      `Quest ${n} · `,
      kotoba ? ja("span", {}, kotoba.word) : quest.kotoba,
      h("span", { class: "muted" }, ` · ${quest.id}`),
      !quest.tests.length ? h("span", { class: "script__flag" }, " · belum ada percakapan uji") : null
    ),
    h("h5", {}, "Kanji target"),
    kanjiBlocks,
    h("h5", {}, "Kotoba"),
    kotoba ? kotobaBlock(kotoba) : null,
    flags(kotobaIssues),
    conversationBlock(app, quest.intro, { role: "intro", chapter: region.chapter, cast }),
    quest.tests.map((test) => conversationBlock(app, test, { role: "test", chapter: region.chapter, cast })),
    h("h5", {}, "Tahap Produksi"),
    h("p", {}, quest.productionPrompt),
    flags(issuesAt(ctx.questPath.get(quest.id))),
    h(
      "div",
      { class: "validator-notes print-only" },
      h("p", {}, `Catatan validator — Bab ${region.chapter}, Quest ${n} (`, kotoba ? ja("span", {}, kotoba.word) : quest.kotoba, "):")
    )
  );
}

function regionSection(app, ctx, region) {
  const draft = isDraftRevision(app.content.contentRevision);
  return h(
    "section",
    { class: "preview-region", "aria-labelledby": `region-title-${region.id}` },
    // In the normal flow, so it prints even where a browser drops the fixed watermark.
    draft ? h("p", { class: "draft-inline", role: "note" }, `DRAF — BELUM DIVERIFIKASI · revisi ${app.content.contentRevision}`) : null,
    h(
      "header",
      { class: "preview-region__head" },
      h("p", { class: "preview-region__number" }, `${region.id} · ${region.quests.length} quest`),
      h("h2", { id: `region-title-${region.id}` }, `Bab ${region.chapter} — ${region.title}`),
      h("p", {}, region.intro.summary),
      region.intro.points.length ? h("ul", {}, region.intro.points.map((p) => h("li", {}, p))) : null,
      h(
        "p",
        { class: "muted" },
        region.pin ? `Lokasi di peta: potongan ${region.pin.segment}, x ${region.pin.x}%, y ${region.pin.y}%` : "Lokasi di peta: belum diisi (posisi sementara)"
      ),
      flags(ctx.issuesAt(ctx.regionPath.get(region.id)).filter((i) => !/\.quests\[/.test(i.path)))
    ),
    region.quests.map((quest, i) => questSection(app, ctx, region, quest, i + 1)),
    h("div", { class: "validator-notes print-only" }, h("p", {}, `Catatan umum validator untuk Bab ${region.chapter}:`))
  );
}

/** Kotoba that no quest drills: they appear only in the index (D-93). */
function indexOnlySection(app, model) {
  const drilled = new Set([...model.quests.values()].map((q) => q.kotoba));
  const rest = app.content.kotoba.filter((k) => !drilled.has(k.id));
  if (!rest.length) return null;
  return h(
    "section",
    { class: "preview-region" },
    isDraftRevision(app.content.contentRevision)
      ? h("p", { class: "draft-inline", role: "note" }, `DRAF — BELUM DIVERIFIKASI · revisi ${app.content.contentRevision}`)
      : null,
    h("h2", {}, `Kotoba yang hanya muncul di index (${rest.length})`),
    h("p", { class: "muted" }, "Tidak diujikan; tampil di index setelah semua quest kanji-nya tuntas."),
    rest.map(kotobaBlock),
    h("div", { class: "validator-notes print-only" }, h("p", {}, "Catatan validator untuk kotoba index:"))
  );
}

function summaryTable(model, issuesAt, regionPath) {
  return h(
    "div",
    { class: "table-scroll" },
    h(
      "table",
      { class: "summary-table" },
      h("thead", {}, h("tr", {}, ["Bab", "Wilayah", "Quest", "Kanji target", "Percakapan uji", "Catatan otomatis"].map((t) => h("th", { scope: "col" }, t)))),
      h(
        "tbody",
        {},
        model.regions.map((region) =>
          h(
            "tr",
            {},
            h("td", {}, String(region.chapter)),
            h("td", {}, region.title),
            h("td", {}, String(region.quests.length)),
            h("td", {}, ja("span", {}, [...new Set(region.quests.flatMap((q) => q.targetKanji))].join("・"))),
            h("td", {}, String(region.quests.reduce((n, q) => n + q.tests.length, 0))),
            h("td", {}, String(issuesAt(regionPath.get(region.id)).length))
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
    backLink("#/content-check", "Pemeriksaan konten"),
    h("button", { type: "button", class: "button", onClick: () => window.print() }, "Cetak / simpan PDF")
  );
}

export function previewScreen(app, which) {
  const { content, model } = app;
  const issuesAt = issueIndex(app);
  // Paths in validator issues use the order of content.json, not the sorted model.
  const regionPath = new Map();
  const questPath = new Map();
  content.regions.forEach((r, ri) => {
    regionPath.set(model.regions.find((m) => m.chapter === r.chapter).id, `regions[${ri}]`);
    r.quests.forEach((q, qi) => questPath.set(q.id, `regions[${ri}].quests[${qi}]`));
  });
  const ctx = {
    model,
    issuesAt,
    regionPath,
    questPath,
    kanjiSeenAt: new Map(),
    kanjiIndex: new Map(content.kanji.map((k, i) => [k.char, i])),
    kotobaIndex: new Map(content.kotoba.map((k, i) => [k.id, i])),
  };

  if (which === ALL_REGIONS) {
    return h(
      "div",
      { class: "screen preview" },
      toolbar(),
      revisionHeader(content, "Daftar Materi Kanji Bertahap"),
      disclaimer(app),
      h(
        "p",
        { class: "muted" },
        "Saat dicetak, setiap bab dimulai di halaman baru. Setiap quest diakhiri kotak catatan validator; ",
        "kotak catatan pemeriksaan otomatis menunjukkan bagian yang masih ditunggu dari tim."
      ),
      h("section", { class: "card preview-summary" }, h("h2", {}, `Ringkasan (${model.regions.length} bab)`), summaryTable(model, issuesAt, regionPath)),
      model.regions.map((region) => regionSection(app, ctx, region)),
      indexOnlySection(app, model)
    );
  }

  const region = model.regions.find((r) => r.id === which);
  if (!region) {
    return h("div", { class: "screen" }, backLink("#/content-check", "Pemeriksaan konten"), h("h1", { tabindex: "-1" }, "Bab tidak ditemukan"));
  }
  return h(
    "div",
    { class: "screen preview" },
    toolbar(),
    revisionHeader(content, `Pratinjau Bab ${region.chapter}`),
    disclaimer(app),
    regionSection(app, ctx, region)
  );
}
