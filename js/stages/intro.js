// Intro conversation of a quest (unscored): the lines appear one at a time,
// the kotoba of the quest is highlighted, and the translation is always shown
// (D-67). Target readings may show here (D-65). At the end the kotoba is
// introduced, and the player may replay the conversation before practising.

import { h, ja } from "../dom.js";
import { parseRuby } from "../ruby.js";
import { visibleSegments } from "../furigana.js";
import { FURIGANA_MODE } from "../state.js";
import { dialogLine, lineTranslation, sceneFigure } from "./conversation.js";
import { kotobaWithReading, READING_DISPLAY } from "../screens/common.js";

/**
 * @param {object} ctx
 * @param {object} ctx.conversation
 * @param {object} ctx.kotoba
 * @param {string[]} ctx.targetKanji
 * @param {string} ctx.mode furigana setting
 * @param {object} [ctx.sceneSlot] "adegan" slot of data/assets.json
 * @param {(result: {replays: number}) => void} ctx.onDone
 */
export function renderIntro({ conversation, kotoba, targetKanji, mode, sceneSlot, onDone }) {
  const lines = conversation.lines.map((line) => {
    const { segments, plain } = parseRuby(line.ja);
    const start = line.highlight ? plain.indexOf(line.highlight) : -1;
    return {
      line,
      segments: visibleSegments(segments, { mode, intro: true }),
      range: start === -1 ? null : { start, end: start + line.highlight.length },
    };
  });

  let shown = 1;
  let replays = 0;
  const root = h("div", { class: "question intro" });
  const list = h("ol", { class: "dialog", "aria-live": "polite" });
  const actions = h("div", { class: "intro__actions" });

  function renderLines() {
    list.replaceChildren(
      ...lines.slice(0, shown).map(({ line, segments, range }) =>
        dialogLine({ line, segments, range, wrap: (inner) => h("mark", { class: "highlight" }, inner), translation: lineTranslation(line) })
      )
    );
  }

  function renderActions() {
    if (shown < lines.length) {
      actions.replaceChildren(
        h(
          "button",
          {
            type: "button",
            class: "button button--primary button--block",
            onClick: () => {
              shown += 1;
              renderLines();
              renderActions();
            },
          },
          "Lanjut ▸"
        )
      );
      return;
    }
    actions.replaceChildren(
      h(
        "section",
        { class: "card kotoba-card", "aria-labelledby": "kotoba-card-title" },
        h("h3", { id: "kotoba-card-title", class: "kotoba-card__title" }, "Kotoba di percakapan ini"),
        ja("p", { class: "kotoba-card__word" }, kotobaWithReading(kotoba, { focus: targetKanji, display: mode === FURIGANA_MODE.NEVER ? READING_DISPLAY.NONE : READING_DISPLAY.RUBY })),
        h("p", { class: "kotoba-card__meaning" }, kotoba.meaning)
      ),
      h(
        "button",
        {
          type: "button",
          class: "button button--block",
          onClick: () => {
            replays += 1;
            shown = 1;
            renderLines();
            renderActions();
          },
        },
        "↺ Ulangi percakapan"
      ),
      h("button", { type: "button", class: "button button--primary button--block", onClick: () => onDone({ replays }) }, "Mulai latihan")
    );
  }

  renderLines();
  renderActions();
  root.append(h("h2", { class: "question__title", tabindex: "-1" }, "Simak percakapan ini"), sceneFigure(conversation, sceneSlot), list, actions);
  return root;
}
