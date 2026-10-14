// Story scene player and the Cerita menu (D-124).
//
// Player: a start card first ("Mulai"), because no sound may play before the
// player taps; then one line at a time over its panel, and one tap for a panel
// without lines. A page with several panels (D-125) stays on screen while its
// panels follow: the page is shown whole, then zooms to each panel's box. The subtitle is always
// shown; the voice plays only when its file is already loaded, so the scene
// never waits for a download, and a missing file simply means no voice. Voice
// can be switched off (remembered per player; nothing is downloaded then), and
// the scene can be skipped at any time. Playing or skipping writes one event
// row through the same path as other events, so it follows the session mode
// (nothing in exhibition mode, sessionMode and buildId in every row, D-112).
//
// Menu (#/cerita, fifth door): scenes already seen can be replayed; the others
// say when they will play, without their title.

import { h } from "../dom.js";
import { castFor, figureImage } from "../cast.js";
import { recordEvent } from "../event-log.js";
import { visibleSegments } from "../furigana.js";
import { parseRuby, renderRuby } from "../ruby.js";
import { fitBox, markSceneSeen, NARRATOR, panelBox, panelPath, sceneEvent, sceneLines, sceneMenu, sceneSteps, voicePath } from "../scenes.js";
import { saveProgress } from "../state.js";
import { PLAYER_SPEAKER } from "../validate.js";
import { backLink } from "./common.js";
import { menuBar } from "./menu.js";

/** How many lines ahead the voice is fetched and decoded. */
export const VOICE_LOOKAHEAD = 3;

/**
 * Voice through the Web Audio API: one context, created on the player's tap
 * (browsers, iPhones above all, refuse sound before a tap), files fetched and
 * decoded ahead, played only when ready.
 */
function createVoice() {
  let context = null;
  let current = null;
  const decoded = new Map(); // path → Promise<AudioBuffer|null>
  const ready = new Map(); // path → AudioBuffer|null, once settled
  return {
    unlock() {
      const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
      if (!context && AudioContextClass) context = new AudioContextClass();
      context?.resume?.();
    },
    prefetch(path) {
      if (!path || !context || decoded.has(path)) return;
      const job = fetch(path)
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .then((data) => (data ? context.decodeAudioData(data) : null))
        .catch(() => null)
        .then((buffer) => {
          ready.set(path, buffer);
          return buffer;
        });
      decoded.set(path, job);
    },
    /** Plays the line's voice if it is ready now; never waits. */
    play(path) {
      this.stop();
      const buffer = path ? ready.get(path) : null;
      if (!buffer || !context) return false;
      current = context.createBufferSource();
      current.buffer = buffer;
      current.connect(context.destination);
      current.start();
      return true;
    },
    stop() {
      try {
        current?.stop();
      } catch {
        // already ended
      }
      current = null;
    },
    close() {
      this.stop();
      context?.close?.();
    },
  };
}

/** What shows while a page is not drawn yet: its file name, its size, and the illustrator's brief. */
const placeholder = (path, panel) =>
  h(
    "div",
    { class: "scene__placeholder" },
    h("strong", {}, "Panel belum digambar"),
    h("span", {}, path),
    h("span", {}, "JPEG 1600 × 1200 (mendatar), maks 150 KB"),
    panel.note ? h("span", { class: "scene__note" }, panel.note) : null
  );

/**
 * The stage keeps one page image while panels of the same page follow, so
 * going from the whole page to a panel's box is a zoom, not a new picture.
 * The image is drawn frame-wide and moved with a transform (fitBox); it is
 * placed again, without animation, when the frame changes size.
 */
function createStage(scene, onTap) {
  const frame = h("div", { class: "scene__frame" });
  const stage = h("div", { class: "scene__stage", onClick: onTap }, frame);
  let image = null;
  let img = null;
  let ratio = null;
  let box = null;
  const place = (animate) => {
    const width = frame.clientWidth;
    const height = frame.clientHeight;
    if (!img || !ratio || !width || !height) return;
    const { scale, x, y } = fitBox({ frameWidth: width, frameHeight: height, ratio, box });
    img.classList.toggle("scene__img--moving", animate);
    img.style.width = `${width}px`;
    img.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  };
  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(() => place(false)) : null;
  observer?.observe(frame);
  return {
    element: stage,
    show(panel, figureLayer) {
      box = panelBox(panel);
      if (panel.image !== image) {
        image = panel.image;
        ratio = null;
        const path = panelPath(scene, panel);
        const next = h("img", { class: "scene__img", src: path, alt: "", decoding: "async" });
        next.addEventListener(
          "load",
          () => {
            if (img !== next) return;
            ratio = next.naturalWidth / next.naturalHeight;
            place(false);
            next.classList.add("scene__img--ready");
          },
          { once: true }
        );
        next.addEventListener(
          "error",
          () => {
            if (img !== next) return;
            img = null;
            frame.replaceChildren(placeholder(path, panel));
          },
          { once: true }
        );
        img = next;
        frame.replaceChildren(next);
      } else {
        place(true);
      }
      stage.querySelector(".scene__figures")?.remove();
      stage.append(figureLayer);
    },
    close() {
      observer?.disconnect();
    },
  };
}

function figures(app, panel) {
  const cast = castFor(app);
  return h(
    "div",
    { class: "scene__figures", "aria-hidden": "true" },
    (panel.figures ?? []).map((f) => {
      const who = f.who === PLAYER_SPEAKER ? cast.player : cast.characterOf(f.who);
      const body = who?.image ? figureImage(who, { className: "scene__figure-img" }) : h("span", { class: "scene__figure-shape" });
      return h("div", { class: `scene__figure scene__figure--${f.at}` }, body);
    })
  );
}

/**
 * @param {{replay?: boolean, onDone: () => void}} options
 */
export function sceneScreen(app, scene, { replay = false, onDone }) {
  const steps = sceneSteps(scene);
  const cast = castFor(app);
  const voice = createVoice();
  const root = h("div", { class: "screen scene-screen" });
  const stage = createStage(scene, () => advance());
  let index = -1;
  let startedAt = 0;
  let ended = false;

  const voiceOf = (i) => (i >= 0 && i < steps.length && steps[i].line ? voicePath(scene, steps[i].line, app.progress.character) : null);
  const prefetch = () => {
    if (!app.progress.settings.sceneVoice) return;
    for (let i = index; i <= index + VOICE_LOOKAHEAD; i++) voice.prefetch(voiceOf(i));
  };

  const finish = (finished) => {
    if (ended) return;
    ended = true;
    voice.close();
    stage.close();
    markSceneSeen(app.progress, scene);
    saveProgress(app.progress);
    recordEvent(app, sceneEvent(scene, { finished, linesShown: Math.max(0, index + 1), replay, ms: startedAt ? performance.now() - startedAt : 0 }));
    onDone();
  };

  const voiceButton = () =>
    h(
      "button",
      {
        type: "button",
        class: "button scene__voice",
        "aria-pressed": String(app.progress.settings.sceneVoice),
        onClick: () => {
          app.progress.settings.sceneVoice = !app.progress.settings.sceneVoice;
          saveProgress(app.progress);
          if (!app.progress.settings.sceneVoice) voice.stop();
          else prefetch();
          root.querySelector(".scene__voice").replaceWith(voiceButton());
        },
      },
      app.progress.settings.sceneVoice ? "🔊 Suara nyala" : "🔇 Suara mati"
    );
  const bar = () =>
    h(
      "div",
      { class: "scene__bar" },
      voiceButton(),
      h("button", { type: "button", class: "button scene__skip", onClick: () => finish(false) }, "Lewati ⏭")
    );

  const subtitle = (line, count) => {
    if (!line) return h("div", { class: "scene__subtitle scene__subtitle--silent" }, count);
    const speaker = line.speaker === NARRATOR ? null : cast.nameOf(line.speaker);
    const ja = line.ja ? visibleSegments(parseRuby(line.ja).segments, { mode: app.progress.settings.furiganaMode, intro: true }) : null;
    return h(
      "div",
      { class: `scene__subtitle${line.speaker === NARRATOR ? " scene__subtitle--narrator" : ""}${line.speaker === PLAYER_SPEAKER ? " scene__subtitle--player" : ""}` },
      speaker ? h("p", { class: "scene__speaker" }, speaker) : null,
      ja ? h("p", { class: "scene__ja", lang: "ja" }, renderRuby(ja)) : null,
      h("p", { class: "scene__text" }, line.text),
      count
    );
  };

  function showStep() {
    const { panel, line } = steps[index];
    if (index === 0) {
      root.replaceChildren(
        ...h(
          "div",
          {},
          h("h1", { class: "sr-only", tabindex: "-1" }, scene.title),
          bar(),
          stage.element,
          h("div", { class: "scene__caption", "aria-live": "polite" }),
          h("button", { type: "button", class: "button button--primary button--block scene__next", onClick: advance })
        ).childNodes
      );
    }
    const voiced = app.progress.settings.sceneVoice && voice.play(voiceOf(index));
    const next = steps[index + 1];
    if (next && next.panel.image !== panel.image) new Image().src = panelPath(scene, next.panel);
    prefetch();
    stage.show(panel, figures(app, panel));
    const count = h("p", { class: "scene__count" }, `${index + 1} / ${steps.length}`, voiced ? h("span", { class: "scene__voiced", "aria-hidden": "true" }, " · 🔊") : null);
    root.querySelector(".scene__caption").replaceChildren(subtitle(line, count));
    const button = root.querySelector(".scene__next");
    button.textContent = index === steps.length - 1 ? "Selesai" : "Lanjut ▸";
    button.focus({ preventScroll: true });
  }

  function advance() {
    if (ended) return;
    if (index >= steps.length - 1) {
      finish(true);
      return;
    }
    index += 1;
    showStep();
  }

  // Start card: the tap that allows sound.
  const start = () => {
    voice.unlock();
    startedAt = performance.now();
    prefetch();
    advance();
  };
  root.append(
    ...h(
      "div",
      {},
      bar(),
      h(
        "div",
        { class: "scene__start" },
        h("p", { class: "scene__kind" }, scene.trigger === "world-opening" ? `Pembuka Dunia ${scene.world}` : `Penutup Dunia ${scene.world}`),
        h("h1", { tabindex: "-1" }, scene.title),
        h("p", { class: "muted" }, `${sceneLines(scene).length} baris. Subtitle selalu tampil; suara bisa dimatikan.`),
        h("button", { type: "button", class: "button button--primary button--block", onClick: start }, "▶ Mulai")
      )
    ).childNodes
  );
  return root;
}

export function sceneMenuScreen(app) {
  const items = sceneMenu(app.model, app.content.scenes, app.progress).filter((s) => s.world);
  const label = (s) => (s.scene.trigger === "world-opening" ? `Pembuka Dunia ${s.scene.world}` : `Penutup Dunia ${s.scene.world}`);
  return h(
    "div",
    { class: "screen scenes-screen" },
    backLink("#/", "Peta"),
    h("h1", { tabindex: "-1" }, "Cerita"),
    h("p", { class: "muted" }, "Adegan cerita yang sudah kamu tonton bisa diputar ulang di sini."),
    items.length
      ? h(
          "ul",
          { class: "scene-list" },
          items.map((s) =>
            h(
              "li",
              { class: `scene-card${s.seen ? "" : " scene-card--locked"}` },
              h("p", { class: "scene-card__kind" }, label(s)),
              s.seen
                ? [h("p", { class: "scene-card__title" }, s.scene.title), h("a", { class: "button button--block", href: `#/cerita/${encodeURIComponent(s.scene.id)}` }, "▶ Putar ulang")]
                : h(
                    "p",
                    { class: "scene-card__when" },
                    s.scene.trigger === "world-opening"
                      ? `🔒 Diputar saat kamu pertama kali membuka Dunia ${s.scene.world}.`
                      : `🔒 Terbuka setelah Dunia ${s.scene.world} tamat.`
                  )
            )
          )
        )
      : h("p", { class: "notice notice--info" }, "Belum ada adegan cerita."),
    menuBar(app, "story")
  );
}
