#!/usr/bin/env node
// Export the team's line-art scene pages for the app (ASSETS.md, Adegan cerita; D-125):
// full size, transparent background made white, greyscale with 16 levels (4-bit PNG).
// Line art stays sharp when the player zooms into a panel, and the files stay small.
//
// Usage:
//   node tools/ekspor-halaman.mjs <page.png> <out.png> [--bits 4]
//   node tools/ekspor-halaman.mjs sumber/scene/scene5.png assets/cerita/S-D1-pembuka/05.png
//
// Colour pages are not for this tool: it turns everything grey.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { readPng, writeGreyPng } from "./lib/png.mjs";

const args = process.argv.slice(2);
const bitsAt = args.indexOf("--bits");
const bits = bitsAt >= 0 ? Number(args.splice(bitsAt, 2)[1]) : 4;
const [input, output] = args;
if (!input || !output) {
  console.error("Pemakaian: node tools/ekspor-halaman.mjs <halaman.png> <hasil.png> [--bits 4]");
  process.exit(1);
}
const page = readPng(readFileSync(input));
const grey = (x, y) => {
  const [r, g, b, a] = page.pixel(x, y);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return (lum * a + 255 * (255 - a)) / 255; // on white
};
const png = writeGreyPng(page.width, page.height, grey, bits);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, png);
console.log(`${output}: ${page.width} × ${page.height}, abu-abu ${1 << bits} tingkat, ${Math.ceil(png.length / 1024)} KB`);
