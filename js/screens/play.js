// Play screen: runs one level or review level session, renders stages, and
// logs every answer.

import { h } from "../dom.js";
import { APP_VERSION } from "../config.js";
import { buildLevelItems } from "../content.js";
import { itemId } from "../validate.js";
import { createLevelSession, STAGE_ORDER } from "../session.js";
import { logAnswer } from "../logger.js";
import {
  STREAK_TO_MASTER,
  beginAttempt,
  buildProgression,
  computeStatuses,
  consentStatus,
  createId,
  isRecordingAllowed,
  LEVEL_STATUS,
  sampleReviewItems,
  saveProgress,
  touch,
} from "../state.js";
import { renderShape } from "../stages/shape.js";
import { renderReading } from "../stages/reading.js";
import { renderSentence } from "../stages/sentence.js";
import { renderProduction } from "../stages/production.js";
import { backLink, LABELS } from "./common.js";
import { consentScreen } from "./consent.js";

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

const groupByStage = (items) => Object.fromEntries(STAGE_ORDER.map((stage) => [stage, items.filter((i) => i.stage === stage)]));

/**
 * Items of a review level. The sample is stored in the review entry on the
 * first visit so that leaving and returning continues with the same items.
 */
function reviewItems(app, node, entry) {
  const passed = node.coveredLevelIds
    .filter((id) => app.progress.levels[id]?.status === LEVEL_STATUS.PASSED)
    .map((id) => app.content.levels.find((l) => l.id === id))
    .filter(Boolean);
  const pool = passed.map((level) => STAGE_ORDER.flatMap((stage) => buildLevelItems(level)[stage]));
  const byId = new Map(pool.flat().map((item) => [item.id, item]));

  const stored = entry.reviewItemIds?.map((id) => byId.get(id));
  // Resample only if the content changed so much that stored items vanished.
  if (stored?.length && stored.every(Boolean)) return stored;
  const sample = sampleReviewItems(pool);
  entry.reviewItemIds = sample.map((item) => item.id);
  return sample;
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
  const isReview = node.type === "review";
  const status = computeStatuses(nodes, app.progress).get(node.id);

  if (status === LEVEL_STATUS.LOCKED) {
    return messageScreen(
      "Level terkunci",
      h("p", {}, h("span", { "aria-hidden": "true" }, "🔒 "), `Selesaikan ${nodeLabel(nodes[index - 1])} lebih dulu untuk membuka level ini.`)
    );
  }

  // Each player decides about recording before their first game (D-50).
  const consentVersion = app.consentText?.version ?? null;
  if (consentStatus(app.progress, consentVersion) === "undecided") {
    return consentScreen(app, { afterChoice: () => app.render(), backHref: "#/" });
  }

  const entry = status === LEVEL_STATUS.PASSED ? app.progress.levels[node.id] : beginAttempt(app.progress, node.id);
  const items = isReview ? groupByStage(reviewItems(app, node, entry)) : buildLevelItems(node.level);
  saveProgress(app.progress);

  const levelsById = new Map(app.content.levels.map((l) => [l.id, l]));
  const scoredIds = new Set(STAGE_ORDER.flatMap((stage) => items[stage]).map((i) => i.id));

  const sessionId = createId();
  const session = createLevelSession({
    items,
    entry,
    hasProduction: !isReview,
    skipLearning: isReview,
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

  // The only path to the log. Nothing is written (and so nothing is sent)
  // unless the player agreed to the current consent text.
  function record(fields) {
    if (!isRecordingAllowed(app.progress, consentVersion)) return;
    logAnswer({
      ...baseRecord(),
      consentStatus: app.progress.consent.choice,
      consentVersion: app.progress.consent.version,
      consentAt: app.progress.consent.at,
      ...fields,
    });
  }

  const baseRecord = () => ({
    appVersion: APP_VERSION,
    contentRevision: app.content.contentRevision,
    playerId: app.progress.playerId,
    participantCode: app.progress.participantCode,
    sessionId,
    levelId: node.id,
    isReview,
  });

  const phaseLabel = (phase) => (isReview ? LABELS.phase.review : LABELS.phase[phase]);

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
            h("span", { class: "badge" }, phaseLabel(step.phase))
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
  // coming up soon (D-29): answered once during the learning pass, mastered
  // after it. Kotoba whose reading is not asked in this session are shown.
  function revealRule(phase, level) {
    return (kotoba) => {
      const id = itemId.reading(level.id, kotoba.word);
      if (!scoredIds.has(id)) return true;
      const streak = entry.itemStreaks[id] ?? 0;
      return streak >= (phase === "learning" ? 1 : STREAK_TO_MASTER);
    };
  }

  function startTiming() {
    shownAt = performance.now();
    hiddenDuringItem = document.hidden;
  }

  function logPhase(step) {
    if (step.spacer) return "spacer";
    return isReview ? "review" : step.phase;
  }

  function itemView(step) {
    startTiming();
    const level = levelsById.get(step.item.levelId);
    return STAGE_RENDERERS[step.item.stage]({
      item: step.item,
      level,
      levels: app.content.levels,
      phase: step.phase,
      isRevealed: revealRule(step.phase, level),
      random: Math.random,
      onAnswer: ({ prompt, options, correctAnswer, answer, answerType, hintUsed, correct }) => {
        const responseMs = Math.round(performance.now() - shownAt);
        const result = session.answer(correct);
        record({
          phase: logPhase(step),
          stage: step.item.stage,
          itemId: step.item.id,
          prompt,
          options: options.map((o) => o.value).join(" | "),
          optionTypes: options.map((o) => o.type).join(" | "),
          correctAnswer,
          answer,
          answerType,
          hintUsed,
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
    const { level } = node;
    return renderProduction({
      level,
      isRevealed: revealRule(step.phase, level),
      onSubmit: ({ sentence, selfAssessment, writingMs }) => {
        session.submitProduction();
        record({
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
      h("h2", { tabindex: "-1" }, h("span", { "aria-hidden": "true" }, "✓ "), isReview ? "Level ulangan lulus" : "Level lulus"),
      h(
        "p",
        {},
        isReview
          ? `Semua ${step.total} item ulangan sudah dikuasai.`
          : `Semua ${step.total} item sudah dikuasai dan tahap Produksi sudah dikirim.`
      ),
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
