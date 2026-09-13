// Level list: grouped by JLPT level and chapter, with derived lock state and
// review levels placed after the level they follow.

import { h, ja } from "../dom.js";
import { APP_TITLE } from "../config.js";
import { groupLevels, jlptLevelsPresent, buildLevelItems } from "../content.js";
import { buildProgression, computeStatuses, evaluateEntry, LEVEL_STATUS } from "../state.js";
import { STAGE_ORDER } from "../session.js";
import { chapterLabel } from "./common.js";

const STATUS_TEXT = {
  [LEVEL_STATUS.LOCKED]: { icon: "🔒", text: "Terkunci" },
  [LEVEL_STATUS.AVAILABLE]: { icon: "▶", text: "Belum dimulai" },
  [LEVEL_STATUS.IN_PROGRESS]: { icon: "◐", text: "Sedang dikerjakan" },
  [LEVEL_STATUS.PASSED]: { icon: "✓", text: "Lulus" },
};

function statusBadge(status, extra) {
  const { icon, text } = STATUS_TEXT[status];
  return h(
    "span",
    { class: `status status--${status}` },
    h("span", { class: "status__icon", "aria-hidden": "true" }, icon),
    extra ? `${text} · ${extra}` : text
  );
}

function card({ href, status, symbol, title, meta }) {
  const locked = status === LEVEL_STATUS.LOCKED;
  const children = [
    symbol,
    h("span", { class: "level-card__body" }, h("span", { class: "level-card__title" }, title), meta),
    locked ? null : h("span", { class: "level-card__chevron", "aria-hidden": "true" }, "›"),
  ];
  return locked
    ? h("div", { class: "level-card level-card--locked", "aria-disabled": "true" }, children)
    : h("a", { class: "level-card", href }, children);
}

/**
 * @param {object} app shared app context from main.js
 */
export function levelListScreen(app) {
  const { content, progress, notices } = app;
  const nodes = buildProgression(content.levels);
  const statuses = computeStatuses(nodes, progress);
  const reviewAfter = new Map(); // level id → review node that follows it
  nodes.forEach((node, i) => {
    if (node.type === "review") reviewAfter.set(nodes[i - 1].id, node);
  });

  const present = jlptLevelsPresent(content.levels);
  if (app.jlptFilter !== "all" && !present.includes(app.jlptFilter)) app.jlptFilter = "all";

  const filterButton = (value, text) =>
    h(
      "button",
      {
        type: "button",
        class: "chip",
        "aria-pressed": String(app.jlptFilter === value),
        onClick: () => {
          app.jlptFilter = value;
          app.render();
        },
      },
      text
    );

  const levelCard = (level) => {
    const status = statuses.get(level.id);
    let extra = null;
    if (status === LEVEL_STATUS.IN_PROGRESS) {
      const items = buildLevelItems(level);
      const ids = STAGE_ORDER.flatMap((s) => items[s]).map((i) => i.id);
      const { mastered, total } = evaluateEntry(ids, progress.levels[level.id], { requiresProduction: true });
      extra = `${mastered}/${total} item`;
    }
    return card({
      href: `#/play/${encodeURIComponent(level.id)}`,
      status,
      symbol: ja("span", { class: "level-card__kanji" }, level.kanji),
      title: level.meaning,
      meta: h("span", { class: "level-card__meta" }, `${level.id} · `, statusBadge(status, extra)),
    });
  };

  const reviewCard = (node) => {
    const status = statuses.get(node.id);
    const first = node.coveredLevelIds[0];
    const last = node.coveredLevelIds[node.coveredLevelIds.length - 1];
    return card({
      href: `#/play/${node.id}`,
      status,
      symbol: h("span", { class: "level-card__symbol", "aria-hidden": "true" }, "↻"),
      title: `Level ulangan ${node.id}`,
      meta: h("span", { class: "level-card__meta" }, `Campuran ${first}–${last} · `, statusBadge(status)),
    });
  };

  const groups = groupLevels(content.levels).filter((g) => app.jlptFilter === "all" || g.jlptLevel === app.jlptFilter);

  return h(
    "div",
    { class: "screen" },
    h(
      "header",
      { class: "topbar" },
      h("div", {}, h("h1", { tabindex: "-1" }, APP_TITLE), h("p", { class: "topbar__meta" }, `Revisi materi: ${content.contentRevision}`)),
      h("a", { class: "topbar__action", href: "#/settings" }, h("span", { "aria-hidden": "true" }, "⚙ "), "Pengaturan")
    ),
    notices.map((n) => h("p", { class: `notice notice--${n.kind}` }, h("span", { "aria-hidden": "true" }, "⚠ "), n.text)),
    app.warnings.length
      ? h(
          "a",
          { class: "notice notice--warning", href: "#/content-check" },
          h("span", { "aria-hidden": "true" }, "⚠ "),
          `${app.warnings.length} peringatan konten. Lihat detail`
        )
      : null,
    present.length > 1
      ? h("div", { class: "chips", role: "group", "aria-label": "Saring menurut level JLPT" }, filterButton("all", "Semua"), present.map((j) => filterButton(j, j)))
      : null,
    groups.map((group) =>
      h(
        "section",
        { class: "jlpt-group", "aria-labelledby": `group-${group.jlptLevel}` },
        h(
          "h2",
          { id: `group-${group.jlptLevel}`, class: "jlpt-group__title" },
          group.jlptLevel,
          h("span", { class: "jlpt-group__count" }, `${group.chapters.reduce((n, c) => n + c.levels.length, 0)} level`)
        ),
        group.chapters.map((chapter) => [
          h("h3", { class: "chapter-heading" }, `${group.jlptLevel} · ${chapterLabel(chapter.chapter)}`),
          h(
            "ul",
            { class: "level-list" },
            chapter.levels.map((level) => [
              h("li", {}, levelCard(level)),
              reviewAfter.has(level.id) ? h("li", {}, reviewCard(reviewAfter.get(level.id))) : null,
            ])
          ),
        ])
      )
    )
  );
}
