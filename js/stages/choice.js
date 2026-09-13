// Multiple-choice question used by stages 1–4: options, verdict with icon and
// text (never color alone), explanation, and a Continue button.

import { h } from "../dom.js";

/**
 * @param {object} opts
 * @param {Node[]} opts.prompt question content
 * @param {Array<{value: string, type: string, content: Node|string, lang?: string}>} opts.options in display order
 * @param {string} opts.correctValue
 * @param {string} [opts.optionsClass] extra class for the options grid
 * @param {(correct: boolean, chosen: object) => Node|Node[]} opts.explanation shown after answering
 * @param {(answer: {value: string, type: string, correct: boolean}) => {mastered: boolean, willReturn: boolean}} opts.onAnswer
 * @param {() => void} opts.onContinue
 */
export function choiceQuestion({ prompt, options, correctValue, optionsClass = "", explanation, onAnswer, onContinue }) {
  let answered = false;

  const feedback = h("div", { class: "feedback", role: "status", "aria-live": "polite" });
  const continueButton = h(
    "button",
    { type: "button", class: "button button--primary button--block", hidden: true, onClick: onContinue },
    "Lanjut"
  );

  const buttons = options.map((option) => {
    const tag = h("span", { class: "option__tag" });
    const button = h(
      "button",
      { type: "button", class: "option", lang: option.lang, onClick: () => choose(option) },
      h("span", { class: "option__content" }, option.content),
      tag
    );
    return { option, button, tag };
  });

  function choose(chosen) {
    if (answered) return;
    answered = true;
    const correct = chosen.value === correctValue;

    for (const { option, button, tag } of buttons) {
      button.disabled = true;
      const isChosen = option === chosen;
      const isAnswer = option.value === correctValue;
      if (isAnswer) {
        button.classList.add("option--correct");
        tag.textContent = isChosen ? "✓ Pilihanmu benar" : "✓ Jawaban benar";
      } else if (isChosen) {
        button.classList.add("option--wrong");
        tag.textContent = "✗ Pilihanmu";
      } else {
        button.classList.add("option--dimmed");
      }
    }

    const result = onAnswer({ value: chosen.value, type: chosen.type, correct });
    let progressNote;
    if (result.mastered) progressNote = "Item ini sudah dikuasai.";
    else if (result.willReturn) progressNote = "Soal ini akan muncul lagi nanti.";
    else progressNote = "Jawab benar sekali lagi di putaran berikutnya untuk menguasai item ini.";

    feedback.className = `feedback ${correct ? "feedback--correct" : "feedback--wrong"}`;
    feedback.replaceChildren(
      h(
        "p",
        { class: "feedback__verdict" },
        h("span", { "aria-hidden": "true" }, correct ? "✓ " : "✗ "),
        correct ? "Benar" : "Belum tepat"
      ),
      h("div", { class: "feedback__explanation" }, explanation(correct, chosen)),
      h("p", { class: "feedback__progress" }, progressNote)
    );
    continueButton.hidden = false;
    continueButton.focus();
  }

  return h(
    "div",
    { class: "question" },
    h("div", { class: "question__prompt" }, prompt),
    h("div", { class: `options ${optionsClass}`, role: "group", "aria-label": "Pilihan jawaban" }, buttons.map((b) => b.button)),
    feedback,
    continueButton
  );
}
