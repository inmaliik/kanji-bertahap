// Conversation subtitles: one speech bubble per line, the player's character
// on the right. Used by the intro conversation and the context test.

import { h, ja } from "../dom.js";
import { renderRuby } from "../ruby.js";
import { PLAYER_SPEAKER } from "../validate.js";

/**
 * Display name of a speaker. Character names come from data/characters.json
 * in step 5; until then the id is shown capitalised.
 */
export function speakerName(speaker) {
  return speaker === PLAYER_SPEAKER ? "Kamu" : speaker.charAt(0).toUpperCase() + speaker.slice(1);
}

export function sceneCaption(conversation) {
  return h(
    "p",
    { class: "dialog__scene" },
    h("span", { class: "sr-only" }, "Situasi: "),
    conversation.scene,
    conversation.isPlaceholder ? h("span", { class: "dialog__placeholder" }, " · percakapan sementara, akan diganti tim konten") : null
  );
}

/**
 * @param {object} opts
 * @param {object} opts.line
 * @param {Array} opts.segments ruby segments already filtered by the furigana rules
 * @param {{start: number, end: number}|null} [opts.range] part of the line to wrap
 * @param {(fragment: DocumentFragment) => Node} [opts.wrap]
 * @param {Node|null} [opts.translation]
 */
export function dialogLine({ line, segments, range = null, wrap, translation = null }) {
  const own = line.speaker === PLAYER_SPEAKER;
  return h(
    "li",
    { class: `dialog__line ${own ? "dialog__line--player" : "dialog__line--other"}` },
    h("p", { class: "dialog__speaker" }, speakerName(line.speaker)),
    ja("p", { class: "dialog__ja" }, renderRuby(segments, range ? { range, wrap } : {})),
    translation
  );
}

export const lineTranslation = (line, hidden = false) => h("p", { class: "dialog__translation", hidden }, line.translation);
