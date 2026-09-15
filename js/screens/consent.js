// Consent screen: shown before the first game of each player and reachable
// from Settings. The wording comes from data/consent.json (D-50).

import { h } from "../dom.js";
import { APP_VERSION } from "../config.js";
import { deleteRows, logAnswer } from "../logger.js";
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
  const root = h("div", { class: "screen consent" });

  const choose = (choice) => {
    setConsent(app.progress, choice, text?.version ?? null);
    saveProgress(app.progress);
    afterChoice(choice);
  };

  /**
   * Withdrawal (D-53): delete this player's rows from the local log and write
   * one withdrawal row, which tells the researchers which rows to delete from
   * the spreadsheet by hand.
   */
  function withdrawAndDelete() {
    const previous = app.progress.consent;
    const { playerId, participantCode } = app.progress;
    const deleted = deleteRows((record) => record.playerId === playerId);
    logAnswer({
      appVersion: APP_VERSION,
      contentRevision: app.content?.contentRevision,
      playerId,
      participantCode,
      consentStatus: "withdrawn",
      consentVersion: previous.version,
      consentAt: previous.at,
      phase: "withdrawal",
      prompt: "Penarikan persetujuan: peserta meminta data yang sudah terekam dihapus",
      answer: String(deleted), // rows deleted on this device
    });
    setConsent(app.progress, CONSENT_CHOICE.DECLINED, text?.version ?? previous.version);
    saveProgress(app.progress);

    root.replaceChildren(
      h("h1", { tabindex: "-1" }, "Data sudah dihapus dari perangkat ini"),
      h("p", { class: "notice notice--success", role: "status" }, `✓ ${deleted} jawaban yang tersimpan di perangkat ini sudah dihapus.`),
      h(
        "p",
        {},
        "Jawaban yang sudah telanjur terkirim ke server tidak bisa dihapus dari sini. Aplikasi mengirim catatan penarikan, " +
          "dan peneliti akan menghapus data tersebut secara manual."
      ),
      h("p", {}, "Mulai sekarang jawabanmu tidak direkam."),
      h("button", { type: "button", class: "button button--primary button--block", onClick: () => afterChoice(CONSENT_CHOICE.DECLINED) }, "Lanjut")
    );
    root.querySelector("h1").focus();
  }

  // A player who had agreed and now declines chooses what happens to the rows already recorded.
  function askAboutRecordedData() {
    root.replaceChildren(
      h("h1", { tabindex: "-1" }, "Berhenti merekam"),
      h("p", {}, "Kamu sebelumnya setuju jawabanmu direkam. Mulai sekarang jawabanmu tidak direkam lagi."),
      h("p", {}, "Apa yang dilakukan dengan jawaban yang sudah terekam?"),
      h(
        "div",
        { class: "consent__actions" },
        h("button", { type: "button", class: "button button--danger button--block", onClick: withdrawAndDelete }, "Hapus juga data saya yang sudah terekam"),
        h("button", { type: "button", class: "button button--block", onClick: () => choose(CONSENT_CHOICE.DECLINED) }, "Biarkan data yang sudah terekam"),
        h("button", { type: "button", class: "button button--block", onClick: showMain }, "Batal")
      )
    );
    root.querySelector("h1").focus();
  }

  const decline = () => {
    if (app.progress.consent?.choice === CONSENT_CHOICE.AGREED) askAboutRecordedData();
    else choose(CONSENT_CHOICE.DECLINED);
  };

  function showMain() {
    root.replaceChildren(...mainView().childNodes);
    root.querySelector("h1")?.focus();
  }

  const mainView = () => h(
    "div",
    {},
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
      h("button", { type: "button", class: "button button--block", onClick: decline }, "Main tanpa merekam")
    ),
    text ? h("p", { class: "consent__version muted" }, `Versi teks: ${text.version}`) : null
  );

  root.replaceChildren(...mainView().childNodes);
  return root;
}
