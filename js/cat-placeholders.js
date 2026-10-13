// Stand-in layers for the cats until the asset team delivers the drawings
// (D-121). Drawn by code on the same 512 × 512 canvas as the template in
// templat/: feet on the baseline y = 480, the figure centered on x = 256, ink
// lines 6 px wide. A layer whose file is missing gets the stand-in of the same
// kind and position in data/layers.json, so the stacking, masking, colors and
// anchors can be checked before any drawing exists. Pure module: strings only.

const INK = "#403c3c";
const svg = (body, size = 512) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">${body}</svg>`)}`;

// Each body: the shapes (used filled for the fill layer, outlined for the line
// layer), the tail as a thick stroke, and the face and legs (line layer only).
const BODIES = [
  {
    // duduk: sitting, seen from the front
    shapes: `<polygon points="163,124 176,36 236,94"/><polygon points="349,124 336,36 276,94"/>
      <ellipse cx="256" cy="172" rx="106" ry="92"/><ellipse cx="256" cy="372" rx="124" ry="108"/>`,
    tail: "M352 452 C 438 456 470 392 432 330",
    tailWidth: 30,
    details: `<circle cx="218" cy="166" r="9" fill="${INK}" stroke="none"/><circle cx="294" cy="166" r="9" fill="${INK}" stroke="none"/>
      <path d="M248 192 L264 192 L256 202 Z" fill="${INK}"/>
      <path d="M256 202 Q 246 216 234 210 M256 202 Q 266 216 278 210"/>
      <path d="M196 196 L140 186 M196 206 L142 214 M316 196 L372 186 M316 206 L370 214"/>
      <path d="M220 404 L220 476 M292 404 L292 476"/>`,
  },
  {
    // rebah: lying down, seen from the side
    shapes: `<polygon points="104,262 106,182 166,226"/><polygon points="234,246 248,170 196,222"/>
      <ellipse cx="170" cy="300" rx="90" ry="80"/><ellipse cx="318" cy="408" rx="172" ry="72"/>`,
    tail: "M478 424 C 512 376 494 334 452 340",
    tailWidth: 26,
    details: `<circle cx="142" cy="292" r="8" fill="${INK}" stroke="none"/><circle cx="198" cy="292" r="8" fill="${INK}" stroke="none"/>
      <path d="M162 316 L178 316 L170 326 Z" fill="${INK}"/>
      <path d="M170 326 Q 160 338 150 332 M170 326 Q 180 338 190 332"/>
      <path d="M120 318 L72 310 M122 328 L74 336 M222 318 L262 310"/>
      <path d="M190 458 Q 206 482 226 462 M250 462 Q 266 482 286 462"/>`,
  },
];

const bodyFill = (b) =>
  svg(`<g fill="#999">${b.shapes}</g><path d="${b.tail}" fill="none" stroke="#999" stroke-width="${b.tailWidth}" stroke-linecap="round"/>`);

// The tail outline: an ink stroke slightly wider than the tail, with the
// tail's own width cut out of it, leaves two thin edges.
const bodyLine = (b, i) =>
  svg(`<defs><mask id="t${i}"><rect width="512" height="512" fill="#fff"/>
      <path d="${b.tail}" fill="none" stroke="#000" stroke-width="${b.tailWidth}" stroke-linecap="round"/></mask></defs>
    <path d="${b.tail}" fill="none" stroke="${INK}" stroke-width="${b.tailWidth + 12}" stroke-linecap="round" mask="url(#t${i})"/>
    <g fill="none" stroke="${INK}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">${b.shapes}${b.details}</g>`);

export const PLACEHOLDER_BODIES = BODIES.map((b, i) => ({ fill: bodyFill(b), line: bodyLine(b, i) }));

// Patterns cover the whole body zone; the fill layer cuts them to the body.
const STRIPES = Array.from({ length: 10 }, (_, i) => `<rect x="0" y="${54 + i * 44}" width="512" height="16" rx="8"/>`).join("");
const SPOTS = Array.from({ length: 48 }, (_, i) => {
  const row = Math.floor(i / 8);
  return `<circle cx="${40 + (i % 8) * 62 + (row % 2) * 31}" cy="${70 + row * 70}" r="17"/>`;
}).join("");
export const PLACEHOLDER_PATTERNS = [
  svg(`<g fill="${INK}" fill-opacity="0.22">${STRIPES}</g>`),
  svg(`<g fill="${INK}" fill-opacity="0.22">${SPOTS}</g>`),
];

// Accessories: a 256 × 256 canvas whose center sits on the body's anchor.
const petal = (deg) => {
  const a = (deg * Math.PI) / 180;
  return `<circle cx="${(128 + 22 * Math.sin(a)).toFixed(1)}" cy="${(122 - 22 * Math.cos(a)).toFixed(1)}" r="15" fill="#bffcc6"/>`;
};
export const PLACEHOLDER_ACCESSORIES = [
  // a bow
  svg(
    `<g stroke="${INK}" stroke-width="5" stroke-linejoin="round">
      <path d="M128 128 L76 98 L80 160 Z" fill="#ffb3ba"/><path d="M128 128 L180 98 L176 160 Z" fill="#ffb3ba"/>
      <circle cx="128" cy="128" r="15" fill="#ffb3ba"/></g>`,
    256
  ),
  // a bell on a collar
  svg(
    `<g stroke="${INK}" stroke-width="5"><path d="M86 120 Q128 136 170 120" fill="none"/>
      <circle cx="128" cy="156" r="26" fill="#ffffba"/><path d="M112 164 L144 164" fill="none"/></g>
     <circle cx="128" cy="172" r="4" fill="${INK}"/>`,
    256
  ),
  // a flower
  svg(`<g stroke="${INK}" stroke-width="5">${[0, 72, 144, 216, 288].map(petal).join("")}<circle cx="128" cy="122" r="11" fill="#ffffba"/></g>`, 256),
];
