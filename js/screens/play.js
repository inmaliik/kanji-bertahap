// Play screen: runs one level session, renders stages, logs every answer.

import { h } from "../dom.js";
import { APP_VERSION } from "../config.js";
import { buildLevelItems } from "../content.js";
import { itemId } from "../validate.js";
import { createLevelSession } from "../session.js";
import { logAnswer } from "../logger.js";
import {
  STREAK_TO_MASTER,
  beginAttempt,
  buildProgression,
  computeStatuses,
  createId,
  LEVEL_STATUS,
  saveProgress,
  touch,
} from "../state.js";
import { renderShape } from "../stages/shape.js";
import { renderReading } from "../stages/reading.js";
import { renderSentence } from "../stages/sentence.js";
import { renderProduction } from "../stages/production.js";
import { backLink, LABELS } from "./common.js";

const STAGE_RENDERERS = {
  shape: renderShape,
  kunyomi: renderReading,
  onyomi: renderReading,
  sentence: renderSentence,
};

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

  const baseRecord = () => ({
    appVersion: APP_VERSION,
    contentRevision: app.content.contentRevision,
    playerId: app.progress.playerId,
    participantCode: app.progress.participantCode,
    sessionId,
    levelId: level.id,
    isReview: false,
  });

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

  // A kotoba's reading may be shown only when its reading question is not
  // coming up soon: answered once during the learning pass, mastered after it.
  // Kotoba without a reading question (readingType special) are always shown.
  function revealRule(phase) {
    return (kotoba) => {
      if (kotoba.readingType !== "kunyomi" && kotoba.readingType !== "onyomi") return true;
      const streak = entry.itemStreaks[itemId.reading(level.id, kotoba.word)] ?? 0;
      return streak >= (phase === "learning" ? 1 : STREAK_TO_MASTER);
    };
  }

  function startTiming() {
    shownAt = performance.now();
    hiddenDuringItem = document.hidden;
  }

  function itemView(step) {
    startTiming();
    return STAGE_RENDERERS[step.item.stage]({
      item: step.item,
      level,
      levels: app.content.levels,
      phase: step.phase,
      isRevealed: revealRule(step.phase),
      random: Math.random,
      onAnswer: ({ prompt, options, correctAnswer, answer, answerType, correct }) => {
        const responseMs = Math.round(performance.now() - shownAt);
        const result = session.answer(correct);
        logAnswer({
          ...baseRecord(),
          phase: step.spacer ? "spacer" : step.phase,
          stage: step.item.stage,
          itemId: step.item.id,
          prompt,
          options: options.map((o) => o.value).join(" | "),
          optionTypes: options.map((o) => o.type).join(" | "),
          correctAnswer,
          answer,
          answerType,
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

  function productionView(step) {
    startTiming();
    return renderProduction({
      level,
      isRevealed: revealRule(step.phase),
      onSubmit: ({ sentence, selfAssessment, writingMs }) => {
        session.submitProduction();
        logAnswer({
          ...baseRecord(),
          phase: step.phase,
          stage: "production",
          itemId: itemId.production(level.id),
          prompt: level.productionPrompt,
          answer: sentence,
          responseMs: writingMs,
          wasHidden: hiddenDuringItem,
          selfAssessment,
          containsKanji: sentence.includes(level.kanji),
        });
      },
      onContinue: show,
    });
  }

  function doneView(step) {
    const back = h("a", { class: "button button--block", href: "#/" }, "Kembali ke daftar level");
    if (!step.passed) {
      // Only reachable if content changed while the level was open.
      return h(
        "section",
        { class: "result" },
        h("h2", { tabindex: "-1" }, "Sesi selesai"),
        h("p", {}, `Item dikuasai: ${step.mastered} dari ${step.total}.`),
        back
      );
    }
    const next = nodes[index + 1];
    const nextOpen = next && computeStatuses(nodes, app.progress).get(next.id) !== LEVEL_STATUS.LOCKED;
    return h(
      "section",
      { class: "result result--passed" },
      h("h2", { tabindex: "-1" }, h("span", { "aria-hidden": "true" }, "✓ "), "Level lulus"),
      h("p", {}, `Semua ${step.total} item sudah dikuasai dan tahap Produksi sudah dikirim.`),
      nextOpen
        ? h("a", { class: "button button--primary button--block", href: `#/play/${encodeURIComponent(next.id)}` }, `Lanjut ke ${nodeLabel(next)}`)
        : null,
      back
    );
  }

  function show() {
    const step = session.next();
    let body;
    if (step.kind === "item") body = itemView(step);
    else if (step.kind === "production") body = productionView(step);
    else body = doneView(step);
    root.replaceChildren(header(step), body);
    window.scrollTo(0, 0);
    root.querySelector(".question__title, .result h2")?.focus({ preventScroll: true });
  }

  show();
  return root;
}
