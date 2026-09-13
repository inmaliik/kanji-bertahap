// Stages 2 and 3 — Kun'yomi / On'yomi: show a kotoba, the player picks its
// reading. The stage type comes from item.stage.

import { h, ja } from "../dom.js";
import { readingOptions, OPTION_TYPE } from "../distractors.js";
import { PHASE } from "../session.js";
import { choiceQuestion } from "./choice.js";
import { highlightKanji, LABELS, readingContrast, wordWithRubyFocus } from "../screens/common.js";

// Options longer than this switch the grid to a single column.
const GRID_MAX_CHARS = 6;

// Before an on'yomi question in the learning pass, remind the player how the
// same kanji was read in stage 2. Kun'yomi kotoba were all answered already
// at that point, so this reveals nothing. In consolidation the kun'yomi item
// may still be ahead, so the contrast is shown only after answering.
function kunyomiReminder(level, isRevealed) {
  const kun = level.kotoba.filter((k) => k.readingType === "kunyomi" && isRevealed(k));
  return h(
    "div",
    { class: "contrast contrast--before" },
    h("p", { class: "contrast__title" }, "Kanji yang sama, cara baca berbeda"),
    kun.length
      ? h(
          "ul",
          { class: "contrast__list" },
          kun.map((k) =>
            h(
              "li",
              { class: "contrast__row" },
              h("span", { class: "badge badge--kunyomi" }, "Kun'yomi · tahap 2"),
              ja("span", { class: "contrast__word" }, wordWithRubyFocus(k, level.kanji))
            )
          )
        )
      : h("p", { class: "muted" }, "Level ini tidak punya kotoba kun'yomi."),
    h("p", { class: "contrast__now" }, "Sekarang kanji ini dibaca dengan ", h("strong", {}, "on'yomi"), ".")
  );
}

export function renderReading({ item, level, levels, phase, isRevealed, random, onAnswer, onContinue }) {
  const { kotoba } = item;
  const type = item.stage;
  const otherType = type === "kunyomi" ? "onyomi" : "kunyomi";
  const options = readingOptions(levels, level.id, kotoba, random);
  const longest = Math.max(...options.map((o) => Array.from(o.value).length));

  return choiceQuestion({
    prompt: [
      h("h2", { class: "question__title", tabindex: "-1" }, "Pilih cara baca kotoba ini"),
      type === "onyomi" && phase === PHASE.LEARNING ? kunyomiReminder(level, isRevealed) : null,
      ja("p", { class: "word-main" }, highlightKanji(kotoba.word, level.kanji)),
      h(
        "p",
        { class: "question__hint" },
        h("span", { class: `badge badge--${type}` }, LABELS.readingType[type]),
        ` Arti: ${kotoba.meaning}`
      ),
    ],
    options: options.map((o) => ({ ...o, content: o.value, lang: "ja" })),
    optionsClass: `options--words ${longest <= GRID_MAX_CHARS ? "options--grid" : ""}`,
    correctValue: kotoba.reading,
    explanation: (correct, chosen) => [
      h(
        "p",
        { class: "feedback__answer" },
        ja("span", { class: "feedback__word" }, wordWithRubyFocus(kotoba, level.kanji)),
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
      // The current kotoba is revealed by the answer itself.
      readingContrast(level, (k) => k === kotoba || isRevealed(k)),
    ],
    onAnswer: ({ value, type: answerType, correct }) =>
      onAnswer({ prompt: kotoba.word, options, correctAnswer: kotoba.reading, answer: value, answerType, correct }),
    onContinue,
  });
}
