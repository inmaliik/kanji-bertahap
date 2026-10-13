// Research sessions (D-112): the research link, the gate before playing
// (consent, then the participant code), and the badge that stays visible in
// research mode so researchers can check a participant's device at a glance.

import { h } from "../dom.js";
import { currentMode } from "../event-log.js";
import { loadDevice, saveDevice } from "../leaderboard.js";
import {
  enterResearch,
  hasPlayed,
  participantCodeProblem,
  PARTICIPANT_CODE_EXAMPLE,
  pendingStep,
  SESSION_MODE,
} from "../session-mode.js";
import { resetProgress, saveProgress } from "../state.js";
import { consentScreen } from "./consent.js";

/**
 * The screen a player must pass before playing, or null.
 * @param {string|null} backHref where "Kembali" leads; null on the first screen
 */
export function gateScreen(app, backHref = null) {
  const step = pendingStep(currentMode(app), app.progress, app.consentText?.version ?? null);
  if (step === "consent") return consentScreen(app, { afterChoice: () => app.render(), backHref });
  if (step === "participant") return participantScreen(app, backHref);
  return null;
}

function participantScreen(app, backHref) {
  const error = h("p", { class: "notice notice--error", role: "alert", hidden: true });
  const input = h("input", {
    type: "text",
    id: "participant-code",
    class: "text-input",
    maxlength: "32",
    placeholder: PARTICIPANT_CODE_EXAMPLE,
    autocomplete: "off",
    autocapitalize: "characters",
    spellcheck: "false",
    "aria-describedby": "participant-help",
  });

  const save = (event) => {
    event.preventDefault();
    const code = input.value.trim();
    const problem = participantCodeProblem(code);
    if (problem) {
      error.textContent = `✗ ${problem}`;
      error.hidden = false;
      input.focus();
      return;
    }
    app.progress.participantCode = code;
    saveProgress(app.progress);
    app.render();
  };

  return h(
    "div",
    { class: "screen" },
    backHref ? h("a", { class: "back-link", href: backHref }, h("span", { "aria-hidden": "true" }, "‹ "), "Kembali") : null,
    h("h1", { tabindex: "-1" }, "Kode peserta"),
    h(
      "p",
      { id: "participant-help" },
      "Sesi penelitian membutuhkan kode peserta dari peneliti, misalnya ",
      h("strong", {}, h("code", {}, PARTICIPANT_CODE_EXAMPLE)),
      ". Gunakan ",
      h("strong", {}, "kode anonim"),
      ", ",
      h("strong", {}, "bukan nama atau NIM"),
      ". Permainan dimulai setelah kode diisi."
    ),
    h(
      "form",
      { onSubmit: save },
      h("label", { for: "participant-code", class: "field-label" }, "Kode peserta"),
      input,
      error,
      h("button", { type: "submit", class: "button button--primary button--block" }, "Simpan dan mulai")
    )
  );
}

/**
 * The research link (#/penelitian). A player who already played or decided
 * something is asked first, because research mode starts a fresh player so
 * every participant begins under the same conditions.
 * @param {() => void} enter called once the player is in research mode
 */
export function researchLinkScreen(app, enter) {
  if (currentMode(app) === SESSION_MODE.RESEARCH) {
    enter();
    return h("div", { class: "screen" });
  }
  const start = (fresh) => {
    if (fresh) app.progress = resetProgress();
    enterResearch(app.progress);
    saveProgress(app.progress);
    // Research conditions are the same for everyone: no exhibition leftovers on this device.
    const device = loadDevice();
    if (device.exhibitionMode) saveDevice({ ...device, exhibitionMode: false });
    enter();
  };
  if (!hasPlayed(app.progress)) {
    start(false);
    return h("div", { class: "screen" });
  }
  return h(
    "div",
    { class: "screen" },
    h("h1", { tabindex: "-1" }, "Mulai sesi penelitian"),
    h(
      "p",
      {},
      "Perangkat ini masih menyimpan progres pemain sebelumnya. Sesi penelitian selalu dimulai dari awal sebagai pemain " +
        "baru, supaya kondisi semua peserta sama."
    ),
    h("ul", {}, h("li", {}, "Progres misi, pilihan persetujuan, dan kode peserta pemain sebelumnya dihapus."), h("li", {}, "Riwayat jawaban (log) tidak dihapus.")),
    h(
      "div",
      { class: "button-row" },
      h("button", { type: "button", class: "button button--primary", onClick: () => start(true) }, "Mulai sebagai pemain baru"),
      h("a", { class: "button", href: "#/" }, "Batal")
    )
  );
}

/** Small badge shown on every screen in research mode, or null. */
export function modeBadge(app) {
  if (!app.progress || currentMode(app) !== SESSION_MODE.RESEARCH) return null;
  const code = app.progress.participantCode;
  return h(
    "p",
    { class: "mode-badge", role: "status" },
    h("span", { "aria-hidden": "true" }, "● "),
    "Mode penelitian",
    code ? ` · ${code}` : " · kode belum diisi"
  );
}
