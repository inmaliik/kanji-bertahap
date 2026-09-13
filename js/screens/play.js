// Play screen: runs one level session, renders stages, logs every answer.

import { h } from "../dom.js";
import { APP_VERSION } from "../config.js";
import { buildLevelItems } from "../content.js";
import { createLevelSession } from "../session.js";
import { logAnswer } from "../logger.js";
import {
  beginAttempt,
  buildProgression,
  computeStatuses,
  createId,
  LEVEL_STATUS,
  saveProgress,
  touch,
} from "../state.js";
import { renderShape } from "../stages/shape.js";
import { backLink, LABELS } from "./common.js";

// Stages that exist in this build. Stages missing here are skipped by the
// session, and a level cannot pass until all of them exist.
const STAGE_RENDERERS = {
  shape: renderShape,
};
const HAS_PRODUCTION = false;

function nodeLabel(node) {
  return node.type === "review" ? `Level ulangan ${node.id}` : `Level ${node.id}`;
}

function messageScreen(title, ...body) {
  return h("div", { class: "screen" }, backLink("#/", "Daftar level"), h("h1", { tabindex: "-1" }, title), body);
}

/**
 * @param {object} app shared app context from main.js
 * @param {string} nodeId
 */
export function playScreen(app, nodeId) {
  const nodes = buildProgression(app.content.levels);
  const index = nodes.findIndex((n) => n.id === nodeId);
  if (index === -1) return messageScreen("Level tidak ditemukan", h("p", {}, "Level ini tidak ada di materi saat ini."));

  const node = nodes[index];
  const status = computeStatuses(nodes, app.progress).get(node.id);

  if (status === LEVEL_STATUS.LOCKED) {
    return messageScreen(
      "Level terkunci",
      h("p", {}, h("span", { "aria-hidden": "true" }, "🔒 "), `Selesaikan ${nodeLabel(nodes[index - 1])} lebih dulu untuk membuka level ini.`)
    );
  }
  if (node.type === "review") {
    return messageScreen(
      nodeLabel(node),
      h("p", {}, `Berisi campuran soal dari ${node.coveredLevelIds.join(", ")}.`),
      h("p", { class: "dev-note" }, "Level ulangan dibangun di langkah 4.")
    );
  }

  const { level } = node;
  const items = buildLevelItems(level);
  const entry = status === LEVEL_STATUS.PASSED ? app.progress.levels[level.id] : beginAttempt(app.progress, level.id);
  saveProgress(app.progress);

  const sessionId = createId();
  const session = createLevelSession({
    items,
    entry,
    hasStage: (stage) => stage in STAGE_RENDERERS,
    hasProduction: HAS_PRODUCTION,
    onChange: () => {
      touch(app.progress);
      saveProgress(app.progress);
    },
  });

  const root = h("div", { class: "screen play" });

  // Response time and tab visibility for the question currently shown.
  let shownAt = 0;
  let hiddenDuringItem = false;
  const onVisibility = () => {
    if (!root.isConnected) {
      document.removeEventListener("visibilitychange", onVisibility);
      return;
    }
    if (document.hidden) hiddenDuringItem = true;
  };
  document.addEventListener("visibilitychange", onVisibility);

  function header(step) {
    const stage = step.kind === "item" ? step.item.stage : step.kind === "production" ? "production" : null;
    const { mastered, total } = step.progress ?? { mastered: step.mastered, total: step.total };
    return h(
      "header",
      { class: "play-header" },
      h(
        "div",
        { class: "play-header__top" },
        backLink("#/", "Keluar"),
        // Level id only: showing the kanji or its meaning would give away answers in later stages.
        h("span", { class: "play-header__level" }, nodeLabel(node))
      ),
      stage
        ? h(
            "p",
            { class: "play-header__stage" },
            h("span", {}, `Tahap ${LABELS.stageNumber[stage]} · ${LABELS.stage[stage]}`),
            h("span", { class: "badge" }, LABELS.phase[step.phase])
          )
        : null,
      h(
        "div",
        { class: "mastery" },
        h("label", { for: "mastery-bar", class: "mastery__label" }, `Item dikuasai: ${mastered} dari ${total}`),
        h("progress", { id: "mastery-bar", max: total, value: mastered })
      )
    );
  }

  function itemView(step) {
    const render = STAGE_RENDERERS[step.item.stage];
    shownAt = performance.now();
    hiddenDuringItem = document.hidden;

    return render({
      item: step.item,
      level,
      random: Math.random,
      onAnswer: ({ prompt, options, correctAnswer, answer, correct }) => {
        const responseMs = Math.round(performance.now() - shownAt);
        const result = session.answer(correct);
        logAnswer({
          appVersion: APP_VERSION,
          contentRevision: app.content.contentRevision,
          playerId: app.progress.playerId,
          participantCode: app.progress.participantCode,
          sessionId,
          levelId: level.id,
          isReview: false,
          phase: step.spacer ? "spacer" : step.phase,
          stage: step.item.stage,
          itemId: step.item.id,
          prompt,
          options: options.join(" | "),
          correctAnswer,
          answer,
          isCorrect: correct,
          streakAfter: result.streak,
          responseMs,
          wasHidden: hiddenDuringItem,
        });
        return result;
      },
      onContinue: show,
    });
  }

  function doneView(step) {
    if (step.passed) {
      return h(
        "section",
        { class: "result result--passed" },
        h("h2", { tabindex: "-1" }, h("span", { "aria-hidden": "true" }, "✓ "), "Level lulus"),
        h("p", {}, `Semua ${step.total} item sudah dikuasai dan tahap Produksi sudah dikirim.`),
        h("a", { class: "button button--primary button--block", href: "#/" }, "Kembali ke daftar level")
      );
    }
    const missing = [...step.missingStages, ...(step.productionMissing ? ["production"] : [])].map((s) => LABELS.stage[s]);
    return h(
      "section",
      { class: "result" },
      h("h2", { tabindex: "-1" }, "Sesi selesai"),
      h("p", {}, `Item dikuasai: ${step.mastered} dari ${step.total}.`),
      missing.length
        ? h("p", { class: "dev-note" }, `Level ini belum bisa lulus karena tahap berikut belum dibangun (langkah 3): ${missing.join(", ")}.`)
        : null,
      h("a", { class: "button button--primary button--block", href: "#/" }, "Kembali ke daftar level")
    );
  }

  function show() {
    const step = session.next();
    const body = step.kind === "item" ? itemView(step) : doneView(step);
    root.replaceChildren(header(step), body);
    window.scrollTo(0, 0);
    root.querySelector(".question__title, .result h2")?.focus?.({ preventScroll: true });
  }

  show();
  return root;
}

