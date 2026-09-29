// TEMPORARY home screen of the desain-peta branch (DECISIONS D-54): lists the
// regions and quests and opens a quest. Replaced by the map screen in step 3,
// which also brings region locking and reviews.

import { h, ja } from "../dom.js";
import { APP_TITLE } from "../config.js";
import { questConversations } from "../model.js";
import { STATUS } from "../state.js";

export function buildStatusScreen(app) {
  const model = app.model;
  const placeholders = [...model.conversations.values()].filter(({ conversation }) => conversation.isPlaceholder).length;

  return h(
    "div",
    { class: "screen" },
    h("h1", { tabindex: "-1" }, APP_TITLE),
    h(
      "p",
      { class: "notice notice--warning", role: "note" },
      "⚠ Versi peta sedang dibangun (langkah 2 dari 5: quest). Peta, penguncian wilayah, dan ulangan wilayah belum ada; ",
      "semua quest di bawah bisa langsung dimainkan."
    ),
    app.notices.map((n) => h("p", { class: `notice notice--${n.kind}` }, n.text)),
    h("p", {}, `Materi dimuat: revisi ${app.content.contentRevision}, ${model.regions.length} wilayah, ${model.quests.size} quest, ${model.conversations.size} percakapan.`),
    placeholders
      ? h("p", { class: "notice notice--error", role: "note" }, `✗ ${placeholders} percakapan masih SEMENTARA dan wajib diganti tim konten.`)
      : null,
    model.regions.map((region) =>
      h(
        "section",
        { class: "card" },
        h("h2", {}, `${region.id} · Bab ${region.chapter} — ${region.title}`),
        h(
          "ul",
          { class: "quest-links" },
          region.quests.map((quest, i) => {
            const kotoba = model.kotoba.get(quest.kotoba);
            const entry = app.progress.quests[quest.id];
            const status = entry?.status === STATUS.PASSED ? "✓ tuntas" : entry ? "sedang dikerjakan" : "belum dimulai";
            return h(
              "li",
              { class: "quest-link" },
              h(
                "a",
                { class: "button button--block", href: `#/quest/${encodeURIComponent(quest.id)}` },
                `Quest ${i + 1} · ${status}`
              ),
              h(
                "p",
                { class: "muted" },
                `${quest.id}: `,
                ja("span", {}, kotoba?.word ?? quest.kotoba),
                ` · kanji sasaran `,
                ja("span", {}, quest.targetKanji.join(", ")),
                ` · ${questConversations(quest).length} percakapan`
              )
            );
          })
        )
      )
    ),
    h(
      "p",
      {},
      h("a", { href: "#/content-check" }, `Pemeriksaan konten (${app.warnings.length} peringatan)`),
      " · ",
      h("a", { href: "#/settings" }, "Pengaturan")
    )
  );
}
