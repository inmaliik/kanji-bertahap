// The map (home screen): the team's map image with one pin per region, and
// the same regions as a list for screen readers and small screens (D-64).
// Region shapes are part of the image; code never draws borders. Pins show
// chapter, status and percentage only, never material (D-79).

import { h } from "../dom.js";
import { APP_TITLE } from "../config.js";
import { assetImage } from "../assets.js";
import { nodeStatuses, regionSummary } from "../progression.js";
import { storageUsage } from "../state.js";
import { uiLabel } from "../ui-labels.js";
import { menuBar } from "./menu.js";
import { regionHref } from "./quest.js";

const STATE = {
  locked: { icon: "🔒", text: "Terkunci" },
  available: { icon: "▶", text: "Terbuka" },
  in_progress: { icon: "▶", text: "Sedang dikerjakan" },
  review: { icon: "★", text: "Menunggu ulangan" },
  done: { icon: "✓", text: "Tuntas" },
};

/** Pin position in percent. Regions without a pin get a temporary one, top to bottom by chapter. */
function pinPosition(region, index, count) {
  if (region.pin) return region.pin;
  const step = count > 1 ? 80 / (count - 1) : 0;
  return { x: 50, y: 10 + index * step };
}

export function mapScreen(app) {
  const { model, progress } = app;
  const statuses = nodeStatuses(model, progress);
  const summaries = model.regions.map((region) => regionSummary(model, progress, region, statuses));
  const usage = storageUsage();

  const pins = summaries.map((s, i) => {
    const { x, y } = pinPosition(s.region, i, summaries.length);
    const state = STATE[s.state];
    return h(
      "a",
      {
        class: `map-pin map-pin--${s.state}`,
        href: regionHref(s.region),
        style: `left: ${x}%; top: ${y}%`,
        "aria-label": `Bab ${s.region.chapter}, ${state.text}, ${s.percent} persen`,
      },
      h("span", { class: "map-pin__icon", "aria-hidden": "true" }, state.icon),
      h("span", { class: "map-pin__text", "aria-hidden": "true" }, `Bab ${s.region.chapter} · ${s.percent}%`)
    );
  });

  return h(
    "div",
    { class: "screen map-screen" },
    h("h1", { tabindex: "-1", class: "map-screen__title" }, APP_TITLE),
    menuBar(app),
    app.notices.map((n) => h("p", { class: `notice notice--${n.kind}` }, n.text)),
    usage.warning
      ? h("p", { class: "notice notice--warning", role: "alert" }, "⚠ Penyimpanan perangkat hampir penuh. Minta petugas mengekspor dan mengosongkan log di Pengaturan.")
      : null,
    h("div", { class: "map", role: "group", "aria-label": "Peta wilayah" }, assetImage(app, "peta", { className: "map__image" }), pins),
    h("h2", { class: "map-list__title" }, "Wilayah"),
    h(
      "ul",
      { class: "map-list" },
      summaries.map((s) => {
        const state = STATE[s.state];
        return h(
          "li",
          {},
          h(
            "a",
            { class: `map-list__item map-list__item--${s.state}`, href: regionHref(s.region) },
            h("span", { class: "map-list__icon", "aria-hidden": "true" }, state.icon),
            h(
              "span",
              { class: "map-list__body" },
              h("span", { class: "map-list__name" }, `Bab ${s.region.chapter} — ${s.region.title}`),
              h(
                "span",
                { class: "map-list__meta" },
                `${state.text} · ${s.passed} dari ${s.total} quest (${s.percent}%) · `,
                uiLabel(app, "review", { gloss: false }),
                s.reviewPassed ? " ✓" : " belum"
              )
            )
          )
        );
      })
    )
  );
}
