// Settings. Step 2 version: progress reset, log count, and content preview
// links. Participant code, CSV export, and remote logging follow in step 4.

import { h } from "../dom.js";
import { getLogStatus } from "../logger.js";
import { resetProgress } from "../state.js";
import { isStorageAvailable } from "../storage.js";
import { backLink } from "./common.js";

export function settingsScreen(app) {
  const root = h("div", { class: "screen" });

  function render(message = null) {
    const log = getLogStatus();

    const confirmBox = h(
      "div",
      { class: "confirm", hidden: true, role: "group", "aria-labelledby": "reset-confirm-title" },
      h("p", { id: "reset-confirm-title", class: "confirm__title" }, "Reset progres di perangkat ini?"),
      h(
        "ul",
        {},
        h("li", {}, "Semua progres level dihapus, termasuk level yang sudah lulus."),
        h("li", {}, "Pemain berikutnya mendapat ID pemain baru."),
        h("li", {}, "Riwayat jawaban (log) tidak dihapus.")
      ),
      h(
        "div",
        { class: "button-row" },
        h(
          "button",
          {
            type: "button",
            class: "button button--danger",
            onClick: () => {
              app.progress = resetProgress();
              render("✓ Progres direset. Perangkat siap untuk pemain berikutnya.");
            },
          },
          "Ya, reset progres"
        ),
        h(
          "button",
          {
            type: "button",
            class: "button",
            onClick: () => {
              confirmBox.hidden = true;
              resetButton.hidden = false;
              resetButton.focus();
            },
          },
          "Batal"
        )
      )
    );

    const resetButton = h(
      "button",
      {
        type: "button",
        class: "button button--danger button--block",
        onClick: () => {
          resetButton.hidden = true;
          confirmBox.hidden = false;
          confirmBox.querySelector("button").focus();
        },
      },
      "Reset progres"
    );

    root.replaceChildren(
      backLink("#/", "Daftar level"),
      h("h1", { tabindex: "-1" }, "Pengaturan"),
      message ? h("p", { class: "notice notice--success", role: "status" }, message) : null,
      isStorageAvailable()
        ? null
        : h("p", { class: "notice notice--warning" }, "⚠ Penyimpanan browser tidak tersedia. Progres dan log tidak akan tersimpan setelah halaman ditutup."),

      h(
        "section",
        { class: "card" },
        h("h2", {}, "Progres pemain"),
        h("p", {}, "ID pemain: ", h("code", {}, app.progress.playerId)),
        h("p", { class: "muted" }, "Gunakan reset saat perangkat dipakai bergantian, misalnya di pameran."),
        resetButton,
        confirmBox
      ),

      h(
        "section",
        { class: "card" },
        h("h2", {}, "Riwayat jawaban"),
        h("p", {}, `${log.storedRows} jawaban tersimpan di perangkat ini.`),
        log.unsavedRows
          ? h("p", { class: "notice notice--warning" }, `⚠ ${log.unsavedRows} jawaban tidak bisa disimpan karena penyimpanan penuh.`)
          : null,
        h("p", { class: "dev-note" }, "Ekspor CSV, kode peserta, dan pengiriman log dibangun di langkah 4.")
      ),

      h(
        "section",
        { class: "card" },
        h("h2", {}, "Materi"),
        h("p", {}, `Revisi materi: ${app.content.contentRevision}`),
        h("p", {}, "Pratinjau materi per level:"),
        h(
          "ul",
          { class: "link-list" },
          app.content.levels.map((l) => h("li", {}, h("a", { href: `#/preview/${encodeURIComponent(l.id)}` }, `${l.id} · ${l.meaning}`)))
        ),
        h("p", {}, h("a", { href: "#/content-check" }, "Pemeriksaan konten"))
      )
    );
    root.querySelector("h1").focus({ preventScroll: true });
  }

  render();
  return root;
}
