// Quest screen: intro conversation → practice (shape, reading) → context test
// → production → consolidation (D-60, A6). Logs every answer, and one row
// when the intro conversation is finished.
//
// Leaving is always possible with "Keluar" in the header. Every answer is
// saved as it is given, so reopening the quest continues where the player
// left off (session.js). Menus (index, kana guide, settings) are not reachable
// from here (D-69), so the furigana setting cannot change inside a quest.

import { h } from "../dom.js";
import { APP_VERSION } from "../config.js";
import { buildModel, buildQuestItems, itemId } from "../model.js";
import { createSession, PHASE } from "../session.js";
import { logAnswer } from "../logger.js";
import {
  STREAK_TO_MASTER,
  STATUS,
  beginAttempt,
  consentStatus,
  createId,
  FURIGANA_MODE,
  isRecordingAllowed,
  saveProgress,
  touch,
} from "../state.js";
import { renderIntro } from "../stages/intro.js";
import { renderShape } from "../stages/shape.js";
import { renderReading } from "../stages/reading.js";
import { renderTest } from "../stages/test.js";
import { renderProduction } from "../stages/production.js";
import { backLink, LABELS } from "./common.js";
import { consentScreen } from "./consent.js";

const HOME = "#/";

function messageScreen(title, ...body) {
  return h("div", { class: "screen" }, backLink(HOME, "Beranda"), h("h1", { tabindex: "-1" }, title), body);
}

/** Log value of questStep (D-68 design report, item 5). */
function questStep(phase, stage, spacer) {
  if (spacer) return "spacer";
  if (phase === PHASE.LEARNING) return stage === "test" ? "test" : "practice";
  return phase; // production | consolidation
}

/** Header label of the current step. */
function stepLabel(phase, stage) {
  if (phase === "intro") return LABELS.phase.intro;
  if (phase === PHASE.PRODUCTION) return LABELS.stage.production;
  if (phase === PHASE.LEARNING) return stage === "test" ? LABELS.stage.test : `Latihan · ${LABELS.stage[stage]}`;
  return `Pemantapan · ${LABELS.stage[stage]}`;
}

/**
 * @param {object} app shared app context from main.js
 * @param {string} questId
 */
export function questScreen(app, questId) {
  const model = app.model ?? (app.model = buildModel(app.content));
  const quest = model.quests.get(questId);
  if (!quest) return messageScreen("Quest tidak ditemukan", h("p", {}, "Quest ini tidak ada di materi saat ini."));

  // Each player decides about recording before their first game (D-50).
  const consentVersion = app.consentText?.version ?? null;
  if (consentStatus(app.progress, consentVersion) === "undecided") {
    return consentScreen(app, { afterChoice: () => app.render(), backHref: HOME });
  }

  const { region } = quest;
  const questNumber = region.quests.findIndex((q) => q.id === quest.id) + 1;
  const kotoba = model.kotoba.get(quest.kotoba);
  const questKotobaIds = new Set([...model.quests.values()].map((q) => q.kotoba));
  const mode = app.progress.settings.furiganaMode;
  const streaks = app.progress.items;

  const alreadyPassed = app.progress.quests[quest.id]?.status === STATUS.PASSED;
  const resuming = !alreadyPassed && app.progress.quests[quest.id]?.introDone === true;
  const entry = alreadyPassed ? app.progress.quests[quest.id] : beginAttempt(app.progress, quest.id);
  saveProgress(app.progress);

  const items = buildQuestItems(model, quest);
  const persist = () => {
    touch(app.progress);
    saveProgress(app.progress);
  };
  const session = createSession({ items, streaks, entry, onChange: persist });
  const sessionId = createId();

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
  function startTiming() {
    shownAt = performance.now();
    hiddenDuringItem = document.hidden;
  }

  // The only path to the log. Nothing is written (and so nothing is sent)
  // unless the player agreed to the current consent text.
  function record(fields) {
    if (!isRecordingAllowed(app.progress, consentVersion)) return;
    logAnswer({
      appVersion: APP_VERSION,
      contentRevision: app.content.contentRevision,
      playerId: app.progress.playerId,
      participantCode: app.progress.participantCode,
      consentStatus: app.progress.consent.choice,
      consentVersion: app.progress.consent.version,
      consentAt: app.progress.consent.at,
      sessionId,
      levelId: quest.id,
      isReview: false,
      regionId: region.id,
      questId: quest.id,
      targetKanji: quest.targetKanji.join(" | "),
      furiganaMode: mode,
      ...fields,
    });
  }

  // D-29: a kotoba's reading may be shown only when its reading question is
  // not coming up soon: answered once during the learning pass, mastered
  // after it. Kotoba that are not a quest, or have no reading question, are
  // always revealed.
  function isRevealed(k, phase = session.phase) {
    if (!questKotobaIds.has(k.id) || k.readingType === "special") return true;
    return (streaks[itemId.reading(k.id)] ?? 0) >= (phase === PHASE.LEARNING ? 1 : STREAK_TO_MASTER);
  }

  function header({ phase, stage, progress }) {
    return h(
      "header",
      { class: "play-header" },
      h(
        "div",
        { class: "play-header__top" },
        backLink(HOME, "Keluar"),
        // No kotoba in the header: it would give away answers (D-22, D-71).
        h("span", { class: "play-header__level" }, `Bab ${region.chapter} · Quest ${questNumber}`)
      ),
      phase ? h("p", { class: "play-header__stage" }, h("span", {}, stepLabel(phase, stage))) : null,
      progress
        ? h(
            "div",
            { class: "mastery" },
            h("label", { for: "mastery-bar", class: "mastery__label" }, `Item dikuasai: ${progress.mastered} dari ${progress.total}`),
            h("progress", { id: "mastery-bar", max: progress.total, value: progress.mastered })
          )
        : null
    );
  }

  function introView() {
    startTiming();
    return renderIntro({
      conversation: quest.intro,
      kotoba,
      targetKanji: quest.targetKanji,
      mode,
      onDone: ({ replays }) => {
        record({
          questStep: "intro",
          phase: "intro",
          stage: "intro",
          conversationId: quest.intro.id,
          prompt: quest.intro.scene,
          responseMs: Math.round(performance.now() - shownAt),
          wasHidden: hiddenDuringItem,
          introReplays: replays,
        });
        entry.introDone = true;
        persist();
        show();
      },
    });
  }

  function itemView(step) {
    startTiming();
    const { item, phase, spacer } = step;
    const onAnswer = ({ prompt, options, correctAnswer, answer, answerType, hintUsed, correct, conversationId, blankLine }) => {
      const responseMs = Math.round(performance.now() - shownAt);
      const result = session.answer(correct);
      record({
        questStep: questStep(phase, item.stage, spacer),
        phase: spacer ? "spacer" : phase,
        stage: item.stage,
        itemId: item.id,
        conversationId,
        blankLine,
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
    };
    const common = { item, random: Math.random, onAnswer, onContinue: show };
    if (item.stage === "shape") return renderShape(common);
    if (item.stage === "reading") {
      return renderReading({
        ...common,
        model,
        quest,
        isRevealed: (k) => isRevealed(k, phase),
        showReading: mode !== FURIGANA_MODE.NEVER,
      });
    }
    return renderTest({ ...common, kotoba, targetKanji: quest.targetKanji, mode, readingRevealed: isRevealed(kotoba, phase) });
  }

  function productionView() {
    startTiming();
    return renderProduction({
      quest,
      kotoba,
      mode,
      readingRevealed: isRevealed(kotoba, PHASE.CONSOLIDATION),
      onSubmit: ({ sentence, selfAssessment, writingMs }) => {
        session.submitProduction();
        record({
          questStep: "production",
          phase: PHASE.PRODUCTION,
          stage: "production",
          itemId: itemId.production(quest.id),
          prompt: quest.productionPrompt,
          answer: sentence,
          responseMs: writingMs,
          wasHidden: hiddenDuringItem,
          selfAssessment,
          containsKanji: quest.targetKanji.some((ch) => sentence.includes(ch)),
        });
      },
      onContinue: show,
    });
  }

  function doneView(step) {
    const back = h("a", { class: "button button--block", href: HOME }, "Kembali ke beranda");
    if (!step.passed) {
      // Only reachable if content changed while the quest was open.
      return h("section", { class: "result" }, h("h2", { tabindex: "-1" }, "Sesi selesai"), h("p", {}, `Item dikuasai: ${step.mastered} dari ${step.total}.`), back);
    }
    const next = region.quests.find((q) => app.progress.quests[q.id]?.status !== STATUS.PASSED);
    return h(
      "section",
      { class: "result result--passed" },
      h("h2", { tabindex: "-1" }, h("span", { "aria-hidden": "true" }, "✓ "), "Quest tuntas"),
      h("p", {}, `Semua ${step.total} item sudah dikuasai dan kalimatmu sudah dikirim.`),
      next
        ? h("a", { class: "button button--primary button--block", href: `#/quest/${encodeURIComponent(next.id)}` }, `Lanjut ke Quest ${region.quests.indexOf(next) + 1}`)
        : null,
      back
    );
  }

  function show() {
    let head;
    let body;
    if (!entry.introDone && !alreadyPassed) {
      head = header({ phase: "intro" });
      body = introView();
    } else {
      const step = session.next();
      if (step.kind === "item") {
        head = header({ phase: step.phase, stage: step.item.stage, progress: step.progress });
        body = itemView(step);
      } else if (step.kind === "production") {
        head = header({ phase: step.phase, progress: step.progress });
        body = productionView();
      } else {
        head = header({ progress: { mastered: step.mastered, total: step.total } });
        body = doneView(step);
      }
    }
    root.replaceChildren(head, body);
    window.scrollTo(0, 0);
    root.querySelector(".question__title, .result h2")?.focus({ preventScroll: true });
  }

  show();
  if (resuming) {
    root.firstChild.after(h("p", { class: "notice notice--info", role: "status" }, "Melanjutkan quest dari titik terakhir."));
  }
  return root;
}
