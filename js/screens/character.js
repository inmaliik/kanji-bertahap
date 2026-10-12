// Character selection (D-102): after the welcome screen with the disclaimer,
// before the map. Ready-made characters only for now (decision E). The
// choice belongs to the player: kept in progress, cleared by a reset.

import { h } from "../dom.js";
import { saveProgress } from "../state.js";
import { figureImage } from "../cast.js";

export function characterScreen(app, onDone) {
  const players = app.characters?.players ?? [];
  let chosen = app.progress.character;
  const root = h("div", { class: "screen character-select" });

  function render() {
    const start = h(
      "button",
      {
        type: "button",
        class: "button button--primary button--block",
        disabled: !chosen,
        onClick: () => {
          app.progress.character = chosen;
          saveProgress(app.progress);
          onDone();
        },
      },
      "Mulai"
    );
    const content = h(
      "div",
      {},
      h("h1", { tabindex: "-1" }, "Pilih karaktermu"),
      h("p", {}, "Karakter ini menjadi dirimu di semua percakapan."),
      players.length
        ? h(
            "ul",
            { class: "character-grid" },
            players.map((c) =>
              h(
                "li",
                {},
                h(
                  "button",
                  {
                    type: "button",
                    class: "character-card",
                    "aria-pressed": String(chosen === c.id),
                    onClick: () => {
                      chosen = c.id;
                      render();
                      root.querySelector(`[data-id="${c.id}"]`)?.focus();
                    },
                    "data-id": c.id,
                  },
                  figureImage(c, { className: "character-card__image" }),
                  h("span", { class: "character-card__name" }, c.name),
                  h("span", { class: "character-card__tag" }, chosen === c.id ? "✓ Dipilih" : "Pilih")
                )
              )
            )
          )
        : h("p", { class: "notice notice--error" }, "✗ Data karakter tidak bisa dimuat."),
      h("p", { class: "muted" }, "Pilihan ini tersimpan untuk pemain saat ini dan dikosongkan saat reset."),
      start
    );
    root.replaceChildren(...content.childNodes);
  }

  render();
  return root;
}
