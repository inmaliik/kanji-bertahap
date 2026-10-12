// Content and asset checks for the content team and the asset makers.
// Reached from Settings, not from the player flow.

import { h } from "../dom.js";
import { checkAssets } from "../assets.js";
import { backLink, issueList } from "./common.js";

const ASSET_STATE = {
  ok: { icon: "✓", text: "Sudah diganti", cls: "success" },
  placeholder: { icon: "⚠", text: "Masih placeholder", cls: "warning" },
  missing: { icon: "✗", text: "Berkas hilang", cls: "error" },
  problem: { icon: "✗", text: "Perlu diperbaiki", cls: "error" },
};

function assetSection(app) {
  const list = h("ul", { class: "asset-checks", "aria-live": "polite" }, h("li", { class: "muted" }, "Memeriksa aset…"));
  const summary = h("p", {});
  if (app.assets.size) {
    checkAssets(app.assets, app.model ? [...app.model.conversations.keys()] : []).then((results) => {
      const count = (state) => results.filter((r) => r.state === state).length;
      summary.textContent =
        `${results.length} berkas: ${count("ok")} sudah diganti, ${count("placeholder")} masih placeholder, ` +
        `${count("missing") + count("problem")} perlu diperbaiki.`;
      list.replaceChildren(
        ...results.map(({ slot, path, state, messages, bytes }) => {
          const s = ASSET_STATE[state];
          return h(
            "li",
            { class: `asset-check asset-check--${s.cls}` },
            h("p", { class: "asset-check__head" }, h("span", { "aria-hidden": "true" }, `${s.icon} `), `${s.text} · `, h("code", {}, path)),
            h(
              "p",
              { class: "asset-check__spec muted" },
              `${slot.width}×${slot.height} ${slot.format}${slot.transparent ? " transparan" : ""}, maks ${slot.maxKB} KB` +
                (bytes !== undefined ? ` · sekarang ${Math.ceil(bytes / 1024)} KB` : "") +
                ` · ${slot.screen}`
            ),
            messages.map((m) => h("p", { class: "asset-check__message" }, m))
          );
        })
      );
    });
  } else {
    list.replaceChildren(h("li", { class: "notice notice--error" }, "✗ Daftar aset (data/assets.json) tidak bisa dimuat."));
  }
  return h(
    "section",
    { class: "card", "aria-labelledby": "assets-title" },
    h("h2", { id: "assets-title" }, "Aset gambar"),
    h("p", { class: "muted" }, "Spesifikasi setiap slot ada di ASSETS.md. Mengganti aset cukup dengan menimpa berkas bernama sama."),
    app.assetProblems.map((p) => h("p", { class: "notice notice--error" }, `✗ ${p}`)),
    summary,
    list
  );
}

export function contentCheckScreen(app) {
  return h(
    "div",
    { class: "screen" },
    backLink("#/", "Peta"),
    h("h1", { tabindex: "-1" }, "Pemeriksaan konten"),
    h(
      "p",
      { class: "notice notice--warning", role: "note" },
      "⚠ Untuk tim pengembang. Halaman ini memuat isi materi, jadi jangan dibuka di depan peserta."
    ),
    app.warnings.length
      ? [
          h("p", {}, `Materi bisa dimuat, tetapi ada ${app.warnings.length} peringatan yang sebaiknya diperiksa tim konten.`),
          issueList(app.warnings),
        ]
      : h("p", {}, "✓ Tidak ada error dan tidak ada peringatan."),
    app.notes.length
      ? [h("h2", {}, "Catatan"), h("p", { class: "muted" }, "Informasi saja; tidak perlu diperbaiki."), issueList(app.notes)]
      : null,
    h(
      "section",
      { class: "card", "aria-labelledby": "ui-title" },
      h("h2", { id: "ui-title" }, "Label antarmuka (data/ui.json)"),
      app.uiProblems.length
        ? app.uiProblems.map((p) => h("p", { class: "notice notice--warning" }, `⚠ ${p}`))
        : h("p", {}, "✓ Semua label lengkap dan berfurigana.")
    ),
    assetSection(app)
  );
}
