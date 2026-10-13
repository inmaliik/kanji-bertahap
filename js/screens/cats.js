// The cat collection and the rescue moment (D-121).
//
// Collection (#/kucing, from the menu outside missions and reviews): every
// mission's cat, by world and region. A free cat shows its layers and name; a
// cat not free yet is its body shape in the silhouette color, without name,
// pattern or accessory, labelled only with its chapter and mission.
//
// Rescue moment: right after a mission is passed, once per cat. The cat pops
// up with a small sparkle, its name, and goes into the collection. No sound,
// no waiting: it closes by itself after a few seconds, and a tap anywhere or
// the button closes it at once.

import { h } from "../dom.js";
import { catsOf, markRescueShown, regionCats } from "../cats.js";
import { catFigure } from "../cat-figure.js";
import { saveProgress } from "../state.js";
import { uiLabel } from "../ui-labels.js";
import { backLink } from "./common.js";
import { menuBar } from "./menu.js";

/** How long the rescue moment stays before it closes by itself. */
export const RESCUE_MS = 2600;

const missionLabel = (region, index) => `Bab ${region.chapter} · Misi ${index + 1}`;

function catCard(app, { cat, free, region, index }) {
  const where = missionLabel(region, index);
  return h(
    "li",
    { class: `cat-card${free ? "" : " cat-card--locked"}` },
    catFigure(app, cat, { silhouette: !free, className: "cat-card__figure" }),
    free ? h("p", { class: "cat-card__name" }, cat.name) : h("p", { class: "cat-card__name cat-card__name--locked" }, "Belum bebas"),
    h("p", { class: "cat-card__where" }, where),
    h("span", { class: "sr-only" }, free ? `Kucing ${cat.name}, dari ${where}.` : `Kucing dari ${where}, belum bebas.`)
  );
}

export function catsScreen(app) {
  const { model, progress } = app;
  const all = catsOf(progress, model.regions);
  const free = all.filter((c) => c.free).length;
  return h(
    "div",
    { class: "screen cats-screen" },
    backLink("#/", "Peta"),
    h("h1", { tabindex: "-1" }, "Koleksi kucing"),
    h("p", { class: "cats-screen__total" }, h("span", { "aria-hidden": "true" }, "🐾 "), `${free} dari ${all.length} kucing sudah bebas`),
    h("p", { class: "muted" }, "Setiap misi yang tuntas membebaskan satu kucing. Kucing yang belum bebas tampil sebagai bayangan."),
    model.worlds.map((world) =>
      h(
        "section",
        { class: "cats-world", "aria-labelledby": `cats-world-${world.number}` },
        model.worlds.length > 1
          ? h("h2", { id: `cats-world-${world.number}`, class: "cats-world__title" }, `Dunia ${world.number} · `, uiLabel(app, world.bookLabel, { gloss: false }))
          : h("h2", { id: `cats-world-${world.number}`, class: "sr-only" }, `Dunia ${world.number}`),
        world.regions.map((region) => {
          const cats = regionCats(progress, region);
          if (!cats.length) return null;
          return h(
            "section",
            { class: "cats-region" },
            h("h3", { class: "cats-region__title" }, `Bab ${region.chapter}`, h("span", { class: "cats-region__count" }, ` · ${cats.filter((c) => c.free).length} dari ${cats.length}`)),
            h("ul", { class: "cat-grid" }, cats.map((c) => catCard(app, { ...c, region })))
          );
        })
      )
    ),
    menuBar(app, "cats")
  );
}

/**
 * The rescue moment over the mission's result. Marked as shown at once, so a
 * reload never plays it again.
 * @param {() => void} onClose called once, when the moment closes
 */
export function rescueMoment(app, quest, region, onClose) {
  markRescueShown(app.progress, quest);
  saveProgress(app.progress);
  let closed = false;
  const button = h("button", { type: "button", class: "button button--primary rescue__go" }, "Lanjut");
  const overlay = h(
    "div",
    { class: "rescue", role: "dialog", "aria-modal": "true", "aria-labelledby": "rescue-title" },
    h(
      "div",
      { class: "rescue__card" },
      h("div", { class: "rescue__stage" }, h("span", { class: "rescue__sparkle", "aria-hidden": "true" }), catFigure(app, quest.cat, { className: "rescue__cat" })),
      h("p", { id: "rescue-title", class: "rescue__title" }, "Kucing bebas!"),
      h("p", { class: "rescue__name" }, quest.cat.name),
      h("p", { class: "rescue__note" }, `Dari ${missionLabel(region, region.quests.indexOf(quest))}. Kucing ini masuk ke koleksi kucing.`),
      button
    )
  );
  const close = () => {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    overlay.remove();
    onClose();
  };
  const timer = setTimeout(close, RESCUE_MS);
  overlay.addEventListener("click", close);
  queueMicrotask(() => button.focus({ preventScroll: true }));
  return overlay;
}
