// About the app, with the disclaimer (D-71): shown once as the first screen
// of every player (before character selection, which comes in step 5), and
// reachable from the map and Settings afterwards.

import { h } from "../dom.js";
import { APP_TITLE, APP_VERSION } from "../config.js";
import { getBuildId } from "../build.js";
import { saveProgress } from "../state.js";
import { uiLabel } from "../ui-labels.js";
import { backLink } from "./common.js";

/** The disclaimer paragraph; the book title comes from data/ui.json. */
export function disclaimer(app) {
  return h(
    "p",
    { class: "disclaimer" },
    "Materi aplikasi ini mengikuti cakupan ",
    uiLabel(app, "bookTitle"),
    " bab 1–12. Semua kalimat dan percakapan ditulis oleh tim pengembang dan tidak disalin dari buku."
  );
}

function aboutBody(app) {
  return [
    h("p", {}, `${APP_TITLE} adalah web game untuk belajar kanji dan kotoba, bagi mahasiswa semester 1 Pendidikan Bahasa Jepang.`),
    disclaimer(app),
    h("p", { class: "muted" }, `Versi aplikasi ${APP_VERSION} · build ${getBuildId().slice(0, 12)} · revisi materi ${app.content.contentRevision}`),
  ];
}

export function aboutScreen(app) {
  return h("div", { class: "screen about" }, backLink("#/", "Peta"), h("h1", { tabindex: "-1" }, "Tentang aplikasi"), aboutBody(app));
}

/** First screen of a new player. `onDone` continues to the map. */
export function welcomeScreen(app, onDone) {
  return h(
    "div",
    { class: "screen about" },
    h("h1", { tabindex: "-1" }, `Selamat datang di ${APP_TITLE}`),
    aboutBody(app),
    h(
      "button",
      {
        type: "button",
        class: "button button--primary button--block",
        onClick: () => {
          app.progress.welcomeSeen = true;
          saveProgress(app.progress);
          onDone();
        },
      },
      "Mulai"
    )
  );
}
