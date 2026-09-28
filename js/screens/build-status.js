// TEMPORARY home screen of the desain-peta branch, step 1 (DECISIONS D-54).
// The v2 content loads and validates, but the quest engine (step 2) and the
// map (step 3) do not exist yet, so this screen only lists what was loaded.
// It is replaced by the map screen in step 3.

import { h, ja } from "../dom.js";
import { APP_TITLE } from "../config.js";
import { buildModel, questConversations } from "../model.js";

export function buildStatusScreen(app) {
  const model = buildModel(app.content);
  const placeholders = [...model.conversations.values()].filter(({ conversation }) => conversation.isPlaceholder).length;

  return h(
    "div",
    { class: "screen" },
    h("h1", { tabindex: "-1" }, APP_TITLE),
    h(
      "p",
      { class: "notice notice--warning", role: "note" },
      "⚠ Versi peta sedang dibangun (langkah 1 dari 5: struktur data). Permainan belum bisa dimainkan di versi ini. ",
      "Versi yang bisa dimainkan ada di cabang main."
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
          {},
          region.quests.map((quest) => {
            const kotoba = model.kotoba.get(quest.kotoba);
            const conversations = questConversations(quest);
            return h(
              "li",
              {},
              `${quest.id}: `,
              ja("span", {}, kotoba?.word ?? quest.kotoba),
              ` · kanji sasaran `,
              ja("span", {}, quest.targetKanji.join("、")),
              ` · ${conversations.length} percakapan`
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
