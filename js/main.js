// App bootstrap and hash routing.

import { CONTENT_URL } from "./config.js";
import { loadContent } from "./content.js";
import { loadPrefs, loadProgress } from "./state.js";
import { onLogAppended } from "./logger.js";
import { scheduleFlush, startLogSender } from "./log-sender.js";
import { startTabGuard } from "./tab-guard.js";
import { isStorageAvailable } from "./storage.js";
import { h } from "./dom.js";
import { issueList } from "./screens/common.js";
import { levelListScreen } from "./screens/level-list.js";
import { playScreen } from "./screens/play.js";
import { previewScreen, contentCheckScreen } from "./screens/preview.js";
import { settingsScreen } from "./screens/settings.js";

window.__kanjiAppBooted = true;

const root = document.getElementById("app");

/** Shared state passed to every screen. */
const app = {
  content: null,
  warnings: [],
  notes: [], // content notes (information only)
  progress: null,
  prefs: null,
  notices: [], // { kind, text } shown on the level list
  jlptFilter: "all",
  render,
};

const ROUTES = [
  { pattern: /^#?\/?$/, screen: () => levelListScreen(app) },
  { pattern: /^#\/play\/([^/]+)$/, screen: (id) => playScreen(app, decodeURIComponent(id)) },
  { pattern: /^#\/preview\/([^/]+)$/, screen: (id) => previewScreen(app, decodeURIComponent(id)) },
  { pattern: /^#\/content-check$/, screen: () => contentCheckScreen(app) },
  { pattern: /^#\/settings$/, screen: () => settingsScreen(app) },
];

function notFoundScreen() {
  return h(
    "div",
    { class: "screen" },
    h("a", { class: "back-link", href: "#/" }, "‹ Daftar level"),
    h("h1", { tabindex: "-1" }, "Halaman tidak ditemukan"),
    h("p", {}, "Halaman yang dicari tidak ada.")
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
  const result = await loadContent(CONTENT_URL);
  if (!result.content) {
    root.replaceChildren(contentErrorScreen(result));
    return;
  }
  app.content = result.content;
  app.warnings = result.warnings;
  app.notes = result.notes;
  app.prefs = loadPrefs();

  const { progress, recovered } = loadProgress();
  app.progress = progress;
  if (!isStorageAvailable()) {
    app.notices.push({ kind: "warning", text: "Penyimpanan browser tidak tersedia. Progres tidak akan tersimpan setelah halaman ditutup." });
  } else if (recovered) {
    app.notices.push({ kind: "warning", text: "Data progres sebelumnya rusak dan tidak bisa dibaca, jadi progres dimulai dari awal." });
  }

  // Remote log sending never blocks the game; it does nothing unless enabled in config.js.
  onLogAppended(scheduleFlush);
  startLogSender();
  startTabGuard(document.getElementById("tab-warning"));

  window.addEventListener("hashchange", navigate);
  navigate();
}

boot();
