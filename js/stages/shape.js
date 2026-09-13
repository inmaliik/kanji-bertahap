// Stage 1 — Bentuk: show the kanji, the player picks its bushu.

import { h, ja } from "../dom.js";
import { shapeOptions } from "../distractors.js";
import { choiceQuestion } from "./choice.js";

/**
 * Stage renderer contract (shared by all stages):
 * @param {object} ctx
 * @param {object} ctx.item item from buildLevelItems()
 * @param {object} ctx.level
 * @param {object[]} ctx.levels all content levels (distractor source)
 * @param {() => number} ctx.random
 * @param {(answer: object) => object} ctx.onAnswer receives log fields, returns the session result
 * @param {() => void} ctx.onContinue
 */
export function renderShape({ level, random, onAnswer, onContinue }) {
  const options = shapeOptions(level, random);
  const { bushu } = level;

  return choiceQuestion({
    prompt: [
      h("h2", { class: "question__title", tabindex: "-1" }, "Pilih bushu dari kanji ini"),
      ja("p", { class: "kanji-main" }, level.kanji),
    ],
    options: options.map((o) => ({ ...o, content: o.value, lang: "ja" })),
    optionsClass: "options--grid options--kanji",
    correctValue: bushu.char,
    explanation: () =>
      h(
        "p",
        {},
        "Bushu dari ",
        ja("span", { class: "inline-kanji" }, level.kanji),
        " adalah ",
        ja("span", { class: "inline-kanji" }, bushu.char),
        ` — ${bushu.name}, "${bushu.meaning}".`
      ),
    onAnswer: ({ value, type, correct }) =>
      onAnswer({ prompt: level.kanji, options, correctAnswer: bushu.char, answer: value, answerType: type, correct }),
    onContinue,
  });
}
