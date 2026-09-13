// Tiny DOM builder. Children given as strings become text nodes, so content
// from content.json is never interpreted as HTML.

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "class") el.className = value;
    else if (key.startsWith("on") && typeof value === "function") {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      el.setAttribute(key, value === true ? "" : String(value));
    }
  }
  el.append(...children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false));
  return el;
}

// Element whose text is Japanese. lang="ja" makes phones pick Japanese glyph
// shapes instead of Chinese ones for the same code points.
export function ja(tag, props = {}, ...children) {
  return h(tag, { ...props, lang: "ja" }, ...children);
}
