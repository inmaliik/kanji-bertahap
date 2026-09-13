// Stage 5 — Produksi: the player writes one free sentence. Never scored:
// after sending, example sentences are shown for comparison and the player
// rates their own sentence. Sentence and self-assessment are logged together
// as one row when the self-assessment is chosen.

import { h, ja } from "../dom.js";
import { hideRuby, parseRuby, renderRuby } from "../ruby.js";
import { wordWithRuby } from "../screens/common.js";

const MAX_LENGTH = 200;

export const SELF_ASSESSMENT = Object.freeze({ SIMILAR: "similar", UNSURE: "unsure" });

/**
 * @param {object} ctx
 * @param {object} ctx.level
 * @param {(kotoba: object) => boolean} ctx.isRevealed whether a kotoba's reading may be shown
 * @param {(result: {sentence: string, selfAssessment: string, writingMs: number}) => void} ctx.onSubmit
 * @param {() => void} ctx.onContinue
 */
export function renderProduction({ level, isRevealed, onSubmit, onContinue }) {
  const shownAt = performance.now();
  let writingMs = 0;
  let sentence = "";

  const examples = level.kotoba.flatMap((k) => k.examples);
  // Consolidation follows this stage, so readings of the level kanji stay hidden.
  const exampleSegments = (ex) => hideRuby(parseRuby(ex.ja).segments, (seg) => seg.text.includes(level.kanji));
  // Hiragana sample that keeps the level kotoba in kanji, e.g. "まいあさパンを" + 食べます.
  const mixedSample = examples.length
    ? exampleSegments(examples[0]).map((seg) => seg.ruby ?? seg.text).join("")
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
      h("p", { class: "production__prompt" }, level.productionPrompt),
      h("p", { class: "production__label" }, "Kotoba di level ini:"),
      h(
        "ul",
        { class: "production__kotoba" },
        level.kotoba.map((k) =>
          h("li", {}, ja("span", { class: "feedback__word" }, isRevealed(k) ? wordWithRuby(k) : k.word), ` ${k.meaning}`)
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
        : h("p", { class: "muted" }, "Level ini tidak punya contoh kalimat."),
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
