// Asset slots (data/assets.json, D-70). Replacing an asset means overwriting
// the file with the same name: no JSON or code changes. Images are fitted to
// their container, so a slightly wrong size or ratio never breaks the layout.

import { h } from "./dom.js";

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** @returns {Promise<{slots: Map<string, object>, problems: string[]}>} never rejects */
export async function loadAssetManifest(url) {
  try {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) return { slots: new Map(), problems: [`File ${url} tidak bisa diambil (HTTP ${response.status}).`] };
    const data = JSON.parse(await response.text());
    if (!isPlainObject(data) || !Array.isArray(data.slots)) return { slots: new Map(), problems: [`File ${url}: harus berisi { "slots": [...] }.`] };
    return { slots: new Map(data.slots.map((slot) => [slot.id, slot])), problems: [] };
  } catch (err) {
    return { slots: new Map(), problems: [`File ${url} tidak bisa dibaca: ${err.message}`] };
  }
}

/**
 * An asset image in a box with the slot's aspect ratio, fitted with
 * object-fit: contain. If the file is missing, the box names the slot and its
 * path instead of showing a broken image.
 * @param {object} app
 * @param {string} id slot id
 * @param {{alt?: string, className?: string}} [options] alt "" for decorative images
 */
export function assetImage(app, id, { alt = "", className = "" } = {}) {
  const slot = app.assets?.get(id);
  const box = h("span", { class: `asset ${className}`, style: slot ? `aspect-ratio: ${slot.width} / ${slot.height}` : null });
  // Short visible text so it fits a 40px icon; the full text is in the title
  // and on the asset check page.
  const missing = () =>
    box.replaceChildren(
      h("span", { class: "asset__missing", title: `Aset ${id} tidak ditemukan${slot ? ` (${slot.path})` : ""}` }, `✗ ${id} hilang`)
    );
  if (!slot) {
    missing();
    return box;
  }
  const img = h("img", { class: "asset__img", src: slot.path, alt, decoding: "async" });
  img.addEventListener("error", missing, { once: true });
  box.append(img);
  return box;
}

async function sha256Hex(buffer) {
  if (!globalThis.crypto?.subtle) return null; // plain http on a LAN address: skip the placeholder check
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function imageSize(blob) {
  try {
    const bitmap = await createImageBitmap(blob);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close?.();
    return size;
  } catch {
    return null;
  }
}

/** Relative difference between two aspect ratios above which pins on the map drift visibly. */
const RATIO_TOLERANCE = 0.02;

/**
 * Check every slot: missing file, still the placeholder, over the size limit,
 * or a different pixel size or ratio. A pattern slot (one file per
 * conversation, D-94) is checked once per conversation; a missing file there
 * only means the illustration is not drawn yet.
 * @param {Map<string, object>} slots
 * @param {Object<string, string[]>} [ids] values for pattern placeholders, e.g. { conversationId: [...], regionId: [...] }
 * @returns {Promise<Array<{slot: object, path: string, state: string, messages: string[], bytes?: number}>>}
 *   state: "ok" | "placeholder" | "missing" | "problem"
 */
export async function checkAssets(slots, ids = {}) {
  const targets = [...slots.values()].flatMap((slot) => {
    if (!slot.pattern) return [{ slot, path: slot.path, optional: Boolean(slot.optional) }];
    const key = /\{(\w+)\}/.exec(slot.pattern)?.[1];
    return (ids[key] ?? []).map((id) => ({ slot, path: slot.pattern.replace(`{${key}}`, id), optional: true }));
  });
  return Promise.all(
    targets.map(async ({ slot, path, optional }) => {
      let response;
      try {
        response = await fetch(path, { cache: "no-cache" });
      } catch (err) {
        return { slot, path, state: "missing", messages: [`Berkas tidak bisa diambil: ${err.message}`] };
      }
      if (!response.ok) {
        return optional
          ? { slot, path, state: "placeholder", messages: ["Belum digambar: aplikasi menampilkan pengganti sementara."] }
          : { slot, path, state: "missing", messages: [`Berkas tidak ada (HTTP ${response.status}).`] };
      }
      const buffer = await response.arrayBuffer();
      const bytes = buffer.byteLength;
      const messages = [];
      let state = "ok";
      const kb = Math.ceil(bytes / 1024);
      if (kb > slot.maxKB) {
        state = "problem";
        messages.push(`Ukuran ${kb} KB, melebihi batas ${slot.maxKB} KB. Perkecil atau kompres gambarnya.`);
      }
      const size = await imageSize(new Blob([buffer]));
      if (!size) {
        state = "problem";
        messages.push(`Berkas tidak bisa dibaca sebagai gambar ${slot.format}.`);
      } else if (size.width !== slot.width || size.height !== slot.height) {
        const drift = Math.abs(size.width / size.height - slot.width / slot.height) / (slot.width / slot.height);
        if (drift > RATIO_TOLERANCE) {
          state = "problem";
          messages.push(
            `Ukuran ${size.width}×${size.height}, rasionya berbeda dari ${slot.width}×${slot.height}. Tampilan tidak rusak, ` +
              "tetapi gambar akan diberi ruang kosong di tepinya" + (slot.id === "potongan-peta" ? " dan lokasi di peta bisa bergeser." : ".")
          );
        } else {
          messages.push(`Ukuran ${size.width}×${size.height}, bukan ${slot.width}×${slot.height}, tetapi rasionya sama. Boleh dipakai.`);
        }
      }
      const hash = await sha256Hex(buffer);
      if (hash && slot.placeholderSha256 && hash === slot.placeholderSha256) {
        state = state === "ok" ? "placeholder" : state;
        messages.unshift("Masih gambar placeholder.");
      }
      return { slot, path, state, messages, bytes };
    })
  );
}
