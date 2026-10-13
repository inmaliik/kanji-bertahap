// Shape: show a target kanji, the player picks its bushu. One item per kanji
// across the whole game (D-61).

import { h, ja } from "../dom.js";
import { shapeOptions } from "../distractors.js";
import { choiceQuestion } from "./choice.js";

/**
 * Stage renderer contract (shared by all stages):
 * @param {object} ctx
 * @param {object} ctx.item item from buildQuestItems()
 * @param {() => number} ctx.random
 * @param {(answer: object) => object} ctx.onAnswer receives log fields, returns the session result
 * @param {() => void} ctx.onContinue
 */
export function renderShape({ item, random, onAnswer, onContinue }) {
  const { kanji } = item;
  const options = shapeOptions(kanji, random);
  const { bushu } = kanji;

  return choiceQuestion({
    prompt: [
      h("h2", { class: "question__title", tabindex: "-1" }, "Pilih bushu dari kanji ini"),
      ja("p", { class: "kanji-main" }, kanji.char),
    ],
    options: options.map((o) => ({ ...o, content: o.value, lang: "ja" })),
    optionsClass: "options--grid options--kanji",
    correctValue: bushu.char,
    explanation: () =>
      h(
        "p",
        {},
        "Bushu dari ",
        ja("span", { class: "inline-kanji" }, kanji.char),
        " adalah ",
        ja("span", { class: "inline-kanji" }, bushu.char),
        ` — ${bushu.name}, "${bushu.meaning}". Arti kanji ini: ${kanji.meaning}.`
      ),
    onAnswer: ({ value, type, correct }) =>
      onAnswer({ prompt: kanji.char, options, correctAnswer: bushu.char, answer: value, answerType: type, correct }),
    onContinue,
  });
}
