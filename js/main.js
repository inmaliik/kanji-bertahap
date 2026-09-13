// App bootstrap and hash routing.

import { APP_TITLE, CONTENT_URL } from "./config.js";
import { loadContent, groupLevels, jlptLevelsPresent, buildLevelItems } from "./content.js";
import { renderRuby, alignReading } from "./ruby.js";
import { h, ja } from "./dom.js";

window.__kanjiAppBooted = true;

const app = document.getElementById("app");

const LABELS = {
  readingType: { kunyomi: "Kun'yomi", onyomi: "On'yomi", special: "Bacaan khusus" },
  pos: {
    verb: "kata kerja",
    noun: "kata benda",
    "i-adj": "adjektiva-i",
    "na-adj": "adjektiva-na",
    adverb: "adverbia",
    other: "lainnya",
  },
  stage: { shape: "Bentuk", kunyomi: "Kun'yomi", onyomi: "On'yomi", sentence: "Kotoba dalam kalimat" },
};

const view = {
  content: null,
  warnings: [],
  jlptFilter: "all",
};

const chapterLabel = (chapter) => (chapter === null ? "Di luar buku" : `Bab ${chapter}`);

// ---------------------------------------------------------------------------
// Shared components

function issueList(issues) {
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

function backLink(href, text) {
  return h("a", { class: "back-link", href }, h("span", { "aria-hidden": "true" }, "‹ "), text);
}

function wordWithRuby(kotoba) {
  const segments = alignReading(kotoba.word, kotoba.reading) ?? [{ text: kotoba.word, ruby: kotoba.reading }];
  return renderRuby(segments);
}

// ---------------------------------------------------------------------------
// Screens

function contentErrorScreen({ errors, warnings }) {
  return h(
    "div",
    { class: "screen" },
    h("h1", { tabindex: "-1" }, "Materi belum bisa dimuat"),
    h(
      "p",
      {},
      `Ada ${errors.length} error di ${CONTENT_URL}. Aplikasi berhenti di sini supaya tidak ada jawaban yang tercatat dengan materi yang salah.`
    ),
    h(
      "p",
      {},
      "Perbaiki file tersebut, simpan, lalu muat ulang halaman. Pemeriksaan yang sama bisa dijalankan dari terminal: ",
      h("code", {}, "node tools/validate-content.mjs")
    ),
    issueList(errors),
    warnings.length ? [h("h2", {}, `Peringatan (${warnings.length})`), issueList(warnings)] : null
  );
}

function levelListScreen() {
  const { content } = view;
  const present = jlptLevelsPresent(content.levels);
  if (view.jlptFilter !== "all" && !present.includes(view.jlptFilter)) view.jlptFilter = "all";

  const filterButton = (value, text) =>
    h(
      "button",
      {
        type: "button",
        class: "chip",
        "aria-pressed": String(view.jlptFilter === value),
        onClick: () => {
          view.jlptFilter = value;
          render();
        },
      },
      text
    );

  const groups = groupLevels(content.levels).filter((g) => view.jlptFilter === "all" || g.jlptLevel === view.jlptFilter);

  return h(
    "div",
    { class: "screen" },
    h(
      "header",
      { class: "topbar" },
      h("h1", { tabindex: "-1" }, APP_TITLE),
      h("p", { class: "topbar__meta" }, `Revisi materi: ${content.contentRevision}`)
    ),
    view.warnings.length
      ? h(
          "a",
          { class: "notice notice--warning", href: "#/content-check" },
          h("span", { "aria-hidden": "true" }, "⚠ "),
          `${view.warnings.length} peringatan konten. Lihat detail`
        )
      : null,
    present.length > 1
      ? h("div", { class: "chips", role: "group", "aria-label": "Saring menurut level JLPT" }, filterButton("all", "Semua"), present.map((j) => filterButton(j, j)))
      : null,
    groups.map((group) =>
      h(
        "section",
        { class: "jlpt-group", "aria-labelledby": `group-${group.jlptLevel}` },
        h(
          "h2",
          { id: `group-${group.jlptLevel}`, class: "jlpt-group__title" },
          group.jlptLevel,
          h("span", { class: "jlpt-group__count" }, `${group.chapters.reduce((n, c) => n + c.levels.length, 0)} level`)
        ),
        group.chapters.map((chapter) => [
          h("h3", { class: "chapter-heading" }, `${group.jlptLevel} · ${chapterLabel(chapter.chapter)}`),
          h(
            "ul",
            { class: "level-list" },
            chapter.levels.map((level) => {
              const exampleCount = level.kotoba.reduce((n, k) => n + k.examples.length, 0);
              return h(
                "li",
                {},
                h(
                  "a",
                  { class: "level-card", href: `#/preview/${encodeURIComponent(level.id)}` },
                  ja("span", { class: "level-card__kanji" }, level.kanji),
                  h(
                    "span",
                    { class: "level-card__body" },
                    h("span", { class: "level-card__title" }, level.meaning),
                    h("span", { class: "level-card__meta" }, `${level.id} · ${level.kotoba.length} kotoba · ${exampleCount} kalimat`)
                  ),
                  h("span", { class: "level-card__chevron", "aria-hidden": "true" }, "›")
                )
              );
            })
          ),
        ])
      )
    ),
    h("p", { class: "dev-note" }, "Tahap pengembangan 1: kartu level membuka pratinjau materi. Permainan belum tersedia.")
  );
}

function previewScreen(levelId) {
  const level = view.content.levels.find((l) => l.id === levelId);
  if (!level) return notFoundScreen();
  const items = buildLevelItems(level);

  const readingRow = (label, list) =>
    h(
      "tr",
      {},
      h("th", { scope: "row" }, label),
      h("td", {}, list.length ? ja("span", {}, list.join("、")) : h("span", { class: "muted" }, "tidak ada"))
    );

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

  const stageCounts = ["shape", "kunyomi", "onyomi", "sentence"].map((stage) => {
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
    backLink("#/", "Daftar level"),
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
            ? h("p", { class: "muted" }, "Bentuk lain: ", ja("span", {}, level.bushu.variants.join("、")))
            : null
        )
      ),
      h("h3", {}, "Pilihan di tahap Bentuk"),
      h("ul", { class: "option-previews" }, level.bushuOptions.map(bushuOption))
    ),

    h(
      "section",
      { class: "card" },
      h("h2", {}, "Cara baca"),
      h("table", { class: "readings" }, h("tbody", {}, readingRow("Kun'yomi", level.readings.kunyomi), readingRow("On'yomi", level.readings.onyomi)))
    ),

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

function contentCheckScreen() {
  return h(
    "div",
    { class: "screen" },
    backLink("#/", "Daftar level"),
    h("h1", { tabindex: "-1" }, "Pemeriksaan konten"),
    view.warnings.length
      ? [
          h("p", {}, `Materi bisa dimainkan, tetapi ada ${view.warnings.length} peringatan yang sebaiknya diperiksa tim konten.`),
          issueList(view.warnings),
        ]
      : h("p", {}, "✓ Tidak ada error dan tidak ada peringatan.")
  );
}

function notFoundScreen() {
  return h(
    "div",
    { class: "screen" },
    backLink("#/", "Daftar level"),
    h("h1", { tabindex: "-1" }, "Halaman tidak ditemukan"),
    h("p", {}, "Level atau halaman yang dicari tidak ada di materi saat ini.")
  );
}

// ---------------------------------------------------------------------------
// Routing

const ROUTES = [
  { pattern: /^#?\/?$/, screen: () => levelListScreen() },
  { pattern: /^#\/preview\/([^/]+)$/, screen: (id) => previewScreen(decodeURIComponent(id)) },
  { pattern: /^#\/content-check$/, screen: () => contentCheckScreen() },
];

function render() {
  const hash = location.hash;
  const route = ROUTES.find((r) => r.pattern.test(hash));
  const screen = route ? route.screen(...hash.match(route.pattern).slice(1)) : notFoundScreen();
  app.replaceChildren(screen);
}

function navigate() {
  render();
  window.scrollTo(0, 0);
  app.querySelector("h1")?.focus({ preventScroll: true });
}

async function boot() {
  app.replaceChildren(h("p", { class: "loading" }, "Memuat materi…"));
  const result = await loadContent(CONTENT_URL);
  if (!result.content) {
    app.replaceChildren(contentErrorScreen(result));
    return;
  }
  view.content = result.content;
  view.warnings = result.warnings;
  window.addEventListener("hashchange", navigate);
  render();
}

boot();
