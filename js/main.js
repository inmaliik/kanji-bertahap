// App bootstrap and hash routing.

import { ASSETS_URL, CONSENT_URL, CONTENT_URL, UI_LABELS_URL } from "./config.js";
import { isPlaceholderConsentVersion, loadConsentText } from "./consent.js";
import { loadContent } from "./content.js";
import { buildModel } from "./model.js";
import { loadUiLabels } from "./ui-labels.js";
import { loadAssetManifest } from "./assets.js";
import { loadProgress } from "./state.js";
import { onLogAppended } from "./logger.js";
import { scheduleFlush, startLogSender } from "./log-sender.js";
import { startTabGuard } from "./tab-guard.js";
import { isStorageAvailable } from "./storage.js";
import { h } from "./dom.js";
import { issueList } from "./screens/common.js";
import { contentCheckScreen } from "./screens/content-check.js";
import { questScreen, reviewScreen } from "./screens/quest.js";
import { mapScreen } from "./screens/map.js";
import { regionScreen } from "./screens/region.js";
import { indexScreen } from "./screens/index.js";
import { kanaScreen } from "./screens/kana.js";
import { settingsScreen } from "./screens/settings.js";
import { consentScreen } from "./screens/consent.js";

window.__kanjiAppBooted = true;

const root = document.getElementById("app");

/** Shared state passed to every screen. */
const app = {
  content: null,
  model: null, // lookup tables built from content (js/model.js)
  warnings: [],
  notes: [], // content notes (information only)
  progress: null,
  consentText: null, // data/consent.json, or null if it could not be loaded
  consentError: null,
  uiLabels: {}, // data/ui.json labels by key (D-76)
  uiProblems: [],
  assets: new Map(), // data/assets.json slots by id (D-70)
  assetProblems: [],
  notices: [], // { kind, text } shown on the home screen
  render,
};

// desain-peta branch: the printable preview returns in step 5.
const ROUTES = [
  { pattern: /^#?\/?$/, screen: () => mapScreen(app) },
  { pattern: /^#\/region\/([^/]+)$/, screen: (id) => regionScreen(app, decodeURIComponent(id)) },
  { pattern: /^#\/quest\/([^/]+)\/(\d+)$/, screen: (id, n) => questScreen(app, decodeURIComponent(id), n) },
  { pattern: /^#\/review\/([^/]+)$/, screen: (id) => reviewScreen(app, decodeURIComponent(id)) },
  { pattern: /^#\/index$/, screen: () => indexScreen(app) },
  { pattern: /^#\/kana$/, screen: () => kanaScreen(app) },
  { pattern: /^#\/content-check$/, screen: () => contentCheckScreen(app) },
  { pattern: /^#\/settings$/, screen: () => settingsScreen(app) },
  {
    pattern: /^#\/consent$/,
    screen: () => consentScreen(app, { afterChoice: () => (location.hash = "#/settings"), backHref: "#/settings" }),
  },
];

function notFoundScreen() {
  return h(
    "div",
    { class: "screen" },
    h("a", { class: "back-link", href: "#/" }, "‹ Peta"),
    h("h1", { tabindex: "-1" }, "Halaman tidak ditemukan"),
    h("p", {}, "Halaman yang dicari tidak ada, atau belum dibangun ulang di versi peta.")
  );
}

function contentErrorScreen({ errors, warnings }) {
  return h(
    "div",
    { class: "screen" },
    h("h1", { tabindex: "-1" }, "Materi belum bisa dimuat"),
    h(
      "p",
      {},
      `Ada ${errors.length} error di ${CONTENT_URL}. Aplikasi berhenti di sini supaya tidak ada jawaban yang tercatat dengan materi yang salah.`
    ),
    h(
      "p",
      {},
      "Perbaiki file tersebut, simpan, lalu muat ulang halaman. Pemeriksaan yang sama bisa dijalankan dari terminal: ",
      h("code", {}, "node tools/validate-content.mjs")
    ),
    issueList(errors),
    warnings.length ? [h("h2", {}, `Peringatan (${warnings.length})`), issueList(warnings)] : null
  );
}

/** Re-render the current route in place (keeps scroll position). */
function render() {
  const hash = location.hash;
  const route = ROUTES.find((r) => r.pattern.test(hash));
  root.replaceChildren(route ? route.screen(...hash.match(route.pattern).slice(1)) : notFoundScreen());
}

function navigate() {
  render();
  window.scrollTo(0, 0);
  root.querySelector("h1[tabindex], h2[tabindex]")?.focus({ preventScroll: true });
}

async function boot() {
  root.replaceChildren(h("p", { class: "loading" }, "Memuat materi…"));
  const [result, consent, ui, assets] = await Promise.all([
    loadContent(CONTENT_URL),
    loadConsentText(CONSENT_URL),
    loadUiLabels(UI_LABELS_URL),
    loadAssetManifest(ASSETS_URL),
  ]);
  app.consentText = consent.text;
  app.consentError = consent.error;
  app.uiLabels = ui.labels;
  app.uiProblems = ui.problems;
  app.assets = assets.slots;
  app.assetProblems = assets.problems;
  if (!result.content) {
    root.replaceChildren(contentErrorScreen(result));
    return;
  }
  app.content = result.content;
  app.model = buildModel(result.content);
  app.warnings = result.warnings;
  app.notes = result.notes;

  const { progress, recovered } = loadProgress();
  app.progress = progress;
  if (!isStorageAvailable()) {
    app.notices.push({ kind: "warning", text: "Penyimpanan browser tidak tersedia. Progres tidak akan tersimpan setelah halaman ditutup." });
  } else if (recovered) {
    app.notices.push({ kind: "warning", text: "Data progres sebelumnya rusak dan tidak bisa dibaca, jadi progres dimulai dari awal." });
  }

  // Remote log sending never blocks the game; it does nothing unless enabled in config.js.
  onLogAppended(scheduleFlush);
  // A placeholder consent text is not valid consent for research: nothing is sent (D-52).
  startLogSender({
    blockedReason:
      app.consentText && isPlaceholderConsentVersion(app.consentText.version)
        ? `teks persetujuan belum final (versi ${app.consentText.version})`
        : null,
  });
  startTabGuard(document.getElementById("tab-warning"));

  window.addEventListener("hashchange", navigate);
  navigate();
}

boot();
