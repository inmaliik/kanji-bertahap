// Story scenes (D-124): visual-novel style, still images with subtitles and
// optional voice, for the big moments only. A scene belongs to a world and
// plays once when its trigger fires:
//   world-opening  before that world's map shows for the first time
//   world-closing  when the world is complete (every chapter of its range in
//                  the material and done, D-116), so not before then
// A new scene with one of these triggers is a data change only; a new kind of
// trigger needs a little code here.
//
// The script is written by the team. Each line has a subtitle `text` (always
// shown), an optional Japanese line `ja` (furigana markup) and an optional
// voice file. The player's own lines have no voice (D-72, D-97): a recorded
// voice would not fit every character. A file name with {karakter} is the one
// exception the data allows, one recording per player character.
//
// Pages (D-125): the team draws a scene as pages, some with several panels. A
// page is one image; a panel of the script shows the whole page or zooms to a
// box on it (percent of the page, like the portrait crop box of a character).
// The reading order is the order of the panels in the script, so it lives in
// the data. A panel without lines is shown for one tap.
// Pure module: no DOM, no storage.

import { worldSummary } from "./progression.js";
import { PLAYER_SPEAKER } from "./validate.js";

export const SCENE_TRIGGERS = Object.freeze(["world-opening", "world-closing"]);
export const NARRATOR = "narrator";
/** Placeholder in a voice file name for one recording per player character. */
export const CHARACTER_SLOT = "{karakter}";
export const FIGURE_PLACES = Object.freeze(["kiri", "tengah", "kanan"]);

/** assets/cerita/<scene>/<panel image>.jpg */
export const panelPath = (scene, panel) => `assets/cerita/${scene.id}/${panel.image}.jpg`;

/**
 * The voice file of a line, or null: no file named, or a player's line
 * without the {karakter} slot.
 */
export function voicePath(scene, line, characterId) {
  if (!line.audio) return null;
  if (line.speaker === PLAYER_SPEAKER && !line.audio.includes(CHARACTER_SLOT)) return null;
  return `assets/suara/${scene.id}/${line.audio.replace(CHARACTER_SLOT, characterId ?? "")}.mp3`;
}

/** Every line of a scene in play order, with its panel. */
export const sceneLines = (scene) => scene.panels.flatMap((panel, p) => panel.lines.map((line, l) => ({ panel, line, panelIndex: p, lineIndex: l })));

/** What one tap shows, in play order: each line, or a panel without lines once (line null). */
export const sceneSteps = (scene) =>
  scene.panels.flatMap((panel, p) => (panel.lines.length ? panel.lines.map((line, l) => ({ panel, line, panelIndex: p, lineIndex: l })) : [{ panel, line: null, panelIndex: p, lineIndex: -1 }]));

export const WHOLE_PAGE = Object.freeze({ x: 0, y: 0, w: 100, h: 100 });
export const panelBox = (panel) => panel.box ?? WHOLE_PAGE;

/**
 * Where the page goes so that `box` fills the frame and stays whole, centred:
 * the page is drawn `frameWidth` wide (its height follows its own ratio), then
 * scaled by `scale` from its top-left corner and moved by (x, y), in pixels.
 * @param {{frameWidth: number, frameHeight: number, ratio: number, box?: {x: number, y: number, w: number, h: number}}} input
 *   ratio: page width / page height
 */
export function fitBox({ frameWidth, frameHeight, ratio, box = WHOLE_PAGE }) {
  const pageHeight = frameWidth / ratio;
  const bx = (frameWidth * box.x) / 100;
  const by = (pageHeight * box.y) / 100;
  const bw = (frameWidth * box.w) / 100;
  const bh = (pageHeight * box.h) / 100;
  const scale = Math.min(frameWidth / bw, frameHeight / bh);
  return { scale, x: frameWidth / 2 - scale * (bx + bw / 2), y: frameHeight / 2 - scale * (by + bh / 2) };
}

const findScene = (scenes, trigger, world) => (scenes ?? []).find((s) => s.trigger === trigger && s.world === world.number) ?? null;

/**
 * The scene that must play now for the world on screen, or null: its opening
 * if not seen yet, else its closing once the world is complete.
 */
export function dueScene(model, scenes, progress, world) {
  if (!world) return null;
  const opening = findScene(scenes, "world-opening", world);
  if (opening && !progress.scenesSeen[opening.id]) return opening;
  const closing = findScene(scenes, "world-closing", world);
  if (closing && !progress.scenesSeen[closing.id] && worldSummary(model, progress, world).complete) return closing;
  return null;
}

export function markSceneSeen(progress, scene, now = new Date()) {
  progress.scenesSeen[scene.id] ??= now.toISOString();
}

/** Scenes for the Cerita menu: seen ones can be replayed; the others say when they open. */
export function sceneMenu(model, scenes, progress) {
  return (scenes ?? []).map((scene) => {
    const world = model.worlds.find((w) => w.number === scene.world) ?? null;
    return { scene, world, seen: Boolean(progress.scenesSeen[scene.id]) };
  });
}

/** What the log says about one playing of a scene (an event row, D-68, D-124). */
export function sceneEvent(scene, { finished, linesShown, replay, ms }) {
  return {
    questStep: "scene",
    stage: "scene",
    itemId: `S:${scene.id}`,
    prompt: scene.id,
    answer: finished ? "selesai" : "dilewati",
    blankLine: linesShown, // for scene rows: the number of steps (lines, and panels without lines) shown before it ended
    introReplays: replay ? 1 : 0, // for scene rows: 1 when replayed from the Cerita menu
    responseMs: Math.round(ms),
  };
}
