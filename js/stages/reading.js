// Reading: show the quest's kotoba, the player picks its reading. The badge
// names the reading type (kun'yomi or on'yomi).

import { h, ja } from "../dom.js";
import { readingOptions, OPTION_TYPE } from "../distractors.js";
import { kotobaWithKanji } from "../model.js";
import { choiceQuestion } from "./choice.js";
import { highlightKanji, kotobaWithReading, LABELS, READING_DISPLAY, readingsTable } from "../screens/common.js";

// In answer feedback the reading is the point, so with furigana set to
// "never" it is written in kana after the word instead (D-73).
const feedbackDisplay = (showReading) => (showReading ? READING_DISPLAY.RUBY : READING_DISPLAY.KANA);

// Options longer than this switch the grid to a single column.
const GRID_MAX_CHARS = 6;

/**
 * Kun'yomi–on'yomi contrast across regions (D-56): other kotoba with the same
 * target kanji from regions already open. Only kotoba whose reading is no
 * longer pending are listed, and reading types still pending stay hidden in
 * the readings table, so feedback never gives away a later question.
 */
function readingContrast({ model, quest, kotoba, isRevealed, showReading }) {
  return quest.targetKanji.map((ch) => {
    const entry = model.kanji.get(ch);
    const related = kotobaWithKanji(model, ch, quest.region.chapter);
    const rows = related.filter((k) => k === kotoba || isRevealed(k));
    const hiddenTypes = ["kunyomi", "onyomi"].filter((type) => related.some((k) => k.readingType === type && k !== kotoba && !isRevealed(k)));
    return h(
      "div",
      { class: "contrast" },
      h("p", { class: "contrast__title" }, "Kanji ", ja("span", { class: "inline-kanji" }, ch), " di kotoba yang sudah kamu temui"),
      h(
        "ul",
        { class: "contrast__list" },
        rows.map((k) =>
          h(
            "li",
            { class: "contrast__row" },
            h("span", { class: `badge badge--${k.readingType}` }, LABELS.readingType[k.readingType]),
            ja("span", { class: "contrast__word" }, kotobaWithReading(k, { focus: [ch], display: feedbackDisplay(showReading) })),
            h("span", { class: "contrast__meaning" }, k.meaning)
          )
        )
      ),
      entry ? readingsTable(entry.readings, hiddenTypes) : null
    );
  });
}

/**
 * @param {object} ctx see shape.js, plus:
 * @param {object} ctx.model content model
 * @param {object} ctx.quest quest from the model
 * @param {(kotoba: object) => boolean} ctx.isRevealed D-29
 * @param {boolean} ctx.showReading false when the furigana setting is "never"
 * @param {object[]} ctx.candidates kotoba whose readings may serve as automatic distractors (D-84)
 */
export function renderReading({ item, model, quest, isRevealed, showReading, candidates, random, onAnswer, onContinue }) {
  const { kotoba } = item;
  const type = kotoba.readingType;
  const otherType = type === "kunyomi" ? "onyomi" : "kunyomi";
  const options = readingOptions(candidates, kotoba, random);
  const longest = Math.max(...options.map((o) => Array.from(o.value).length));

  return choiceQuestion({
    prompt: [
      h("h2", { class: "question__title", tabindex: "-1" }, "Pilih cara baca kotoba ini"),
      ja("p", { class: "word-main" }, highlightKanji(kotoba.word, quest.targetKanji)),
      h("p", { class: "question__hint" }, h("span", { class: `badge badge--${type}` }, LABELS.readingType[type]), ` Arti: ${kotoba.meaning}`),
    ],
    options: options.map((o) => ({ ...o, content: o.value, lang: "ja" })),
    optionsClass: `options--words ${longest <= GRID_MAX_CHARS ? "options--grid" : ""}`,
    correctValue: kotoba.reading,
    explanation: (correct, chosen) => [
      h(
        "p",
        { class: "feedback__answer" },
        ja("span", { class: "feedback__word" }, kotobaWithReading(kotoba, { focus: quest.targetKanji, display: feedbackDisplay(showReading) })),
        ` — ${kotoba.meaning}`
      ),
      !correct && chosen.type === OPTION_TYPE.MANUAL_CROSS
        ? h(
            "p",
            { class: "feedback__cross" },
            `Pilihanmu "`,
            ja("span", {}, chosen.value),
            `" membaca kanji ini dengan ${LABELS.readingType[otherType]}, padahal kotoba ini dibaca dengan ${LABELS.readingType[type]}.`
          )
        : null,
      kotoba.note ? h("p", { class: "kotoba__note" }, kotoba.note) : null,
      readingContrast({ model, quest, kotoba, isRevealed, showReading }),
    ],
    onAnswer: ({ value, type: answerType, correct }) =>
      onAnswer({ prompt: kotoba.word, options, correctAnswer: kotoba.reading, answer: value, answerType, correct }),
    onContinue,
  });
}
