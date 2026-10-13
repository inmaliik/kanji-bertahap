// Production: the player writes one free sentence. Never scored:
// after sending, example sentences are shown for comparison and the player
// rates their own sentence. Sentence and self-assessment are logged together
// as one row when the self-assessment is chosen.

import { h, ja } from "../dom.js";
import { parseRuby, renderRuby } from "../ruby.js";
import { containsAny, visibleSegments } from "../furigana.js";
import { anyLeak } from "../reveal.js";
import { kotobaWithReading } from "../screens/common.js";
import { FURIGANA_MODE } from "../state.js";

const MAX_LENGTH = 200;

export const SELF_ASSESSMENT = Object.freeze({ SIMILAR: "similar", UNSURE: "unsure" });

/** The lines of a quest that are about its kotoba: highlighted intro lines and blank test lines. */
export function questExampleLines(quest) {
  return [...quest.intro.lines.filter((l) => l.highlight), ...quest.tests.map((c) => c.lines.find((l) => l.blank))];
}

/**
 * @param {object} ctx
 * @param {object} ctx.quest quest from the model
 * @param {object} ctx.kotoba kotoba of the quest
 * @param {string} ctx.mode furigana setting
 * @param {boolean} ctx.readingRevealed D-29: the kotoba's reading is no longer pending
 * @param {(segment: object) => boolean} [ctx.otherLeaks] readings pending in other quests (D-79)
 * @param {(result: {sentence: string, selfAssessment: string, writingMs: number}) => void} ctx.onSubmit
 * @param {() => void} ctx.onContinue
 */
export function renderProduction({ quest, kotoba, mode, readingRevealed, otherLeaks = () => false, onSubmit, onContinue }) {
  const shownAt = performance.now();
  let writingMs = 0;
  let sentence = "";

  const examples = questExampleLines(quest).map((line) => ({ ...line, segments: parseRuby(line.ja).segments }));
  // Consolidation follows this stage, so target readings stay hidden while still pending.
  const leaks = readingRevealed ? otherLeaks : anyLeak(containsAny(quest.targetKanji), otherLeaks);
  const exampleSegments = (ex) => visibleSegments(ex.segments, { mode, answered: true, leaks });
  // Hiragana sample that keeps the target kanji, e.g. "まいあさパンを" + 食べます.
  const mixedSample = examples.length
    ? visibleSegments(examples[0].segments, { mode: FURIGANA_MODE.ALWAYS, leaks: anyLeak(containsAny(quest.targetKanji), otherLeaks) })
        .map((seg) => seg.ruby ?? seg.text)
        .join("")
    : null;

  const root = h("div", { class: "question production" });

  function writeView() {
    const textarea = h("textarea", {
      id: "production-input",
      class: "production__input",
      lang: "ja",
      rows: "3",
      maxlength: String(MAX_LENGTH),
      autocomplete: "off",
      autocapitalize: "off",
      spellcheck: "false",
      "aria-describedby": "production-hint production-error",
    });
    const error = h("p", { id: "production-error", class: "production__error", "aria-live": "polite" });

    const submit = () => {
      const value = textarea.value.trim();
      if (!value) {
        error.textContent = "✗ Tulis satu kalimat dulu sebelum mengirim.";
        textarea.focus();
        return;
      }
      sentence = value;
      writingMs = Math.round(performance.now() - shownAt);
      compareView();
    };

    root.replaceChildren(
      h("h2", { class: "question__title", tabindex: "-1" }, "Tulis kalimatmu sendiri"),
      h("p", { class: "production__prompt" }, quest.productionPrompt),
      h("p", { class: "production__label" }, "Kotoba misi ini:"),
      h(
        "ul",
        { class: "production__kotoba" },
        h(
          "li",
          {},
          ja("span", { class: "feedback__word" }, readingRevealed && mode !== FURIGANA_MODE.NEVER ? kotobaWithReading(kotoba) : kotoba.word),
          ` ${kotoba.meaning}`
        )
      ),
      h("label", { for: "production-input", class: "production__label" }, "Kalimatmu"),
      textarea,
      error,
      h(
        "div",
        { id: "production-hint", class: "production__hint" },
        h(
          "p",
          {},
          "Tidak punya papan ketik Jepang? Kamu boleh menulis dengan ",
          h("strong", {}, "hiragana"),
          " saja, atau campur hiragana dengan kanji yang kamu tahu."
        ),
        mixedSample ? h("p", {}, "Contoh: ", ja("span", { class: "production__sample" }, mixedSample)) : null,
        h(
          "details",
          {},
          h("summary", {}, "Cara menambah papan ketik Jepang di ponsel"),
          h(
            "ul",
            {},
            h("li", {}, h("strong", {}, "Android (Gboard): "), "Setelan Gboard → Bahasa → Tambahkan keyboard → Jepang."),
            h("li", {}, h("strong", {}, "iPhone: "), "Pengaturan → Umum → Papan Ketik → Papan Ketik → Tambah Papan Ketik Baru → Jepang → Kana.")
          )
        )
      ),
      h("button", { type: "button", class: "button button--primary button--block", onClick: submit }, "Kirim kalimat")
    );
  }

  function compareView() {
    const status = h("p", { class: "production__recorded", "aria-live": "polite" });
    const continueButton = h(
      "button",
      { type: "button", class: "button button--primary button--block", hidden: true, onClick: onContinue },
      "Lanjut"
    );

    let chosen = false;
    const choice = (value, label) => {
      const button = h(
        "button",
        {
          type: "button",
          class: "button self-assessment__option",
          "aria-pressed": "false",
          onClick: () => {
            if (chosen) return;
            chosen = true;
            for (const b of buttons) b.disabled = true;
            button.setAttribute("aria-pressed", "true");
            button.append(h("span", { class: "self-assessment__tag" }, " ✓ dipilih"));
            onSubmit({ sentence, selfAssessment: value, writingMs });
            status.textContent = "Penilaianmu sudah dicatat. Tahap ini tidak diberi nilai.";
            continueButton.hidden = false;
            continueButton.focus();
          },
        },
        label
      );
      return button;
    };
    const buttons = [choice(SELF_ASSESSMENT.SIMILAR, "Sudah mirip"), choice(SELF_ASSESSMENT.UNSURE, "Masih ragu")];

    root.replaceChildren(
      h("h2", { class: "question__title", tabindex: "-1" }, "Bandingkan dengan contoh"),
      h("p", { class: "production__label" }, "Kalimatmu:"),
      ja("blockquote", { class: "production__sentence" }, sentence),
      h("p", { class: "production__label" }, "Contoh dari materi:"),
      examples.length
        ? h(
            "ol",
            { class: "examples" },
            examples.map((ex) =>
              h(
                "li",
                { class: "example" },
                ja("p", { class: "example__ja" }, renderRuby(exampleSegments(ex))),
                h("p", { class: "example__translation" }, ex.translation)
              )
            )
          )
        : h("p", { class: "muted" }, "Misi ini tidak punya contoh kalimat."),
      h(
        "fieldset",
        { class: "self-assessment" },
        h("legend", {}, "Menurutmu, kalimatmu sudah mirip dengan contoh?"),
        h("div", { class: "button-row" }, buttons)
      ),
      status,
      continueButton
    );
    root.querySelector(".question__title").focus();
  }

  writeView();
  return root;
}
