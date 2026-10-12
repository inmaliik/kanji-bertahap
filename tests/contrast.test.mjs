// WCAG contrast of the palette as it is used in css/style.css (D-101).
// Every background the screen styles use is checked against the text colors
// (AA, 4.5:1) and the ink outline (3:1 for non-text UI). Print styles are
// left out: they are black on white and are not part of the palette.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./helpers.mjs";

const css = readFileSync(join(ROOT, "css/style.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** CSS without @media print { … } blocks. */
function withoutPrint(text) {
  let out = "";
  let i = 0;
  for (;;) {
    const at = text.indexOf("@media print", i);
    if (at === -1) return out + text.slice(i);
    out += text.slice(i, at);
    let depth = 0;
    let j = text.indexOf("{", at);
    for (; j < text.length; j++) {
      if (text[j] === "{") depth++;
      else if (text[j] === "}" && --depth === 0) break;
    }
    i = j + 1;
  }
}

const rootBlock = /:root\s*\{([^}]*)\}/.exec(css)[1];
const vars = Object.fromEntries([...rootBlock.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map(([, k, v]) => [k, v.trim()]));
function resolve(value) {
  const m = /^var\(--([\w-]+)\)$/.exec(value.trim());
  return m ? resolve(vars[m[1]]) : value.trim();
}

function luminance(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const isHex = (v) => /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(v);

const screenCss = withoutPrint(css).replace(/:root\s*\{[^}]*\}/, "");
const rules = [...screenCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), body }));
const declared = (body, prop) => {
  const m = new RegExp(`(?:^|;|\\s)${prop}\\s*:\\s*([^;]+);`).exec(body);
  return m ? resolve(m[1]) : null;
};
const backgrounds = new Set([resolve("var(--bg)"), resolve("var(--surface)")]);
for (const { body } of rules) {
  const bg = declared(body, "background") ?? declared(body, "background-color");
  if (bg && isHex(bg)) backgrounds.add(bg.toLowerCase());
}

test("the palette is the team's six macaron colors plus ink", () => {
  assert.deepEqual(
    ["pink", "blue", "yellow", "mint", "peach", "white"].map((c) => vars[`macaron-${c}`]),
    ["#ffb3ba", "#bae1ff", "#ffffba", "#bffcc6", "#ffdfba", "#fdfdff"]
  );
  assert.equal(vars.ink, "#403c3c");
});

test("every text color on every background in use meets WCAG AA (4.5:1)", () => {
  const texts = { ink: resolve("var(--text)"), muted: resolve("var(--muted)") };
  const failures = [];
  const report = [];
  for (const bg of backgrounds) {
    for (const [name, fg] of Object.entries(texts)) {
      const ratio = contrast(fg, bg);
      report.push(`${name} on ${bg}: ${ratio.toFixed(2)}`);
      if (ratio < 4.5) failures.push(`${name} ${fg} on ${bg}: ${ratio.toFixed(2)}`);
    }
  }
  // Rules that set both a text color and a background.
  for (const { selector, body } of rules) {
    const fg = declared(body, "color");
    const bg = declared(body, "background") ?? declared(body, "background-color");
    if (fg && bg && isHex(fg) && isHex(bg) && contrast(fg, bg) < 4.5) failures.push(`${selector}: ${fg} on ${bg}`);
  }
  assert.deepEqual(failures, [], report.join("\n"));
  console.log(`  backgrounds in use: ${[...backgrounds].join(", ")}\n  ${report.join("\n  ")}`);
});

test("the ink outline stands out from every background (3:1, non-text UI)", () => {
  const ink = resolve("var(--border)");
  const weak = [...backgrounds].filter((bg) => contrast(ink, bg) < 3).map((bg) => `${bg}: ${contrast(ink, bg).toFixed(2)}`);
  assert.deepEqual(weak, []);
  // No text or outline may use a pastel: they reach only 1.0–1.7:1 on white.
  const pastels = ["pink", "blue", "yellow", "mint", "peach"].map((c) => vars[`macaron-${c}`]);
  const misused = rules
    .flatMap(({ selector, body }) => ["color", "border-color", "outline-color"].map((p) => [selector, p, declared(body, p)]))
    .filter(([, , v]) => v && pastels.includes(v.toLowerCase()))
    .map(([sel, p, v]) => `${sel} { ${p}: ${v} }`);
  assert.deepEqual(misused, []);
});
