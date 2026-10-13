// Quest and region review (復習) screens.
//
// Quest: intro conversation → practice (shape, reading) → context test →
// production → consolidation (D-60, A6). Review: sampled items of the region
// and earlier regions, consolidation only, no production (D-63).
//
// Leaving is always possible with "Keluar" in the header. Every answer is
// saved as it is given, so reopening continues where the player left off
// (session.js). The map menu (index, kana guide, settings) is not reachable
// from here (D-69), so the furigana setting cannot change inside a quest.
//
// Routes use the region and the quest's position, never the quest id, which
// may spell the kotoba (Q-tabemasu) in the address bar (D-81).

import { h, ja } from "../dom.js";
import { buildQuestItems, isIncompleteQuest, isOwnBushu, itemId } from "../model.js";
import { createSession, PHASE } from "../session.js";
import { recordRow } from "../event-log.js";
import { STREAK_TO_MASTER, STATUS, beginAttempt, createId, FURIGANA_MODE, saveProgress, touch } from "../state.js";
import { nodeStatuses, questPassed, sampleRegionReview } from "../progression.js";
import { kotobaVisible, pendingReadingLeaks, questByKotoba, readingSettled } from "../reveal.js";
import { uiLabel } from "../ui-labels.js";
import { castFor } from "../cast.js";
import { renderIntro } from "../stages/intro.js";
import { renderShape } from "../stages/shape.js";
import { renderReading } from "../stages/reading.js";
import { renderTest } from "../stages/test.js";
import { renderProduction } from "../stages/production.js";
import { backLink, LABELS } from "./common.js";
import { gateScreen } from "./research.js";
import { rescueDue } from "../cats.js";
import { rescueMoment } from "./cats.js";

export const questHref = (region, index) => `#/quest/${region.id}/${index + 1}`;
export const reviewHref = (region) => `#/review/${region.id}`;
export const regionHref = (region) => `#/region/${region.id}`;

function messageScreen(title, backHref, ...body) {
  return h("div", { class: "screen" }, backLink(backHref, "Kembali"), h("h1", { tabindex: "-1" }, title), body);
}

/** Log value of questStep (D-77). */
function questStep(phase, stage, spacer, isReview) {
  if (spacer) return "spacer";
  if (isReview) return "review";
  if (phase === PHASE.LEARNING) return stage === "test" ? "test" : "practice";
  return phase; // production | consolidation
}

/** Header label of the current step. */
function stepLabel(phase, stage, isReview) {
  if (phase === "intro") return LABELS.phase.intro;
  if (isReview) return `Ulangan · ${LABELS.stage[stage]}`;
  if (phase === PHASE.PRODUCTION) return LABELS.stage.production;
  if (phase === PHASE.LEARNING) return stage === "test" ? LABELS.stage.test : `Latihan · ${LABELS.stage[stage]}`;
  return `Pemantapan · ${LABELS.stage[stage]}`;
}


const findRegion = (app, id) => app.model.regions.find((r) => r.id === id);

export function questScreen(app, regionKey, position) {
  const region = findRegion(app, regionKey);
  const index = Number(position) - 1;
  const quest = region && Number.isInteger(index) ? region.quests[index] : undefined;
  if (!quest) return messageScreen("Misi tidak ditemukan", "#/", h("p", {}, "Misi ini tidak ada di materi saat ini."));
  const statuses = nodeStatuses(app.model, app.progress);
  if (statuses.get(region.id) === STATUS.LOCKED) {
    return messageScreen("Wilayah terkunci", "#/", h("p", {}, `Selesaikan wilayah sebelumnya beserta ulangannya untuk membuka Bab ${region.chapter}.`));
  }
  // Consent before the first game (D-50); in research mode also the participant code (D-112).
  const gate = gateScreen(app, regionHref(region));
  if (gate) return gate;

  const model = app.model;
  const modelQuest = model.quests.get(quest.id);
  const alreadyPassed = questPassed(app.progress, quest);
  const resuming = !alreadyPassed && app.progress.quests[quest.id]?.introDone === true;
  const entry = alreadyPassed ? app.progress.quests[quest.id] : beginAttempt(app.progress, quest.id);
  saveProgress(app.progress);

  return sessionScreen(app, {
    region,
    isReview: false,
    title: `Bab ${region.chapter} · Misi ${index + 1}`,
    incomplete: isIncompleteQuest(modelQuest), // draft only (D-92)
    levelId: quest.id,
    items: buildQuestItems(model, modelQuest),
    streaks: app.progress.items,
    entry,
    intro: !entry.introDone && !alreadyPassed ? modelQuest : null,
    resuming,
    questOf: () => modelQuest,
    doneView: (step) => questDoneView(app, region, step, quest),
  });
}

export function reviewScreen(app, regionKey) {
  const region = findRegion(app, regionKey);
  if (!region) return messageScreen("Wilayah tidak ditemukan", "#/", h("p", {}, "Wilayah ini tidak ada di materi saat ini."));
  const id = `REV-${region.id}`;
  const statuses = nodeStatuses(app.model, app.progress);
  if (statuses.get(id) === STATUS.LOCKED) {
    return messageScreen(
      "Ulangan belum terbuka",
      regionHref(region),
      h("p", {}, "Ulangan wilayah terbuka setelah semua misi di wilayah ini tuntas.")
    );
  }
  // Consent before the first game (D-50); in research mode also the participant code (D-112).
  const gate = gateScreen(app, regionHref(region));
  if (gate) return gate;

  const model = app.model;
  const alreadyPassed = statuses.get(id) === STATUS.PASSED;
  const entry = alreadyPassed ? app.progress.quests[id] : beginAttempt(app.progress, id);
  // The sample and its streaks are kept in the review entry, so leaving and
  // returning continues with the same items (D-63). Streaks are local: the
  // sampled items were mastered in their quests already.
  const allItems = new Map(
    [...model.quests.values()].flatMap((q) => buildQuestItems(model, q)).map((item) => [item.id, item])
  );
  let items = entry.reviewItemIds?.map((itemKey) => allItems.get(itemKey));
  // Resample only on the first visit, or if a content revision removed a stored item.
  if (!items?.length || !items.every(Boolean)) {
    items = sampleRegionReview(model, region);
    entry.reviewItemIds = items.map((item) => item.id);
    entry.streaks = {};
  }
  entry.streaks ??= {};
  saveProgress(app.progress);

  return sessionScreen(app, {
    region,
    isReview: true,
    title: [`Bab ${region.chapter} · `, uiLabel(app, "review", { gloss: false })],
    levelId: id,
    items,
    streaks: entry.streaks,
    entry,
    intro: null,
    resuming: !alreadyPassed && entry.attempts > 1,
    questOf: (item) => model.quests.get(item.questId),
    doneView: (step) => reviewDoneView(app, region, step),
  });
}

function questDoneView(app, region, step, quest) {
  const back = h("a", { class: "button button--block", href: regionHref(region) }, `Kembali ke Bab ${region.chapter}`);
  if (!step.passed) {
    // Only reachable if content changed while the quest was open.
    return h("section", { class: "result" }, h("h2", { tabindex: "-1" }, "Sesi selesai"), h("p", {}, `Item dikuasai: ${step.mastered} dari ${step.total}.`), back);
  }
  const nextIndex = region.quests.findIndex((q) => !questPassed(app.progress, q));
  const heading = h("h2", { tabindex: "-1" }, h("span", { "aria-hidden": "true" }, "✓ "), "Misi tuntas");
  const result = h(
    "section",
    { class: "result result--passed" },
    heading,
    h("p", {}, `Semua ${step.total} item sudah dikuasai dan kalimatmu sudah dikirim.`),
    nextIndex !== -1
      ? h("a", { class: "button button--primary button--block", href: questHref(region, nextIndex) }, `Lanjut ke Misi ${nextIndex + 1}`)
      : h("a", { class: "button button--primary button--block", href: reviewHref(region) }, "Lanjut ke ", uiLabel(app, "review")),
    back
  );
  // The mission's cat is free: a short rescue moment over the result, once (D-121).
  if (quest && rescueDue(app.progress, quest)) {
    result.append(rescueMoment(app, quest, region, () => heading.focus({ preventScroll: true })));
  }
  return result;
}

function reviewDoneView(app, region, step) {
  const map = h("a", { class: "button button--block", href: "#/" }, "Kembali ke peta");
  if (!step.passed) {
    return h("section", { class: "result" }, h("h2", { tabindex: "-1" }, "Sesi selesai"), h("p", {}, `Item dikuasai: ${step.mastered} dari ${step.total}.`), map);
  }
  const next = app.model.regions.find((r) => r.chapter > region.chapter);
  return h(
    "section",
    { class: "result result--passed" },
    h("h2", { tabindex: "-1" }, h("span", { "aria-hidden": "true" }, "✓ "), `Wilayah Bab ${region.chapter} tuntas`),
    h("p", {}, `Semua ${step.total} item ulangan sudah dikuasai.`),
    next ? h("a", { class: "button button--primary button--block", href: regionHref(next) }, `Buka Bab ${next.chapter}`) : null,
    map
  );
}

/**
 * @param {object} app
 * @param {object} cfg
 * @param {object} cfg.region
 * @param {boolean} cfg.isReview
 * @param {string|Node|Array} cfg.title header text
 * @param {string} cfg.levelId quest id or REV-Bxx, for the log
 * @param {object[]} cfg.items
 * @param {Object<string, number>} cfg.streaks global streaks (quest) or review-local streaks
 * @param {object} cfg.entry
 * @param {object|null} cfg.intro quest whose intro conversation still has to be shown
 * @param {boolean} cfg.resuming
 * @param {(item: object) => object} cfg.questOf model quest of an item
 * @param {(step: object) => Node} cfg.doneView
 */
function sessionScreen(app, cfg) {
  const { region, isReview, items, streaks, entry } = cfg;
  const model = app.model;
  const mode = app.progress.settings.furiganaMode;
  const byKotoba = questByKotoba(model);
  const exitHref = regionHref(region);
  const sceneSlot = app.assets?.get("adegan");
  const cast = castFor(app);

  const persist = () => {
    touch(app.progress);
    saveProgress(app.progress);
  };
  const session = createSession({ items, streaks, entry, hasProduction: !isReview, skipLearning: isReview, onChange: persist });
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
  // unless the player agreed to the current consent text, and never in
  // exhibition mode (event-log.js, D-112).
  function record(quest, fields) {
    recordRow(app, {
      sessionId,
      levelId: cfg.levelId,
      isReview,
      regionId: region.id,
      questId: quest.id,
      targetKanji: quest.targetKanji.join(" | "),
      furiganaMode: mode,
      ...fields,
    });
  }

  const sessionReadingIds = new Set(items.filter((i) => i.stage === "reading").map((i) => i.id));

  // D-29 and D-79: may a kotoba's reading be shown now? For a reading asked
  // in this session: once answered correctly (learning pass) or mastered
  // (afterwards). Any other kotoba: only when its material may appear
  // outside its quest at all.
  function isRevealed(k, phase = session.phase) {
    const id = itemId.reading(k.id);
    if (sessionReadingIds.has(id)) return (streaks[id] ?? 0) >= (phase === PHASE.LEARNING ? 1 : STREAK_TO_MASTER);
    if (!isReview && k.id === cfg.questOf().kotoba) return true; // readingType special: taught in the intro, never asked
    return kotobaVisible(model, app.progress, k, byKotoba) && readingSettled(model, app.progress, k, byKotoba);
  }

  // Readings of other quests that are still ahead stay hidden everywhere (D-79).
  const otherLeaksFor = (quest) => (isReview ? pendingReadingLeaks(model, app.progress) : pendingReadingLeaks(model, app.progress, quest));

  function header({ phase, stage, progress }) {
    return h(
      "header",
      { class: "play-header" },
      h(
        "div",
        { class: "play-header__top" },
        backLink(exitHref, "Keluar"),
        // No kotoba in the header: it would give away answers (D-22, D-71).
        h("span", { class: "play-header__level" }, cfg.title)
      ),
      phase ? h("p", { class: "play-header__stage" }, h("span", {}, stepLabel(phase, stage, isReview))) : null,
      cfg.incomplete
        ? h("p", { class: "notice notice--warning play-header__incomplete" }, "⚠ Misi belum lengkap: belum ada uji konteks, jadi langkah itu dilewati.")
        : null,
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

  function introView(quest) {
    startTiming();
    return renderIntro({
      conversation: quest.intro,
      kotoba: model.kotoba.get(quest.kotoba),
      targetKanji: quest.targetKanji,
      mode,
      // D-100: the intro is the teaching moment; every word keeps its furigana
      // (following the player's setting), including other quests' kotoba.
      sceneSlot,
      cast,
      onDone: ({ replays }) => {
        record(quest, {
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
        const ownBushu = quest.targetKanji.map((ch) => model.kanji.get(ch)).filter(isOwnBushu);
        if (ownBushu.length) showCard(bushuCards(ownBushu));
        else show();
      },
    });
  }

  // D-90: a target kanji that is its own bushu gets an unscored card instead
  // of the shape question. Not logged as an answer, not part of passing.
  function bushuCards(kanjiList) {
    return h(
      "div",
      { class: "question bushu-card" },
      h("h2", { class: "question__title", tabindex: "-1" }, kanjiList.length > 1 ? "Kanji yang sekaligus bushu" : "Kanji ini sekaligus bushu"),
      kanjiList.map((k) =>
        h(
          "section",
          { class: "card bushu-card__item" },
          ja("p", { class: "kanji-main" }, k.char),
          h(
            "p",
            {},
            "Kanji ",
            ja("span", { class: "inline-kanji" }, k.char),
            ` sendiri merupakan bushu: ${k.bushu.name}, "${k.bushu.meaning}". Bushu ini juga menjadi bagian dari kanji lain, `,
            "jadi mengenalinya membantu membaca kanji-kanji itu."
          )
        )
      ),
      h("button", { type: "button", class: "button button--primary button--block", onClick: show }, "Lanjut")
    );
  }

  function showCard(body) {
    root.replaceChildren(header({ phase: "intro" }), body);
    window.scrollTo(0, 0);
    root.querySelector(".question__title")?.focus({ preventScroll: true });
  }

  function itemView(step) {
    startTiming();
    const { item, phase, spacer } = step;
    const quest = cfg.questOf(item);
    const kotoba = model.kotoba.get(quest.kotoba);
    const onAnswer = ({ prompt, options, correctAnswer, answer, answerType, hintUsed, correct, conversationId, blankLine }) => {
      const responseMs = Math.round(performance.now() - shownAt);
      const result = session.answer(correct);
      record(quest, {
        questStep: questStep(phase, item.stage, spacer, isReview),
        phase: spacer ? "spacer" : isReview ? "review" : phase,
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
      // Automatic distractors only from kotoba whose reading is settled for this player (D-84).
      const candidates = [...model.kotoba.values()].filter(
        (k) => k !== kotoba && kotobaVisible(model, app.progress, k, byKotoba) && readingSettled(model, app.progress, k, byKotoba)
      );
      return renderReading({ ...common, model, quest, candidates, isRevealed: (k) => isRevealed(k, phase), showReading: mode !== FURIGANA_MODE.NEVER });
    }
    return renderTest({
      ...common,
      kotoba,
      targetKanji: quest.targetKanji,
      mode,
      readingRevealed: isRevealed(kotoba, phase),
      otherLeaks: otherLeaksFor(quest),
      sceneSlot,
      cast,
    });
  }

  function productionView() {
    startTiming();
    const quest = cfg.questOf();
    const kotoba = model.kotoba.get(quest.kotoba);
    return renderProduction({
      quest,
      kotoba,
      mode,
      readingRevealed: isRevealed(kotoba, PHASE.CONSOLIDATION),
      otherLeaks: otherLeaksFor(quest),
      onSubmit: ({ sentence, selfAssessment, writingMs }) => {
        session.submitProduction();
        record(quest, {
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

  function show() {
    let head;
    let body;
    if (cfg.intro && !entry.introDone) {
      head = header({ phase: "intro" });
      body = introView(cfg.intro);
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
        body = cfg.doneView(step);
      }
    }
    root.replaceChildren(head, body);
    window.scrollTo(0, 0);
    root.querySelector(".question__title, .result h2")?.focus({ preventScroll: true });
  }

  show();
  if (cfg.resuming) {
    root.firstChild.after(h("p", { class: "notice notice--info", role: "status" }, isReview ? "Melanjutkan ulangan dari titik terakhir." : "Melanjutkan misi dari titik terakhir."));
  }
  return root;
}
