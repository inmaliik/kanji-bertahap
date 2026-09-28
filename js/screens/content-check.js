// Content warnings page for the content team. Reached from Settings and the
// home screen, not from the player flow.

import { h } from "../dom.js";
import { backLink, issueList } from "./common.js";

export function contentCheckScreen(app) {
  return h(
    "div",
    { class: "screen" },
    backLink("#/", "Beranda"),
    h("h1", { tabindex: "-1" }, "Pemeriksaan konten"),
    app.warnings.length
      ? [
          h("p", {}, `Materi bisa dimuat, tetapi ada ${app.warnings.length} peringatan yang sebaiknya diperiksa tim konten.`),
          issueList(app.warnings),
        ]
      : h("p", {}, "✓ Tidak ada error dan tidak ada peringatan."),
    app.notes.length
      ? [h("h2", {}, "Catatan"), h("p", { class: "muted" }, "Informasi saja; tidak perlu diperbaiki."), issueList(app.notes)]
      : null
  );
}
