// Kana guide: hiragana and katakana tables from data/kana.json. Reference
// only; opening it is not logged and completes nothing.

import { h, ja } from "../dom.js";
import { menuBar } from "./menu.js";

const SCRIPTS = [
  { key: "hiragana", label: "Hiragana" },
  { key: "katakana", label: "Katakana" },
];

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** @returns {Promise<{kana: object|null, error: string|null}>} never rejects */
export async function loadKana(url) {
  try {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) return { kana: null, error: `File ${url} tidak bisa diambil (HTTP ${response.status}).` };
    const data = JSON.parse(await response.text());
    const ok = isPlainObject(data) && Array.isArray(data.sections) && data.sections.every((s) => Array.isArray(s.columns) && Array.isArray(s.rows));
    return ok ? { kana: data, error: null } : { kana: null, error: `File ${url}: harus berisi { "sections": [...] }.` };
  } catch (err) {
    return { kana: null, error: `File ${url} tidak bisa dibaca: ${err.message}` };
  }
}

let shownScript = "hiragana"; // kept while the page is open

export function kanaScreen(app) {
  const root = h("div", { class: "screen kana" });
  const kana = app.kana;

  function table(section) {
    return h(
      "section",
      { class: "kana-section" },
      h("h2", {}, section.title),
      h(
        "table",
        { class: "kana-table" },
        h("thead", {}, h("tr", {}, section.columns.map((c) => h("th", { scope: "col" }, c)))),
        h(
          "tbody",
          {},
          section.rows.map((row) =>
            h(
              "tr",
              {},
              row.cells.map((cell) =>
                cell
                  ? h("td", {}, ja("span", { class: "kana-table__kana" }, cell[shownScript]), h("span", { class: "kana-table__romaji" }, cell.romaji))
                  : h("td", { class: "kana-table__empty" }, h("span", { class: "sr-only" }, "kosong"))
              )
            )
          )
        )
      )
    );
  }

  function render() {
    // Built through h(), which flattens nested arrays and skips null (T-06).
    const content = h(
      "div",
      {},
      menuBar(app, "kana"),
      h("h1", { tabindex: "-1" }, "Panduan kana"),
      kana
        ? [
            h(
              "div",
              { class: "segmented", role: "group", "aria-label": "Jenis huruf" },
              SCRIPTS.map((s) =>
                h(
                  "button",
                  {
                    type: "button",
                    class: "segmented__option",
                    "aria-pressed": String(s.key === shownScript),
                    onClick: () => {
                      shownScript = s.key;
                      render();
                    },
                  },
                  s.label
                )
              )
            ),
            kana.sections.map(table),
            kana.notes?.length ? h("ul", { class: "kana-notes" }, kana.notes.map((n) => h("li", {}, n))) : null,
          ]
        : h("p", { class: "notice notice--error" }, `✗ Tabel kana tidak bisa dimuat. ${app.kanaError ?? ""}`)
    );
    root.replaceChildren(...content.childNodes);
  }

  render();
  return root;
}
