// Kana guide: hiragana and katakana tables from data/kana.json (step 4).

import { h } from "../dom.js";
import { menuBar } from "./menu.js";

export function kanaScreen(app) {
  return h(
    "div",
    { class: "screen" },
    menuBar(app, "kana"),
    h("h1", { tabindex: "-1" }, "Panduan kana"),
    h("p", { class: "notice notice--info" }, "Tabel hiragana dan katakana sedang dibangun (langkah 4).")
  );
}
