// Region window (chapter intro), shown as a sheet sliding up over the map
// (D-103): what the chapter covers, its quests with progress, its review
// (復習), and one start button for the next thing to do.
//
// D-79: before a quest's intro conversation has been read, the list shows
// only its number and Indonesian meaning; afterwards the kotoba itself, with
// its reading once that reading is no longer pending. The list fills up as
// the player learns. The note on kanji that come back with another reading
// (D-56) likewise uses only kotoba the player has already met.

import { h, ja } from "../dom.js";
import { FURIGANA_MODE, STATUS } from "../state.js";
import { nodeStatuses, questIntroduced, questPassed, questStarted, regionSummary } from "../progression.js";
import { kotobaVisible, questByKotoba, readingSettled } from "../reveal.js";
import { isIncompleteQuest, kotobaWithKanji } from "../model.js";
import { uiLabel } from "../ui-labels.js";
import { kotobaWithReading, LABELS, READING_DISPLAY } from "./common.js";
import { questHref, reviewHref } from "./quest.js";

function questStatus(progress, quest) {
  if (questPassed(progress, quest)) return { cls: "passed", text: "✓ Tuntas", action: "Buka lagi" };
  if (questStarted(progress, quest)) return { cls: "in_progress", text: "Sedang dikerjakan", action: "Lanjutkan" };
  return { cls: "available", text: "Belum dimulai", action: "Mulai" };
}

/** The sheet frame: a backdrop that closes it, and a labelled dialog. */
function sheet(title, ...content) {
  return h(
    "div",
    { class: "sheet-layer" },
    h("a", { class: "sheet-backdrop", href: "#/", "aria-label": "Tutup" }),
    h(
      "section",
      { class: "sheet", role: "dialog", "aria-modal": "true", "aria-labelledby": "sheet-title" },
      h("span", { class: "sheet__grip", "aria-hidden": "true" }),
      h(
        "div",
        { class: "sheet__head" },
        h("h1", { id: "sheet-title", tabindex: "-1" }, title),
        h("a", { class: "button sheet__close", href: "#/" }, h("span", { "aria-hidden": "true" }, "✕ "), "Tutup")
      ),
      content
    )
  );
}

/** Where the start button leads: the first quest not passed yet, else the review. */
function nextStep(app, region, reviewStatus) {
  const index = region.quests.findIndex((q) => !questPassed(app.progress, q));
  if (index !== -1) {
    const started = questStarted(app.progress, region.quests[index]);
    return { href: questHref(region, index), label: `${started ? "Lanjutkan" : "Mulai"} Misi ${index + 1}` };
  }
  if (reviewStatus !== STATUS.PASSED) return { href: reviewHref(region), label: reviewStatus === STATUS.IN_PROGRESS ? "Lanjutkan ulangan" : "Mulai ulangan" };
  return null;
}

export function regionSheet(app, regionKey) {
  const { model, progress } = app;
  const region = model.regions.find((r) => r.id === regionKey);
  if (!region) return sheet("Wilayah tidak ditemukan", h("p", {}, "Wilayah ini tidak ada di materi saat ini."));
  const statuses = nodeStatuses(model, progress);
  const summary = regionSummary(model, progress, region, statuses);
  const byKotoba = questByKotoba(model);
  const showReading = progress.settings.furiganaMode !== FURIGANA_MODE.NEVER;
  const title = `Bab ${region.chapter} — ${region.title}`;

  if (summary.state === "locked") {
    return sheet(title, h("p", { class: "notice notice--warning" }, "🔒 Wilayah ini terbuka setelah wilayah sebelumnya di dunia ini dan ulangannya tuntas."));
  }

  // Kotoba of the player's earlier encounters that share a kanji with `quest` but are read differently.
  function recurringKanji(quest, kotoba) {
    return quest.targetKanji.flatMap((ch) =>
      kotobaWithKanji(model, ch, region.chapter, kotoba)
        .filter((other) => other.readingType !== kotoba.readingType && kotobaVisible(model, progress, other, byKotoba))
        .map((other) => ({ ch, other }))
    );
  }

  const questRows = region.quests.map((quest, i) => {
    const kotoba = model.kotoba.get(quest.kotoba);
    const status = questStatus(progress, quest);
    const introduced = questIntroduced(progress, quest) || questPassed(progress, quest);
    const word = introduced
      ? ja("span", { class: "quest-row__word" }, kotobaWithReading(kotoba, { display: showReading && readingSettled(model, progress, kotoba, byKotoba) ? READING_DISPLAY.RUBY : READING_DISPLAY.NONE }))
      : null;
    const recurring = introduced ? recurringKanji(quest, kotoba) : [];
    return h(
      "li",
      { class: `quest-row quest-row--${status.cls}` },
      h(
        "div",
        { class: "quest-row__main" },
        h("p", { class: "quest-row__title" }, `Misi ${i + 1}`),
        h("p", { class: "quest-row__kotoba" }, word, word ? " · " : null, kotoba.meaning),
        h("p", { class: `quest-row__status status status--${status.cls}` }, status.text),
        isIncompleteQuest(quest) ? h("p", { class: "quest-row__note" }, "⚠ Belum lengkap: belum ada uji konteks.") : null,
        recurring.map(({ ch, other }) =>
          h(
            "p",
            { class: "quest-row__note" },
            "Kanji ",
            ja("span", { class: "inline-kanji" }, ch),
            " juga ada di ",
            ja("span", {}, other.word),
            ` (${LABELS.readingType[other.readingType]}): cara bacanya berbeda.`
          )
        )
      ),
      h("a", { class: "button quest-row__action", href: questHref(region, i) }, status.action)
    );
  });

  const reviewStatus = statuses.get(`REV-${region.id}`);
  const reviewRow = h(
    "section",
    { class: "card review-row", "aria-labelledby": "review-title" },
    h("h2", { id: "review-title", class: "review-row__title" }, uiLabel(app, "review")),
    reviewStatus === STATUS.LOCKED
      ? h("p", { class: "muted" }, "🔒 Terbuka setelah semua misi di wilayah ini tuntas. Wilayah berikutnya terbuka setelah ulangan ini tuntas.")
      : [
          h("p", {}, reviewStatus === STATUS.PASSED ? "✓ Tuntas. Wilayah ini selesai." : "Wajib diselesaikan sebelum wilayah berikutnya terbuka."),
          h(
            "a",
            { class: `button button--block ${reviewStatus === STATUS.PASSED ? "" : "button--primary"}`, href: reviewHref(region) },
            reviewStatus === STATUS.PASSED ? "Buka lagi" : reviewStatus === STATUS.IN_PROGRESS ? "Lanjutkan ulangan" : "Mulai ulangan"
          ),
        ]
  );

  const next = nextStep(app, region, reviewStatus);
  return sheet(
    title,
    h(
      "div",
      { class: "mastery" },
      h("label", { for: "region-progress", class: "mastery__label" }, `${summary.passed} dari ${summary.total} misi tuntas (${summary.percent}%)`),
      h("progress", { id: "region-progress", max: summary.total, value: summary.passed })
    ),
    h(
      "section",
      { class: "card region__intro", "aria-labelledby": "intro-title" },
      h("h2", { id: "intro-title" }, "Di bab ini"),
      h("p", {}, region.intro.summary),
      region.intro.points.length ? h("ul", {}, region.intro.points.map((p) => h("li", {}, p))) : null
    ),
    h("h2", {}, "Misi"),
    h(
      "p",
      { class: "muted" },
      "Misi boleh dikerjakan dalam urutan apa pun. Kotoba tiap misi muncul di daftar ini setelah kamu menyimak percakapan pengantarnya."
    ),
    h("ul", { class: "quest-list" }, questRows),
    reviewRow,
    next ? h("div", { class: "sheet__actions" }, h("a", { class: "button button--primary button--block", href: next.href }, next.label)) : null
  );
}
