// Draws a cat from its layers (D-121), bottom to top:
//   1. the body fill, painted in the fur color through its own shape as a mask
//      (or shown as drawn when data/layers.json has no colors, D-116)
//   2. the pattern, cut to the body by the same mask
//   3. the body line: ink outline and shading
//   4. the accessory, centered on its anchor point
// A cat that is not free yet is only its body shape, in the silhouette color:
// no pattern, accessory or name gives it away.

import { h } from "./dom.js";
import { ACCESSORY_SCALE, resolveCat } from "./layers.js";

const masked = (url) => `-webkit-mask-image: url("${url}"); mask-image: url("${url}");`;

/**
 * @param {object} app needs app.layers and app.layerFiles (loaded at start)
 * @param {object} cat quest.cat from the content
 * @param {{silhouette?: boolean, className?: string, label?: string|null}} [options]
 */
export function catFigure(app, cat, { silhouette = false, className = "", label = null } = {}) {
  const box = h("span", {
    class: `cat${silhouette ? " cat--silhouette" : ""}${className ? ` ${className}` : ""}`,
    role: label ? "img" : null,
    "aria-label": label,
    "aria-hidden": label ? null : "true",
  });
  if (!app.layers) return box; // data/layers.json could not be read: an empty frame
  const r = resolveCat(app.layers, cat, app.layerFiles);
  if (silhouette) {
    box.append(h("span", { class: "cat__layer cat__shadow", style: masked(r.fill) }));
    return box;
  }
  // h() would skip null children; append() writes them as the text "null".
  const layers = [
    r.color
      ? h("span", { class: "cat__layer", style: `${masked(r.fill)} background-color: ${r.color};` })
      : h("img", { class: "cat__layer", src: r.fill, alt: "", decoding: "async" }),
    r.pattern ? h("span", { class: "cat__layer", style: `${masked(r.fill)} background-image: url("${r.pattern}");` }) : null,
    h("img", { class: "cat__layer", src: r.line, alt: "", decoding: "async" }),
    r.accessory
      ? h("img", {
          class: "cat__accessory",
          src: r.accessory.image,
          alt: "",
          decoding: "async",
          style: `left: ${r.accessory.x * 100}%; top: ${r.accessory.y * 100}%; width: ${ACCESSORY_SCALE * 100}%;`,
        })
      : null,
  ];
  box.append(...layers.filter(Boolean));
  return box;
}
