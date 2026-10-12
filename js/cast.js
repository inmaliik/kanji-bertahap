// Characters (data/characters.json, D-102): the player's character, picked
// once per player, and the other speakers of the conversations.
//
// Every character image follows one standard (ASSETS.md): a square
// transparent PNG with the figure centered and drawn at the same scale, so
// one portrait crop box (in percent of the image) fits every character.
// A dedicated portrait file assets/karakter/<id>-potret.png, if the team
// draws one, replaces the automatic crop.
//
// Planned, not built (D-70): layered customization. A character would get
// "layers": [{ "slot": "rambut", "image": … }, …], each layer a full-size
// transparent PNG on the same canvas, stacked in order; the standard canvas
// is what makes the layers line up.

import { h } from "./dom.js";
import { PLAYER_SPEAKER } from "./validate.js";

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const ID = /^[a-z0-9][a-z0-9-]*$/;
const NAME_PLACEHOLDER = /«NAMA-[^»]*»/;

/** @returns {string[]} problems; an empty list means the file is usable */
export function validateCharacters(data) {
  if (!isPlainObject(data) || !Array.isArray(data.players) || !Array.isArray(data.others)) {
    return ['Isi file harus berupa { "players": [...], "others": [...] }.'];
  }
  const problems = [];
  if (!data.players.length) problems.push("Minimal satu karakter pemain.");
  const seen = new Set();
  for (const [group, list] of [["players", data.players], ["others", data.others]]) {
    list.forEach((c, i) => {
      const where = `${group} #${i + 1}`;
      if (!isPlainObject(c) || typeof c.id !== "string" || !ID.test(c.id)) {
        problems.push(`${where}: "id" harus huruf kecil latin, angka, dan "-".`);
        return;
      }
      if (c.id === PLAYER_SPEAKER) problems.push(`${where}: id "${PLAYER_SPEAKER}" dicadangkan untuk karakter pemain di percakapan.`);
      if (seen.has(c.id)) problems.push(`${where}: id "${c.id}" dipakai dua kali.`);
      seen.add(c.id);
      if (typeof c.name !== "string" || !c.name.trim()) problems.push(`${c.id}: "name" wajib diisi.`);
      else if (NAME_PLACEHOLDER.test(c.name)) problems.push(`${c.id}: nama masih penanda ${c.name}; tim mengisi nama buatan sendiri.`);
      if (group === "players" && typeof c.image !== "string") problems.push(`${c.id}: karakter pemain wajib punya "image".`);
      if (c.figure != null) {
        const { x, y, width, height } = c.figure;
        const ok = [x, y, width, height].every((v) => typeof v === "number" && v >= 0 && v <= 100) && width > 0 && height > 0 && x + width <= 100 && y + height <= 100;
        if (!ok) problems.push(`${c.id}: "figure" harus { x, y, width, height } dalam persen, dengan kotak di dalam gambar.`);
      }
      if (c.portrait != null) {
        const { x, y, size } = c.portrait;
        const ok = [x, y, size].every((v) => typeof v === "number" && v >= 0 && v <= 100) && size > 0 && x + size <= 100 && y + size <= 100;
        if (!ok) problems.push(`${c.id}: "portrait" harus { x, y, size } dalam persen, dengan kotak di dalam gambar.`);
      }
    });
  }
  return problems;
}

/** @returns {Promise<{characters: object|null, problems: string[]}>} never rejects */
export async function loadCharacters(url) {
  try {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) return { characters: null, problems: [`File ${url} tidak bisa diambil (HTTP ${response.status}).`] };
    const data = JSON.parse(await response.text());
    const problems = validateCharacters(data);
    const usable = isPlainObject(data) && Array.isArray(data.players) && Array.isArray(data.others);
    return { characters: usable ? data : null, problems };
  } catch (err) {
    return { characters: null, problems: [`File ${url} tidak bisa dibaca: ${err.message}`] };
  }
}

/** Conversation speakers that data/characters.json does not know. */
export function unknownSpeakers(model, characters) {
  const known = new Set((characters?.others ?? []).map((c) => c.id));
  const missing = new Set();
  for (const { conversation } of model.conversations.values()) {
    for (const line of conversation.lines) {
      if (line.speaker !== PLAYER_SPEAKER && !known.has(line.speaker)) missing.add(line.speaker);
    }
  }
  return [...missing];
}

export const portraitFile = (character) => `assets/karakter/${character.id}-potret.png`;

/**
 * The whole figure, cut from the square canvas with the "figure" box
 * (percent of the image: x, y, width, height). Without the box the full
 * canvas is shown, fitted.
 */
export function figureImage(character, { className = "" } = {}) {
  const f = character.figure;
  if (!f) {
    return h("span", { class: `asset ${className}`, style: "aspect-ratio: 1 / 1" }, h("img", { class: "asset__img", src: character.image, alt: "" }));
  }
  const el = h("span", { class: `figure-crop ${className}`, "aria-hidden": "true" });
  el.style.aspectRatio = `${f.width} / ${f.height}`;
  el.style.backgroundImage = `url("${character.image}")`;
  el.style.backgroundSize = `${(100 / f.width) * 100}% ${(100 / f.height) * 100}%`;
  el.style.backgroundPosition = `${(f.x / (100 - f.width)) * 100}% ${(f.y / (100 - f.height)) * 100}%`;
  return el;
}

/**
 * A round portrait. Uses the dedicated portrait file when it exists, else
 * the crop box of the full image; a character without any image gets its
 * initial on a plain disc.
 */
export function avatar(character, { className = "" } = {}) {
  const box = h("span", { class: `avatar ${className}`, "aria-hidden": "true" });
  const crop = () => {
    if (!character?.image) {
      const initial = character?.name && !NAME_PLACEHOLDER.test(character.name) ? character.name.charAt(0) : "?";
      box.replaceChildren(h("span", { class: "avatar__initial" }, initial));
      return;
    }
    const { x = 0, y = 0, size = 100 } = character.portrait ?? {};
    const span = 100 - size;
    const el = h("span", { class: "avatar__crop" });
    el.style.backgroundImage = `url("${character.image}")`;
    el.style.backgroundSize = `${(100 / size) * 100}%`;
    el.style.backgroundPosition = `${span ? (x / span) * 100 : 0}% ${span ? (y / span) * 100 : 0}%`;
    box.replaceChildren(el);
  };
  if (character?.id && character.image) {
    const img = h("img", { class: "avatar__img", src: portraitFile(character), alt: "" });
    img.addEventListener("error", crop, { once: true });
    box.append(img);
  } else {
    crop();
  }
  return box;
}

/**
 * Who speaks in the conversations of this player: the chosen character for
 * "player", the others by id.
 */
export function castFor(app) {
  const players = app.characters?.players ?? [];
  const player = players.find((c) => c.id === app.progress?.character) ?? null;
  const others = new Map((app.characters?.others ?? []).map((c) => [c.id, c]));
  const characterOf = (speaker) => (speaker === PLAYER_SPEAKER ? player : others.get(speaker) ?? { id: speaker, name: speaker, image: null });
  return {
    player,
    characterOf,
    nameOf: (speaker) => (speaker === PLAYER_SPEAKER ? (player ? player.name : "Kamu") : characterOf(speaker).name),
  };
}
