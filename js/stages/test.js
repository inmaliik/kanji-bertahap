// Context test (D-60): a conversation in a context different from the intro,
// with the quest's kotoba blanked out in one line. The player picks the
// kotoba that fits. Distractors are manual only.

import { h, ja } from "../dom.js";
import { blankOptions } from "../distractors.js";
import { parseRuby, renderRuby } from "../ruby.js";
import { containsAny, visibleSegments } from "../furigana.js";
import { anyLeak } from "../reveal.js";
import { choiceQuestion } from "./choice.js";
import { dialogLine, lineTranslation, sceneFigure } from "./conversation.js";

const BLANK_MARK = "___"; // how the blank appears in the logged prompt

/**
 * @param {object} ctx
 * @param {object} ctx.item test item from buildQuestItems()
 * @param {object} ctx.kotoba kotoba of the quest
 * @param {string[]} ctx.targetKanji
 * @param {string} ctx.mode furigana setting
 * @param {boolean} ctx.readingRevealed D-29: the kotoba's reading is no longer pending
 * @param {(segment: object) => boolean} [ctx.otherLeaks] readings pending in other quests (D-79)
 */
export function renderTest({ item, kotoba, targetKanji, mode, readingRevealed, otherLeaks = () => false, sceneSlot, cast, random, onAnswer, onContinue }) {
  const { conversation, lineIndex, line, blankRange, plain } = item;
  const options = blankOptions(line, random);
  const targetLeaks = anyLeak(containsAny(targetKanji), otherLeaks);

  // Before answering, target readings are hidden in every line of a test
  // conversation; afterwards only while the reading is still pending (D-29).
  const before = (segments) => visibleSegments(segments, { mode, answered: false, leaks: targetLeaks });
  const after = (segments) => visibleSegments(segments, { mode, answered: true, leaks: readingRevealed ? otherLeaks : targetLeaks });

  // Translations are withheld until the player asks (D-27, D-67): showing
  // them first turns the question into meaning matching.
  let hintUsed = false;
  const translations = conversation.lines.map((l) => lineTranslation(l, true));
  const hintButton = h(
    "button",
    {
      type: "button",
      class: "button hint__button",
      onClick: () => {
        hintUsed = true;
        translations.forEach((t) => (t.hidden = false));
        hintButton.remove();
      },
    },
    "Tampilkan arti"
  );

  const lines = conversation.lines.map((l, i) => {
    const segments = before(i === lineIndex ? item.segments : parseRuby(l.ja).segments);
    if (i !== lineIndex) return dialogLine({ line: l, segments, translation: translations[i], cast });
    return dialogLine({
      line: l,
      segments,
      range: blankRange,
      wrap: () => h("span", { class: "blank-slot" }, h("span", { class: "sr-only", lang: "id" }, "(bagian kosong)")),
      translation: translations[i],
      cast,
    });
  });

  return choiceQuestion({
    prompt: [
      h("h2", { class: "question__title", tabindex: "-1" }, "Pilih kotoba yang tepat untuk bagian kosong"),
      sceneFigure(conversation, sceneSlot),
      h("ol", { class: "dialog" }, lines),
      h("div", { class: "hint" }, hintButton),
    ],
    options: options.map((o) => ({ ...o, content: o.value, lang: "ja" })),
    optionsClass: "options--grid options--words",
    correctValue: line.blank,
    explanation: () => [
      ja(
        "p",
        { class: "sentence-main sentence-main--answer" },
        renderRuby(after(item.segments), { range: blankRange, wrap: (inner) => h("mark", { class: "blank" }, inner) })
      ),
      h("p", { class: "example__translation" }, line.translation),
      h("p", {}, ja("span", { class: "feedback__word" }, kotoba.word), ` — ${kotoba.meaning}`),
    ],
    onAnswer: ({ value, type, correct }) => {
      hintButton.remove();
      translations.forEach((t) => (t.hidden = false)); // the feedback explains the answer anyway
      return onAnswer({
        prompt: `${plain.slice(0, blankRange.start)}${BLANK_MARK}${plain.slice(blankRange.end)}`,
        options,
        correctAnswer: line.blank,
        answer: value,
        answerType: type,
        hintUsed,
        correct,
        conversationId: conversation.id,
        blankLine: lineIndex + 1,
      });
    },
    onContinue,
  });
}
