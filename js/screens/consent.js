// Consent screen: shown before the first game of each player and reachable
// from Settings. The wording comes from data/consent.json (D-50).

import { h } from "../dom.js";
import { CONSENT_CHOICE, consentStatus, saveProgress, setConsent } from "../state.js";

const formatTime = (iso) => new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

export function consentStatusText(app) {
  const status = consentStatus(app.progress, app.consentText?.version ?? null);
  if (status === CONSENT_CHOICE.AGREED) return `Setuju direkam (${formatTime(app.progress.consent.at)})`;
  if (status === CONSENT_CHOICE.DECLINED) return `Main tanpa merekam (${formatTime(app.progress.consent.at)})`;
  return app.progress.consent ? "Belum memilih untuk versi teks yang berlaku" : "Belum memilih";
}

/**
 * @param {object} app shared app context
 * @param {{afterChoice: (choice: string) => void, backHref?: string}} options
 */
export function consentScreen(app, { afterChoice, backHref = null }) {
  const text = app.consentText;

  const choose = (choice) => {
    setConsent(app.progress, choice, text?.version ?? null);
    saveProgress(app.progress);
    afterChoice(choice);
  };

  return h(
    "div",
    { class: "screen consent" },
    backHref ? h("a", { class: "back-link", href: backHref }, h("span", { "aria-hidden": "true" }, "‹ "), "Kembali") : null,
    h("h1", { tabindex: "-1" }, text ? text.title : "Persetujuan perekaman jawaban"),
    text?.isPlaceholder
      ? h(
          "p",
          { class: "notice notice--error consent__placeholder", role: "note" },
          "✗ TEKS SEMENTARA — belum disetujui dosen pembimbing. Jangan dipakai untuk peserta penelitian sungguhan."
        )
      : null,
    text
      ? text.sections.map((section) =>
          h("section", { class: "card consent__section" }, h("h2", {}, section.heading), section.paragraphs.map((p) => h("p", {}, p)))
        )
      : h(
          "p",
          { class: "notice notice--error" },
          `✗ Teks persetujuan tidak bisa dimuat, jadi jawaban tidak bisa direkam. Permainan tetap bisa dimainkan tanpa merekam. (${app.consentError})`
        ),
    app.progress.consent ? h("p", { class: "muted" }, `Pilihan saat ini: ${consentStatusText(app)}`) : null,
    h(
      "div",
      { class: "consent__actions" },
      text
        ? h("button", { type: "button", class: "button button--primary button--block", onClick: () => choose(CONSENT_CHOICE.AGREED) }, "Saya setuju")
        : null,
      h("button", { type: "button", class: "button button--block", onClick: () => choose(CONSENT_CHOICE.DECLINED) }, "Main tanpa merekam")
    ),
    text ? h("p", { class: "consent__version muted" }, `Versi teks: ${text.version}`) : null
  );
}
