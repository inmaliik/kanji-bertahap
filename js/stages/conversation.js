// Conversation subtitles: one speech bubble per line, the player's character
// on the right. Used by the intro conversation and the context test.

import { h, ja } from "../dom.js";
import { renderRuby } from "../ruby.js";
import { PLAYER_SPEAKER } from "../validate.js";
import { avatar } from "../cast.js";

/** File of a conversation's scene illustration, from the asset slot pattern. */
export const scenePath = (slot, conversation) => slot?.pattern?.replace("{conversationId}", conversation.id) ?? null;

/**
 * Scene illustration with the scene description as its caption. Until the
 * team draws it, a box names the file and its size; together with the
 * caption below it, that is the brief for the asset team (D-94).
 * @param {object} conversation
 * @param {object|undefined} slot the "adegan" slot of data/assets.json
 */
export function sceneFigure(conversation, slot) {
  const path = scenePath(slot, conversation);
  const placeholder = () =>
    h(
      "span",
      { class: "scene__placeholder" },
      h("span", { class: "scene__placeholder-title" }, "Ilustrasi belum ada"),
      path ? h("span", {}, `${path} · ${slot.width}×${slot.height} ${slot.format}`) : null
    );
  const box = h("span", { class: "asset scene__image", style: slot ? `aspect-ratio: ${slot.width} / ${slot.height}` : "aspect-ratio: 3 / 2" });
  if (path) {
    const img = h("img", { class: "asset__img", src: path, alt: "" });
    img.addEventListener("error", () => box.replaceChildren(placeholder()), { once: true });
    box.append(img);
  } else {
    box.append(placeholder());
  }
  return h(
    "figure",
    { class: "scene" },
    box,
    h(
      "figcaption",
      { class: "dialog__scene" },
      h("span", { class: "sr-only" }, "Situasi: "),
      conversation.scene,
      conversation.isPlaceholder ? h("span", { class: "dialog__placeholder" }, " · percakapan sementara, akan diganti tim konten") : null
    )
  );
}

/**
 * @param {object} opts
 * @param {object} opts.line
 * @param {Array} opts.segments ruby segments already filtered by the furigana rules
 * @param {{start: number, end: number}|null} [opts.range] part of the line to wrap
 * @param {(fragment: DocumentFragment) => Node} [opts.wrap]
 * @param {Node|null} [opts.translation]
 * @param {ReturnType<import("../cast.js").castFor>} opts.cast who speaks (D-102)
 */
export function dialogLine({ line, segments, range = null, wrap, translation = null, cast }) {
  const own = line.speaker === PLAYER_SPEAKER;
  return h(
    "li",
    { class: `dialog__line ${own ? "dialog__line--player" : "dialog__line--other"}` },
    avatar(cast.characterOf(line.speaker), { className: "dialog__avatar" }),
    h(
      "div",
      { class: "dialog__bubble" },
      h("p", { class: "dialog__speaker" }, cast.nameOf(line.speaker)),
      ja("p", { class: "dialog__ja" }, renderRuby(segments, range ? { range, wrap } : {})),
      translation
    )
  );
}

export const lineTranslation = (line, hidden = false) => h("p", { class: "dialog__translation", hidden }, line.translation);
