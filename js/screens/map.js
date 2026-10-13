// The map (home screen) as places in a town (D-103): the team's map image,
// one location per region with its own icon, the progress percentage under
// it, paths between the locations in play order, and an exploration badge
// for the whole map. A level and XP bar sits on top (D-105) and stays in view
// while scrolling; the menu is the bar at the bottom of the screen (D-69).
//
// The image is a column of segments scrolled vertically (D-108,
// js/map-layout.js). A segment's image is fetched only when it comes within
// one screen of the view; a segment the team has not drawn yet shows its own
// brief.
//
// Region shapes and the town are part of the image; code never draws borders.
// Locked locations are drawn by code (faded, with a lock badge), so the team
// draws one icon per location. Pins show the chapter, the location's name
// (a region title, checked like all region texts, D-79), status and
// percentage — never material. The region list below repeats the same
// information for screen readers and small screens.
//
// #/region/B06 shows the same map with the region's sheet over it.
//
// Every world has its own map (D-117). #/dunia/2 shows world 2; #/ shows the
// world the player looked at last, so "back to the map" returns there. When
// the material has more than one world, tabs above the map switch worlds;
// worlds open freely.

import { h } from "../dom.js";
import { APP_TITLE } from "../config.js";
import { columnPoint, placeLocations, segmentsOf } from "../map-layout.js";
import { currentWorld, nodeStatuses, worldSummary } from "../progression.js";
import { saveProgress, storageUsage } from "../state.js";
import { uiLabel } from "../ui-labels.js";
import { exploration, levelOf, xpOf } from "../xp.js";
import { recordScore } from "../leaderboard.js";
import { currentMode } from "../event-log.js";
import { leaderboardAvailable } from "../session-mode.js";
import { menuBar } from "./menu.js";
import { regionCats } from "../cats.js";
import { catFigure } from "../cat-figure.js";
import { rewardMapCard } from "./rewards.js";
import { regionHref } from "./quest.js";
import { regionSheet } from "./region.js";

const STATE = {
  locked: { icon: "🔒", text: "Terkunci" },
  available: { icon: "▶", text: "Terbuka" },
  in_progress: { icon: "▶", text: "Sedang dikerjakan" },
  review: { icon: "★", text: "Menunggu ulangan" },
  done: { icon: "✓", text: "Tuntas" },
};

/** The location to scroll to: the open sheet's, else the one the player is working on. */
function scrollTarget(summaries, sheetRegion) {
  if (sheetRegion) return summaries.find((s) => s.region.id === sheetRegion) ?? null;
  for (const state of ["in_progress", "review", "available"]) {
    const found = summaries.find((s) => s.state === state);
    if (found) return found;
  }
  return summaries.at(-1) ?? null;
}

/**
 * One segment of the map image. Until the file exists, the segment shows
 * its brief: file name, size, the locations it holds and its neighbours,
 * whose edges it must meet (ASSETS.md).
 */
function segmentBox(app, { world, name, n, count, chapters, temporary, observer }) {
  const slot = app.assets?.get("potongan-peta");
  const path = name && slot?.pattern ? slot.pattern.replace("{segment}", name) : null;
  const box = h("div", { class: "map-segment", style: slot ? `aspect-ratio: ${slot.width} / ${slot.height}` : "aspect-ratio: 3 / 4" });
  const placeholder = () =>
    box.replaceChildren(
      h(
        "div",
        { class: "map-segment__placeholder" },
        h(
          "span",
          { class: "map-segment__brief" },
          h("span", { class: "map-segment__title" }, `Dunia ${world}: potongan peta ${n} dari ${count}`),
        h("span", {}, path ?? "belum terdaftar di data/map.json"),
        slot ? h("span", {}, `${slot.width} × ${slot.height} ${slot.format}, tidak transparan, maks ${slot.maxKB} KB`) : null,
        h("span", {}, chapters.length ? `Lokasi: ${chapters.map((c) => `Bab ${c}`).join(", ")}${temporary ? " (posisi sementara)" : ""}` : "Belum ada lokasi"),
        h("span", {}, `Tepi atas: ${n === 1 ? "ujung atas peta" : `menyambung potongan ${n - 1}`}`),
          h("span", {}, `Tepi bawah: ${n === count ? "ujung bawah peta" : `menyambung potongan ${n + 1}`}`)
        )
      )
    );
  if (!path) {
    placeholder();
    return box;
  }
  const img = h("img", { class: "asset__img", alt: "", decoding: "async" });
  img.addEventListener("error", placeholder, { once: true });
  box.append(img);
  box.load = () => img.setAttribute("src", path);
  if (observer) observer.observe(box);
  else box.load();
  return box;
}

/** Cats shown next to a location (D-121): free cats only, at most this many, then a count. */
export const CATS_ON_MAP = 3;

/** The free cats of a region beside its location, with a count of free cats over all its cats. */
function locationCats(app, free, total) {
  if (!free.length) return null;
  return h(
    "span",
    { class: "location__cats", "aria-hidden": "true" },
    h("span", { class: "location__cat-row" }, free.slice(-CATS_ON_MAP).map((c) => catFigure(app, c.cat, { className: "location__cat" }))),
    h("span", { class: "location__cat-count" }, `🐾 ${free.length}/${total}`)
  );
}

/** Icon of a location: assets/lokasi/<region id>.png, or a drawn disc until the team supplies it. */
function locationIcon(app, region) {
  const slot = app.assets?.get("lokasi");
  const box = h("span", { class: "location__icon" });
  const fallback = () => box.replaceChildren(h("span", { class: "location__placeholder" }, region.id));
  const path = slot?.pattern?.replace("{regionId}", region.id);
  if (!path) {
    fallback();
    return box;
  }
  const img = h("img", { class: "asset__img", src: path, alt: "" });
  img.addEventListener("error", fallback, { once: true });
  box.append(img);
  return box;
}

/** SVG paths between consecutive locations: an ink dashed line under the team's motif tile. */
function paths(app, points) {
  if (points.length < 2) return null;
  const ns = "http://www.w3.org/2000/svg";
  const el = (tag, attrs) => {
    const node = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  };
  const svg = el("svg", { class: "map__paths", viewBox: "0 0 100 100", preserveAspectRatio: "none", "aria-hidden": "true" });
  const motif = app.assets?.get("jalur");
  const d = points.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
  svg.append(el("path", { d, class: "map__path" }));
  // The motif tile is optional: it is laid under the dashed line only once
  // the file has loaded, so a missing file never shows broken-image tiles.
  if (motif?.path) {
    const probe = new Image();
    probe.addEventListener("load", () => {
      const defs = el("defs", {});
      const pattern = el("pattern", { id: "path-motif", patternUnits: "userSpaceOnUse", width: 4, height: 4 });
      pattern.append(el("image", { href: motif.path, width: 4, height: 4 }));
      defs.append(pattern);
      svg.prepend(defs, el("path", { d, class: "map__path-motif", stroke: "url(#path-motif)" }));
    });
    probe.src = motif.path;
  }
  return svg;
}

function levelBar(app) {
  const { xp } = xpOf(app.model, app.progress);
  const { level, floor, next } = levelOf(xp);
  return h(
    "div",
    { class: "level-bar" },
    h("span", { class: "level-bar__level" }, `Level ${level}`),
    h(
      "span",
      { class: "level-bar__track" },
      h("label", { for: "xp-bar", class: "level-bar__xp" }, next ? `${xp} / ${next} XP` : `${xp} XP · level tertinggi`),
      h("progress", { id: "xp-bar", max: next ? next - floor : 1, value: next ? xp - floor : 1 })
    )
  );
}

/** The world the map shows, remembered so that links back to the map return to it. */
function shownWorld(app, sheetRegion, number) {
  const { model, progress } = app;
  const region = sheetRegion ? model.regions.find((r) => r.id === sheetRegion) : null;
  const wanted = region ? region.world : number;
  const world = model.worlds.find((w) => w.number === wanted) ?? currentWorld(model, progress);
  if (progress.world !== world.number) {
    progress.world = world.number;
    saveProgress(progress);
  }
  return world;
}

/** Tabs between worlds, only when the material has more than one (D-117). */
function worldTabs(app, shown, statuses) {
  const { model, progress } = app;
  if (model.worlds.length < 2) return null;
  return h(
    "nav",
    { class: "world-tabs", "aria-label": "Dunia" },
    model.worlds.map((world) => {
      const summary = worldSummary(model, progress, world, statuses);
      return h(
        "a",
        { class: "world-tabs__tab", href: `#/dunia/${world.number}`, "aria-current": world === shown ? "page" : null },
        h("span", { class: "world-tabs__name" }, `Dunia ${world.number}${summary.complete ? " ✓" : ""}`),
        // The book title from data/ui.json, with furigana like every Japanese label (D-76).
        h("span", { class: "world-tabs__book" }, uiLabel(app, world.bookLabel, { gloss: false }))
      );
    })
  );
}

export function mapScreen(app, { sheetRegion = null, world: worldNumber = null } = {}) {
  const { model, progress } = app;
  const world = shownWorld(app, sheetRegion, worldNumber);
  const statuses = nodeStatuses(model, progress);
  const worldInfo = worldSummary(model, progress, world, statuses);
  const summaries = worldInfo.regions;
  const usage = storageUsage();
  // The badge counts the world on screen only (D-122).
  const explored = exploration(model, progress, world.regions);
  const mode = currentMode(app);

  // Exhibition mode keeps this player's score on the device board (D-106).
  const { xp } = xpOf(model, progress);
  recordScore(mode, { playerId: progress.playerId, character: progress.character, xp, level: levelOf(xp).level });

  const segmentNames = segmentsOf(app.mapLayout, world.number);
  const { places, segmentCount } = placeLocations(world.regions, segmentNames);
  const points = places.map((p) => columnPoint(p, segmentCount));
  const target = scrollTarget(summaries, sheetRegion);
  // Segments more than one screen away from the view load later (D-108).
  const observer =
    typeof IntersectionObserver === "function"
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              observer.unobserve(entry.target);
              entry.target.load();
            }
          },
          { rootMargin: "100% 0px" }
        )
      : null;
  const segments = Array.from({ length: segmentCount }, (_, i) => {
    const here = summaries.filter((s, j) => places[j].segment === i + 1);
    return segmentBox(app, {
      world: world.number,
      name: segmentNames[i],
      n: i + 1,
      count: segmentCount,
      chapters: here.map((s) => s.region.chapter),
      temporary: here.some((s) => places[summaries.indexOf(s)].temporary),
      observer,
    });
  });
  const pins = summaries.map((s, i) => {
    const { x, y } = points[i];
    const state = STATE[s.state];
    const cats = regionCats(progress, s.region);
    const free = cats.filter((c) => c.free);
    return h(
      "a",
      {
        class: `location location--${s.state}`,
        href: regionHref(s.region),
        style: `left: ${x}%; top: ${y}%`,
        "data-scroll-target": s === target ? "" : null,
        "aria-label":
          `Bab ${s.region.chapter}, ${s.region.title}, ${state.text}, ${s.percent} persen` +
          (free.length ? `, ${free.length} dari ${cats.length} kucing bebas` : ""),
      },
      h("span", { class: "location__badge", "aria-hidden": "true" }, state.icon),
      locationIcon(app, s.region),
      locationCats(app, free, cats.length),
      h("span", { class: "location__name", "aria-hidden": "true" }, `Bab ${s.region.chapter}`),
      h("span", { class: "location__percent", "aria-hidden": "true" }, `${s.percent}%`)
    );
  });

  return h(
    "div",
    { class: "screen map-screen" },
    h("h1", { tabindex: sheetRegion ? null : "-1", class: "map-screen__title" }, APP_TITLE),
    h(
      "div",
      { class: "map-top" },
      levelBar(app),
      h("p", { class: "map__explored" }, h("span", { "aria-hidden": "true" }, "🧭 "), uiLabel(app, "exploration"), ` Dunia ${world.number}: ${explored}%`)
    ),
    worldTabs(app, world, statuses),
    // The reward card (D-123): never in research mode.
    rewardMapCard(app),
    worldInfo.complete ? h("p", { class: "notice notice--success" }, `✓ Dunia ${world.number} tamat.`) : null,
    app.notices.map((n) => h("p", { class: `notice notice--${n.kind}` }, n.text)),
    usage.warning
      ? h("p", { class: "notice notice--warning", role: "alert" }, "⚠ Penyimpanan perangkat hampir penuh. Minta petugas mengekspor dan mengosongkan log di Pengaturan.")
      : null,
    h(
      "div",
      { class: "map", role: "group", "aria-label": `Peta Dunia ${world.number}` },
      segments,
      h("div", { class: "map__layer" }, paths(app, points), pins)
    ),
    leaderboardAvailable(mode) ? h("a", { class: "button button--block", href: "#/peringkat" }, "🏆 Papan peringkat") : null,
    h("h2", { class: "map-list__title" }, `Wilayah Dunia ${world.number} · `, uiLabel(app, world.bookLabel, { gloss: false })),
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
                `${state.text} · ${s.passed} dari ${s.total} misi (${s.percent}%) · `,
                uiLabel(app, "review", { gloss: false }),
                s.reviewPassed ? " ✓" : " belum",
                (() => {
                  const cats = regionCats(progress, s.region);
                  return cats.length ? ` · 🐾 ${cats.filter((c) => c.free).length}/${cats.length}` : null;
                })()
              )
            )
          )
        );
      })
    ),
    h("p", { class: "map-screen__about" }, h("a", { href: "#/about" }, "Tentang aplikasi")),
    menuBar(app),
    sheetRegion ? regionSheet(app, sheetRegion) : null
  );
}
