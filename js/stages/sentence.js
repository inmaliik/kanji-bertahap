// Stage 4 — Kotoba dalam kalimat: a sentence with the kotoba blanked out;
// the player picks the kotoba that fits. Distractors are manual only.

import { h, ja } from "../dom.js";
import { sentenceOptions } from "../distractors.js";
import { hideRuby, renderRuby } from "../ruby.js";
import { choiceQuestion } from "./choice.js";
import { wordWithRuby } from "../screens/common.js";

const BLANK_MARK = "___"; // how the blank appears in the logged prompt

export function renderSentence({ item, level, isRevealed, random, onAnswer, onContinue }) {
  const { kotoba, example, blankRange, plain } = item;
  const options = sentenceOptions(example, random);
  // Furigana on the level kanji would give away a reading question that may
  // still be ahead; it is shown only once that kotoba is revealed.
  const revealed = isRevealed(kotoba);
  const segments = revealed ? item.segments : hideRuby(item.segments, (seg) => seg.text.includes(level.kanji));

  // The translation is withheld until the player answers: showing it first
  // turns the question into meaning matching instead of reading in context.
  // A player who is stuck may ask for it; that is logged as hintUsed.
  let hintUsed = false;
  const translationHint = h("p", { class: "hint__text", hidden: true, "aria-live": "polite" }, example.translation);
  const hintButton = h(
    "button",
    {
      type: "button",
      class: "button hint__button",
      onClick: () => {
        hintUsed = true;
        translationHint.hidden = false;
        hintButton.remove();
      },
    },
    "Tampilkan arti"
  );

  const sentenceWithSlot = renderRuby(segments, {
    range: blankRange,
    wrap: () => h("span", { class: "blank-slot" }, h("span", { class: "sr-only", lang: "id" }, "(bagian kosong)")),
  });

  return choiceQuestion({
    prompt: [
      h("h2", { class: "question__title", tabindex: "-1" }, "Pilih kotoba yang tepat untuk bagian kosong"),
      ja("p", { class: "sentence-main" }, sentenceWithSlot),
      h("div", { class: "hint" }, hintButton, translationHint),
    ],
    options: options.map((o) => ({ ...o, content: o.value, lang: "ja" })),
    optionsClass: "options--grid options--words",
    correctValue: example.blank,
    explanation: () => [
      ja(
        "p",
        { class: "sentence-main sentence-main--answer" },
        renderRuby(segments, { range: blankRange, wrap: (inner) => h("mark", { class: "blank" }, inner) })
      ),
      h("p", { class: "example__translation" }, example.translation),
      h("p", {}, ja("span", { class: "feedback__word" }, revealed ? wordWithRuby(kotoba) : kotoba.word), ` — ${kotoba.meaning}`),
    ],
    onAnswer: ({ value, type, correct }) => {
      hintButton.remove();
      translationHint.hidden = true; // the feedback shows the translation
      return onAnswer({
        prompt: `${plain.slice(0, blankRange.start)}${BLANK_MARK}${plain.slice(blankRange.end)}`,
        options,
        correctAnswer: example.blank,
        answer: value,
        answerType: type,
        hintUsed,
        correct,
      });
    },
    onContinue,
  });
}
