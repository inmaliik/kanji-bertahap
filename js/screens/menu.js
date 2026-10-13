// The map menu: Index, kana guide, Settings (D-69). Shown on every screen
// outside quests and reviews, never inside them, so the furigana setting and
// the index cannot be used in the middle of a question.

import { h } from "../dom.js";
import { assetImage } from "../assets.js";

const DOORS = [
  { key: "index", href: "#/index", label: "Index", asset: "menu-index" },
  { key: "kana", href: "#/kana", label: "Panduan kana", asset: "menu-kana" },
  { key: "settings", href: "#/settings", label: "Pengaturan", asset: "menu-pengaturan" },
];

/**
 * @param {object} app
 * @param {string|null} [current] key of the screen being shown
 */
export function menuBar(app, current = null) {
  return h(
    "nav",
    { class: "menu", "aria-label": "Menu" },
    DOORS.map((door) =>
      h(
        "a",
        { class: "menu__door", href: door.href, "aria-current": door.key === current ? "page" : null },
        assetImage(app, door.asset, { className: "menu__icon" }),
        h("span", { class: "menu__label" }, door.label)
      )
    )
  );
}
