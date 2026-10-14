// The map menu: Index, cat collection, story scenes, kana guide, Settings (D-69, D-121, D-124). Shown on every screen
// outside quests and reviews, never inside them, so the furigana setting and
// the index cannot be used in the middle of a question.

import { h } from "../dom.js";
import { assetImage } from "../assets.js";

const DOORS = [
  { key: "index", href: "#/index", label: "Index", asset: "menu-index" },
  { key: "cats", href: "#/kucing", label: "Kucing", asset: "menu-kucing" },
  { key: "story", href: "#/cerita", label: "Cerita", asset: "menu-cerita" },
  { key: "kana", href: "#/kana", label: "Panduan kana", asset: "menu-kana" },
  // A soft hyphen: with five doors a phone gives each about 60 px, and "Pengaturan" breaks as Penga-turan.
  { key: "settings", href: "#/settings", label: "Penga\u00ADturan", asset: "menu-pengaturan" },
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
