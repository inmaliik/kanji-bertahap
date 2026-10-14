// Content and asset checks for the content team and the asset makers.
// Reached from Settings, not from the player flow.

import { h } from "../dom.js";
import { checkAssets } from "../assets.js";
import { combinationCount, layerFiles, usesColors } from "../layers.js";
import { catLayerProblems } from "../cats.js";
import { panelPath, sceneLines, voicePath } from "../scenes.js";
import { unknownSpeakers } from "../cast.js";
import { segmentsOf, unlistedSegments } from "../map-layout.js";
import { backLink, issueList } from "./common.js";

const ASSET_STATE = {
  ok: { icon: "✓", text: "Sudah diganti", cls: "success" },
  placeholder: { icon: "⚠", text: "Masih placeholder", cls: "warning" },
  missing: { icon: "✗", text: "Berkas hilang", cls: "error" },
  problem: { icon: "✗", text: "Perlu diperbaiki", cls: "error" },
};

/** Pattern values of the cat layer slots, from the files data/layers.json lists. */
function catLayerIds(layers) {
  const ids = { catBody: [], catPattern: [], catAccessory: [] };
  const prefix = { catBody: "assets/kucing/tubuh/", catPattern: "assets/kucing/corak/", catAccessory: "assets/kucing/aksesori/" };
  const key = { "tubuh (isi)": "catBody", "tubuh (garis)": "catBody", corak: "catPattern", aksesori: "catAccessory" };
  for (const { kind, path } of layerFiles(layers)) {
    const k = key[kind];
    if (path.startsWith(prefix[k]) && path.endsWith(".png")) ids[k].push(path.slice(prefix[k].length, -4));
  }
  return ids;
}

/** The cat layers (D-121): file problems, how many cats they allow, and which drawings exist. */
function catSection(app) {
  const parts = [];
  for (const p of app.layerProblems) parts.push(h("p", { class: "notice notice--error" }, `✗ ${p}`));
  for (const w of app.layerWarnings) parts.push(h("p", { class: "notice notice--warning" }, `⚠ ${w}`));
  if (app.layers && app.model) {
    const missions = [...app.model.quests.values()];
    const withCat = missions.filter((q) => q.cat);
    const files = layerFiles(app.layers);
    const drawn = files.filter((f) => app.layerFiles.has(f.path)).length;
    parts.push(
      h(
        "p",
        {},
        `${combinationCount(app.layers)} kombinasi kucing tersedia (${usesColors(app.layers) ? "warna bulu dari data" : "warna digambar di tubuh"}); ` +
          `${withCat.length} dari ${missions.length} misi sudah punya kucing.`
      ),
      h("p", {}, `${drawn} dari ${files.length} berkas lapisan sudah ada; sisanya tampil dengan gambar pengganti buatan kode.`)
    );
    const unknown = catLayerProblems(app.content, app.layers);
    parts.push(
      unknown.length
        ? unknown.map((u) => h("p", { class: "notice notice--error" }, `✗ ${u.message}`))
        : h("p", {}, "✓ Semua lapisan yang disebut misi ada di data/layers.json.")
    );
  }
  return h("section", { class: "card", "aria-labelledby": "cats-title" }, h("h2", { id: "cats-title" }, "Lapisan kucing (data/layers.json)"), parts);
}

/** Limits for one story scene (ASSETS.md): voice files and the whole scene. */
const VOICE_MAX_KB = 64;
const SCENE_MAX_KB = 2560;

/** The story scenes (D-124): lines, panels and voice files delivered so far, and their sizes. */
function sceneSection(app) {
  const scenes = app.content?.scenes ?? [];
  const list = h("ul", { class: "asset-checks", "aria-live": "polite" });
  const summary = h("p", {}, scenes.length ? "Memeriksa berkas adegan…" : "Materi belum punya adegan cerita (tab cerita dan naskah).");
  if (scenes.length) {
    const size = async (path) => {
      try {
        const r = await fetch(path, { method: "HEAD", cache: "no-cache" });
        return r.ok ? Number(r.headers.get("content-length") ?? 0) : null;
      } catch {
        return null;
      }
    };
    Promise.all(
      scenes.map(async (scene) => {
        const lines = sceneLines(scene);
        const voices = [...new Set(lines.map(({ line }) => voicePath(scene, line, app.characters?.players?.[0]?.id)).filter(Boolean))];
        const panels = scene.panels.map((p) => panelPath(scene, p));
        const [panelSizes, voiceSizes] = await Promise.all([Promise.all(panels.map(size)), Promise.all(voices.map(size))]);
        const kb = (n) => Math.ceil(n / 1024);
        const total = [...panelSizes, ...voiceSizes].reduce((n, b) => n + (b ?? 0), 0);
        const heavy = voices.filter((_, i) => voiceSizes[i] !== null && kb(voiceSizes[i]) > VOICE_MAX_KB);
        return h(
          "li",
          {},
          h("strong", {}, scene.id),
          ` · ${lines.length} baris di ${scene.panels.length} panel · gambar panel ${panelSizes.filter((b) => b !== null).length} dari ${panels.length} ada · ` +
            `suara ${voiceSizes.filter((b) => b !== null).length} dari ${voices.length} ada · total ${kb(total)} KB dari batas ${SCENE_MAX_KB} KB`,
          heavy.length ? h("p", { class: "notice notice--warning" }, `⚠ Melebihi ${VOICE_MAX_KB} KB: ${heavy.join(", ")}`) : null,
          kb(total) > SCENE_MAX_KB ? h("p", { class: "notice notice--warning" }, `⚠ Adegan ini melebihi ${SCENE_MAX_KB} KB; ponsel kelas bawah di jaringan pameran akan lambat.`) : null
        );
      })
    ).then((items) => {
      summary.textContent = `${scenes.length} adegan. Berkas yang belum ada tampil sebagai kotak keterangan (gambar) atau tanpa suara (subtitle saja).`;
      list.replaceChildren(...items);
    });
  }
  return h("section", { class: "card", "aria-labelledby": "scenes-title" }, h("h2", { id: "scenes-title" }, "Adegan cerita"), summary, list);
}

function assetSection(app) {
  const list = h("ul", { class: "asset-checks", "aria-live": "polite" }, h("li", { class: "muted" }, "Memeriksa aset…"));
  const summary = h("p", {});
  if (app.assets.size) {
    const ids = {
      segment: app.mapLayout.worlds.flatMap((w) => w.segments),
      ...(app.model ? { conversationId: [...app.model.conversations.keys()], regionId: app.model.regions.map((r) => r.id) } : {}),
      ...(app.layers ? catLayerIds(app.layers) : {}),
      scenePanel: (app.content?.scenes ?? []).flatMap((scene) => scene.panels.map((panel) => `${scene.id}/${panel.image}`)),
    };
    checkAssets(app.assets, ids).then((results) => {
      const count = (state) => results.filter((r) => r.state === state).length;
      summary.textContent =
        `${results.length} berkas: ${count("ok")} sudah diganti, ${count("placeholder")} masih placeholder, ` +
        `${count("missing") + count("problem")} perlu diperbaiki.`;
      list.replaceChildren(
        ...results.map(({ slot, path, state, messages, bytes }) => {
          const s = ASSET_STATE[state];
          return h(
            "li",
            { class: `asset-check asset-check--${s.cls}` },
            h("p", { class: "asset-check__head" }, h("span", { "aria-hidden": "true" }, `${s.icon} `), `${s.text} · `, h("code", {}, path)),
            h(
              "p",
              { class: "asset-check__spec muted" },
              `${slot.width}×${slot.height} ${slot.format}${slot.transparent ? " transparan" : ""}, maks ${slot.maxKB} KB` +
                (bytes !== undefined ? ` · sekarang ${Math.ceil(bytes / 1024)} KB` : "") +
                ` · ${slot.screen}`
            ),
            messages.map((m) => h("p", { class: "asset-check__message" }, m))
          );
        })
      );
    });
  } else {
    list.replaceChildren(h("li", { class: "notice notice--error" }, "✗ Daftar aset (data/assets.json) tidak bisa dimuat."));
  }
  return h(
    "section",
    { class: "card", "aria-labelledby": "assets-title" },
    h("h2", { id: "assets-title" }, "Aset gambar"),
    h("p", { class: "muted" }, "Spesifikasi setiap slot ada di ASSETS.md. Mengganti aset cukup dengan menimpa berkas bernama sama."),
    app.assetProblems.map((p) => h("p", { class: "notice notice--error" }, `✗ ${p}`)),
    summary,
    list
  );
}

function charactersSection(app) {
  const unknown = app.model && app.characters ? unknownSpeakers(app.model, app.characters) : [];
  const problems = [
    ...app.characterProblems,
    ...unknown.map((id) => `Pembicara "${id}" dipakai di percakapan, tetapi belum terdaftar di bagian "others".`),
  ];
  return h(
    "section",
    { class: "card", "aria-labelledby": "characters-title" },
    h("h2", { id: "characters-title" }, "Karakter (data/characters.json)"),
    problems.length ? problems.map((p) => h("p", { class: "notice notice--warning" }, `⚠ ${p}`)) : h("p", {}, "✓ Semua karakter lengkap.")
  );
}

function mapSection(app) {
  const unlisted = app.model ? unlistedSegments(app.model.regions, app.mapLayout) : [];
  const worlds = app.model?.worlds ?? [];
  const problems = [
    ...app.mapProblems,
    ...worlds
      .filter((w) => !segmentsOf(app.mapLayout, w.number).length)
      .map((w) => `Dunia ${w.number} sudah punya materi, tetapi potongan petanya belum didaftar di data/map.json.`),
    ...unlisted
      .filter(({ listed }) => listed)
      .map(({ region, segment, listed }) => `${region.id} memakai potongan ${segment}, tetapi data/map.json hanya mendaftar ${listed} potongan untuk Dunia ${region.world}.`),
  ];
  const total = app.mapLayout.worlds.reduce((n, w) => n + w.segments.length, 0);
  return h(
    "section",
    { class: "card", "aria-labelledby": "map-title" },
    h("h2", { id: "map-title" }, "Potongan peta (data/map.json)"),
    problems.length
      ? problems.map((p) => h("p", { class: "notice notice--warning" }, `⚠ ${p}`))
      : h("p", {}, `✓ ${total} potongan terdaftar, semua lokasi ada di potongan yang terdaftar.`)
  );
}

export function contentCheckScreen(app) {
  return h(
    "div",
    { class: "screen" },
    backLink("#/", "Peta"),
    h("h1", { tabindex: "-1" }, "Pemeriksaan konten"),
    h(
      "p",
      { class: "notice notice--warning", role: "note" },
      "⚠ Untuk tim pengembang. Halaman ini memuat isi materi, jadi jangan dibuka di depan peserta."
    ),
    h(
      "p",
      {},
      h("a", { href: "#/preview/all" }, "Pratinjau dan cetak seluruh materi"),
      " (untuk validator; satu bab: ",
      h("code", {}, "#/preview/B06"),
      ")"
    ),
    app.warnings.length
      ? [
          h("p", {}, `Materi bisa dimuat, tetapi ada ${app.warnings.length} peringatan yang sebaiknya diperiksa tim konten.`),
          issueList(app.warnings),
        ]
      : h("p", {}, "✓ Tidak ada error dan tidak ada peringatan."),
    app.notes.length
      ? [h("h2", {}, "Catatan"), h("p", { class: "muted" }, "Informasi saja; tidak perlu diperbaiki."), issueList(app.notes)]
      : null,
    h(
      "section",
      { class: "card", "aria-labelledby": "ui-title" },
      h("h2", { id: "ui-title" }, "Label antarmuka (data/ui.json)"),
      app.uiProblems.length
        ? app.uiProblems.map((p) => h("p", { class: "notice notice--warning" }, `⚠ ${p}`))
        : h("p", {}, "✓ Semua label lengkap dan berfurigana.")
    ),
    charactersSection(app),
    catSection(app),
    sceneSection(app),
    mapSection(app),
    assetSection(app)
  );
}
