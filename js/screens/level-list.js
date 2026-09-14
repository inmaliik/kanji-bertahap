// Level list: grouped by JLPT level in array order (the Hyouki teaching order),
// with derived lock state, review levels after the level they follow, Minna
// chapter labels, and an optional "chapters studied so far" marker.

import { h, ja } from "../dom.js";
import { APP_TITLE } from "../config.js";
import { groupLevels, jlptLevelsPresent, buildLevelItems } from "../content.js";
import { chaptersAbove, chaptersLabel, kotobaChapters } from "../chapters.js";
import { buildProgression, computeStatuses, evaluateEntry, LEVEL_STATUS, savePrefs, storageUsage } from "../state.js";
import { STAGE_ORDER } from "../session.js";

// Minna no Nihongo Shokyu I has 25 chapters; the chapter picker offers at least these.
const MINNA_I_CHAPTERS = 25;

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
 * "The class has studied up to chapter N." Levels with kotoba from later
 * chapters get a marker. This never locks anything (D-41).
 */
function chapterLimitControl(app) {
  const contentMax = Math.max(0, ...app.content.levels.flatMap((l) => kotobaChapters(l)));
  const max = Math.max(MINNA_I_CHAPTERS, contentMax);
  const current = app.prefs.chapterLimit;
  const select = h(
    "select",
    {
      id: "chapter-limit",
      class: "select",
      onChange: () => {
        app.prefs.chapterLimit = select.value === "" ? null : Number(select.value);
        savePrefs(app.prefs);
        app.render();
      },
    },
    h("option", { value: "", selected: current === null }, "Tidak ditandai"),
    Array.from({ length: max }, (_, i) => i + 1).map((n) => h("option", { value: String(n), selected: current === n }, `Bab ${n}`))
  );
  return h(
    "div",
    { class: "chapter-limit" },
    h("label", { for: "chapter-limit", class: "chapter-limit__label" }, "Kelas sudah sampai bab Minna"),
    select,
    h("p", { class: "chapter-limit__help" }, "Level yang memuat kata dari bab sesudahnya diberi tanda. Tanda ini tidak mengunci level.")
  );
}

// Exhibition staff need to see this without opening Settings.
function storageNotice() {
  const usage = storageUsage();
  if (!usage.warning) return null;
  return h(
    "a",
    { class: "notice notice--warning", href: "#/settings" },
    h("span", { "aria-hidden": "true" }, "⚠ "),
    `Penyimpanan perangkat hampir penuh (sekitar ${Math.round(usage.ratio * 100)}%). Penjaga stan: buka Pengaturan.`
  );
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
    const limit = app.prefs.chapterLimit;
    const ahead = limit === null ? [] : chaptersAbove(level, limit);
    const chapters = chaptersLabel(level);
    return card({
      href: `#/play/${encodeURIComponent(level.id)}`,
      status,
      symbol: ja("span", { class: "level-card__kanji" }, level.kanji),
      title: level.meaning,
      meta: [
        h("span", { class: "level-card__meta" }, chapters ? `${level.id} · ${chapters}` : level.id),
        h("span", { class: "level-card__meta" }, statusBadge(status, extra)),
        ahead.length
          ? h(
              "span",
              { class: "chapter-marker" },
              h("span", { "aria-hidden": "true" }, "⚠ "),
              `Memuat kata dari bab yang belum dipelajari (bab ${ahead.join(", ")})`
            )
          : null,
      ],
    });
  };

  const reviewCard = (node) => {
    const status = statuses.get(node.id);
    const sampled = progress.levels[node.id]?.reviewItemIds;
    let extra = null;
    if (status === LEVEL_STATUS.IN_PROGRESS && sampled?.length) {
      const { mastered, total } = evaluateEntry(sampled, progress.levels[node.id], { requiresProduction: false });
      extra = `${mastered}/${total} item`;
    }
    const first = node.coveredLevelIds[0];
    const last = node.coveredLevelIds[node.coveredLevelIds.length - 1];
    return card({
      href: `#/play/${node.id}`,
      status,
      symbol: h("span", { class: "level-card__symbol", "aria-hidden": "true" }, "↻"),
      title: `Level ulangan ${node.id}`,
      meta: [
        h("span", { class: "level-card__meta" }, `Campuran ${first}–${last}`),
        h("span", { class: "level-card__meta" }, statusBadge(status, extra)),
      ],
    });
  };

  const groups = groupLevels(content.levels).filter((g) => app.jlptFilter === "all" || g.jlptLevel === app.jlptFilter);

  // With dozens of levels the next one can be far down the list: offer a shortcut
  // to the first level that is started, or else the first one available.
  const nextNode =
    nodes.find((n) => statuses.get(n.id) === LEVEL_STATUS.IN_PROGRESS) ??
    nodes.find((n) => statuses.get(n.id) === LEVEL_STATUS.AVAILABLE);
  const continueShortcut = nextNode
    ? h(
        "a",
        { class: "continue-card", href: `#/play/${encodeURIComponent(nextNode.id)}` },
        nextNode.type === "review"
          ? h("span", { class: "level-card__symbol", "aria-hidden": "true" }, "↻")
          : ja("span", { class: "continue-card__kanji" }, nextNode.level.kanji),
        h(
          "span",
          { class: "continue-card__body" },
          h("span", { class: "continue-card__label" }, statuses.get(nextNode.id) === LEVEL_STATUS.IN_PROGRESS ? "Lanjutkan" : "Mulai"),
          h("span", { class: "continue-card__title" }, nextNode.type === "review" ? `Level ulangan ${nextNode.id}` : `Level ${nextNode.id} · ${nextNode.level.meaning}`)
        ),
        h("span", { class: "level-card__chevron", "aria-hidden": "true" }, "›")
      )
    : null;

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
    storageNotice(),
    continueShortcut,
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
    chapterLimitControl(app),
    groups.map((group) =>
      h(
        "section",
        { class: "jlpt-group", "aria-labelledby": `group-${group.jlptLevel}` },
        h(
          "h2",
          { id: `group-${group.jlptLevel}`, class: "jlpt-group__title" },
          group.jlptLevel,
          h("span", { class: "jlpt-group__count" }, `${group.levels.length} level`)
        ),
        h(
          "ul",
          { class: "level-list" },
          group.levels.map((level) => [
            h("li", {}, levelCard(level)),
            reviewAfter.has(level.id) ? h("li", {}, reviewCard(reviewAfter.get(level.id))) : null,
          ])
        )
      )
    )
  );
}
