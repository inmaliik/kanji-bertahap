// App bootstrap and hash routing.

import { ASSETS_URL, BUILD_URL, CHARACTERS_URL, CONSENT_URL, CONTENT_URL, KANA_URL, LAYERS_URL, MAP_URL, UI_LABELS_URL } from "./config.js";
import { loadLayers } from "./layers.js";
import { catsScreen } from "./screens/cats.js";
import { rewardsScreen } from "./screens/rewards.js";
import { rewardsAvailable } from "./rewards.js";
import { loadBuildId } from "./build.js";
import { isPlaceholderConsentVersion, loadConsentText } from "./consent.js";
import { loadContent } from "./content.js";
import { buildModel } from "./model.js";
import { loadUiLabels } from "./ui-labels.js";
import { loadAssetManifest } from "./assets.js";
import { FALLBACK_LAYOUT, loadMapLayout } from "./map-layout.js";
import { loadProgress } from "./state.js";
import { onLogAppended } from "./logger.js";
import { scheduleFlush, startLogSender } from "./log-sender.js";
import { startTabGuard } from "./tab-guard.js";
import { isStorageAvailable } from "./storage.js";
import { h } from "./dom.js";
import { issueList } from "./screens/common.js";
import { contentCheckScreen } from "./screens/content-check.js";
import { previewScreen } from "./screens/preview.js";
import { questScreen, reviewScreen } from "./screens/quest.js";
import { mapScreen } from "./screens/map.js";
import { indexScreen, kanjiDetailScreen, kanjiScreen, kotobaScreen } from "./screens/index.js";
import { leaderboardScreen } from "./screens/leaderboard.js";
import { kanaScreen, loadKana } from "./screens/kana.js";
import { aboutScreen, welcomeScreen } from "./screens/about.js";
import { characterScreen } from "./screens/character.js";
import { loadCharacters } from "./cast.js";
import { settingsScreen } from "./screens/settings.js";
import { consentScreen } from "./screens/consent.js";
import { gateScreen, modeBadge, researchLinkScreen } from "./screens/research.js";
import { currentMode } from "./event-log.js";
import { SESSION_MODE } from "./session-mode.js";

window.__kanjiAppBooted = true;

const root = document.getElementById("app");
// Research-mode badge, above every screen (D-112).
const badgeSlot = document.createElement("div");
root.before(badgeSlot);

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
  kana: null, // data/kana.json
  characters: null, // data/characters.json (D-102)
  characterProblems: [],
  mapLayout: FALLBACK_LAYOUT, // data/map.json: segments per world (D-108, D-117)
  mapProblems: [],
  layers: null, // data/layers.json (D-121)
  layerFiles: new Set(), // layer drawings that exist; the rest are stand-ins
  layerProblems: [],
  layerWarnings: [],
  kanaError: null,
  notices: [], // { kind, text } shown on the home screen
  render,
  refreshBadge, // for screens that re-render themselves, e.g. Settings
};

const ROUTES = [
  // Every new player sees the welcome screen with the disclaimer, then picks a character (D-71, D-102).
  { pattern: /^#?\/?$/, screen: () => firstScreen() },
  { pattern: /^#\/dunia\/(\d+)$/, screen: (n) => mapScreen(app, { world: Number(n) }) },
  { pattern: /^#\/region\/([^/]+)$/, screen: (id) => mapScreen(app, { sheetRegion: decodeURIComponent(id) }) },
  { pattern: /^#\/peringkat$/, screen: () => leaderboardScreen(app) },
  { pattern: /^#\/kucing$/, screen: () => catsScreen(app) },
  // In research mode there are no rewards: the address answers like any unknown page (D-123).
  { pattern: /^#\/hadiah$/, screen: () => (rewardsAvailable(currentMode(app)) ? rewardsScreen(app) : notFoundScreen()) },
  // The research link shared with participants; replaced by #/ once the player is in research mode (D-112).
  { pattern: /^#\/penelitian$/, screen: () => researchLinkScreen(app, () => location.replace("#/")) },
  { pattern: /^#\/quest\/([^/]+)\/(\d+)$/, screen: (id, n) => questScreen(app, decodeURIComponent(id), n) },
  { pattern: /^#\/review\/([^/]+)$/, screen: (id) => reviewScreen(app, decodeURIComponent(id)) },
  { pattern: /^#\/index$/, screen: () => indexScreen(app) },
  { pattern: /^#\/index\/kanji\/([^/]+)$/, screen: (ch) => kanjiScreen(app, decodeURIComponent(ch)) },
  { pattern: /^#\/index\/kanji\/([^/]+)\/detail$/, screen: (ch) => kanjiDetailScreen(app, decodeURIComponent(ch)) },
  { pattern: /^#\/index\/kotoba\/(\d+)$/, screen: (n) => kotobaScreen(app, n) },
  { pattern: /^#\/about$/, screen: () => aboutScreen(app) },
  { pattern: /^#\/kana$/, screen: () => kanaScreen(app) },
  { pattern: /^#\/content-check$/, screen: () => contentCheckScreen(app) },
  { pattern: /^#\/preview\/([^/]+)$/, screen: (id) => previewScreen(app, decodeURIComponent(id)) },
  { pattern: /^#\/settings$/, screen: () => settingsScreen(app) },
  {
    pattern: /^#\/consent$/,
    screen: () => consentScreen(app, { afterChoice: () => (location.hash = "#/settings"), backHref: "#/settings" }),
  },
];

function firstScreen() {
  // Research mode: consent and participant code before anything else. Other
  // modes ask for consent before the first quest instead (D-50).
  const gate = currentMode(app) === SESSION_MODE.RESEARCH ? gateScreen(app) : null;
  if (gate) return gate;
  if (!app.progress.welcomeSeen) return welcomeScreen(app, navigate);
  if (!app.progress.character && app.characters?.players?.length) return characterScreen(app, navigate);
  return mapScreen(app);
}

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
  refreshBadge();
  // Room at the bottom for the fixed menu bar (D-69), and no page scroll behind an open sheet.
  root.classList.toggle("with-menu", Boolean(root.querySelector(".menu")));
  document.body.classList.toggle("sheet-open", Boolean(root.querySelector(".sheet")));
  // Blue page for the screens already in the blue palette (D-118); the rest follow in stage 6.
  document.body.classList.toggle("page--blue", Boolean(root.querySelector(".map-screen, .cats-screen, .rewards-screen")));
}

function refreshBadge() {
  const badge = modeBadge(app);
  badgeSlot.replaceChildren(...(badge ? [badge] : []));
}

function navigate() {
  render();
  window.scrollTo(0, 0);
  root.querySelector("h1[tabindex], h2[tabindex]")?.focus({ preventScroll: true });
  // The map scrolls to the location the player is working on (D-108).
  root.querySelector("[data-scroll-target]")?.scrollIntoView({ block: "center", behavior: "instant" });
}

async function boot() {
  root.replaceChildren(h("p", { class: "loading" }, "Memuat materi…"));
  const [result, consent, ui, assets, kana, characters, map, , layers] = await Promise.all([
    loadContent(CONTENT_URL),
    loadConsentText(CONSENT_URL),
    loadUiLabels(UI_LABELS_URL),
    loadAssetManifest(ASSETS_URL),
    loadKana(KANA_URL),
    loadCharacters(CHARACTERS_URL),
    loadMapLayout(MAP_URL),
    loadBuildId(BUILD_URL), // before any row can be logged (D-115)
    loadLayers(LAYERS_URL),
  ]);
  app.layers = layers.layers;
  app.layerFiles = layers.available;
  app.layerProblems = layers.problems;
  app.layerWarnings = layers.warnings;
  app.mapLayout = map.layout;
  app.mapProblems = map.problems;
  app.characters = characters.characters;
  app.characterProblems = characters.problems;
  app.kana = kana.kana;
  app.kanaError = kana.error;
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
  // Escape closes the region sheet, like its close button.
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && root.querySelector(".sheet")) location.hash = "#/";
  });
  navigate();
}

boot();
