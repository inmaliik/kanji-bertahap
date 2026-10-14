// Every screen in a real browser, in empty and filled states (T-20). Fails when
// the text a player can see (or a screen reader reads) holds "null",
// "undefined", "NaN" or "[object": the sign of an empty value or a list of
// elements turned into text by the DOM (T-06, T-14, and the cat layers of
// stage 3). Each screen used to be checked by hand; this closes the kind.
//
// Needs Google Chrome or Chromium (CHROME_PATH to point at another binary).
// Without one the test is skipped, with a message, not passed.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, normalize } from "node:path";
import { ROOT, clone, jsModule, loadSampleContent } from "./helpers.mjs";

const CHROME = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].find((p) => p && existsSync(p));

/** What a screen may never show. */
const LEAK = /\bnull\b|\bundefined\b|\bNaN\b|\[object/;

const { buildModel, buildQuestItems } = await import(jsModule("model.js"));
const S = await import(jsModule("state.js"));
const { validateContent } = await import(jsModule("validate.js"));

/**
 * The sample content with the empty cases: a cat without pattern or accessory
 * (Q-tabemasu) and a mission without test conversations (Q-nomimasu). World 2
 * has no material.
 */
function fixture() {
  const content = clone(loadSampleContent());
  const [tabemasu, nomimasu] = content.regions[0].quests;
  Object.assign(tabemasu.cat, { pattern: "polos", accessory: "tanpa" });
  nomimasu.tests = [];
  // One reward the material can reach (B06) and one it cannot yet (world 1, D-123).
  content.rewards = [
    { id: "H-B06", title: "Diskon contoh", text: "Potongan harga kartu contoh", requires: { regions: ["B06"], world: null } },
    { id: "H-D1", title: "Hadiah dunia contoh", text: "Hadiah contoh", requires: { regions: [], world: 1 } },
  ];
  return content;
}

const now = new Date().toISOString();
const passedEntry = { status: "passed", attempts: 1, introDone: true, learningDone: true, productionSubmitted: true, reviewItemIds: null, streaks: null, startedAt: now, passedAt: now };

/** Progress states, built with the app's own modules. */
function progressStates(content) {
  const model = buildModel(content);
  // The opening scene of world 1 is seen, so the map shows (D-124); the new player sees it first.
  const base = () =>
    Object.assign(S.createProgress(), { welcomeSeen: true, character: "hana", consent: { choice: "declined", version: "placeholder-0", at: now }, scenesSeen: { "S-D1-pembuka": now } });
  const pass = (progress, questId) => {
    for (const item of buildQuestItems(model, model.quests.get(questId))) progress.items[item.id] = 2;
    progress.quests[questId] = { ...passedEntry };
  };
  const playing = base();
  pass(playing, "Q-tabemasu"); // its rescue moment not shown yet
  const done = base();
  pass(done, "Q-tabemasu");
  pass(done, "Q-nomimasu");
  done.quests["REV-B06"] = { ...passedEntry, reviewItemIds: [], streaks: {} };
  done.rescuesShown = ["Q-tabemasu", "Q-nomimasu"];
  const redeemed = clone(done);
  redeemed.rewards = { "H-B06": { title: "Diskon contoh", text: "Potongan harga kartu contoh", achievedAt: now, redeemedAt: now } };
  const researchNoCode = Object.assign(base(), { sessionMode: "research", consent: { choice: "agreed", version: "placeholder-0", at: now } });
  const research = Object.assign(clone(researchNoCode), { participantCode: "K4-01" });
  return { playing, done, redeemed, researchNoCode, research };
}

const ALL_ROUTES = [
  "#/", "#/region/B06", "#/kucing", "#/quest/B06/1", "#/quest/B06/2", "#/review/B06", "#/index", "#/index/kanji/食",
  "#/index/kanji/食/detail", "#/index/kotoba/0", "#/kana", "#/settings", "#/about", "#/consent", "#/peringkat",
  "#/dunia/1", "#/dunia/2", "#/content-check", "#/preview/all", "#/preview/B06", "#/tidak-ada", "#/hadiah",
  "#/cerita", "#/cerita/S-D1-pembuka", "#/cerita/S-D1-penutup",
];

/** What research mode may never show: rewards are not shown, not mentioned, not earned (D-123). */
const REWARD_WORDS = /hadiah|🎁/i;

function serve(content) {
  const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" };
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
    if (path === "/data/content.json") {
      res.writeHead(200, { "content-type": types[".json"] });
      res.end(JSON.stringify(content));
      return;
    }
    try {
      const body = readFileSync(join(ROOT, path === "/" ? "index.html" : path));
      res.writeHead(200, { "content-type": types[extname(path)] ?? "application/octet-stream" });
      res.end(req.method === "HEAD" ? undefined : body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

async function openChrome() {
  const profile = mkdtempSync(join(tmpdir(), "kanji-layar-"));
  const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let port;
  for (let i = 0; i < 100 && !port; i++) {
    try {
      port = readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0];
    } catch {
      await sleep(100);
    }
  }
  const page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.addEventListener("message", (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
    if (msg.method === "Runtime.exceptionThrown") errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expression) => {
    const res = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (res.result?.exceptionDetails) throw new Error(res.result.exceptionDetails.exception?.description ?? res.result.exceptionDetails.text);
    return res.result?.result?.value;
  };
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 375, height: 760, deviceScaleFactor: 1, mobile: true });
  const close = () => {
    ws.close();
    chrome.kill();
    setTimeout(() => rmSync(profile, { recursive: true, force: true }), 500);
  };
  return { send, evaluate, errors, sleep, close };
}

test("every screen, empty and filled, shows no null, undefined, NaN or [object (T-20)", { skip: CHROME ? false : "Chrome/Chromium tidak ditemukan; set CHROME_PATH untuk menjalankan uji semua layar", timeout: 240_000 }, async () => {
  const content = fixture();
  assert.deepEqual(validateContent(content).errors, [], "the fixture loads in the app");
  const states = progressStates(content);
  const server = await serve(content);
  const base = `http://127.0.0.1:${server.address().port}/index.html`;
  const browser = await openChrome();
  const { send, evaluate, sleep, errors } = browser;
  const leaks = [];
  const visited = [];
  const rewardShown = [];
  const sceneFlow = [];
  const rewardHidden = [];
  const labelProblems = [];
  const labelsSeen = new Set();

  const waitForScreen = async () => {
    for (let i = 0; i < 80; i++) {
      if (await evaluate(`Boolean(window.__kanjiAppBooted && document.querySelector("#app h1, #app h2"))`)) return;
      await sleep(50);
    }
  };
  // Visible text plus the texts a screen reader reads.
  const researchLeaks = [];
  const check = async (label) => {
    const text = await evaluate(`(() => {
      const parts = [document.body.innerText];
      for (const el of document.querySelectorAll("[aria-label], [title], img[alt]")) {
        for (const a of ["aria-label", "title", "alt"]) if (el.hasAttribute(a)) parts.push(el.getAttribute(a));
      }
      return parts.join("\\n");
    })()`);
    visited.push(label);
    const line = text.split("\n").find((l) => LEAK.test(l));
    if (line) leaks.push(`${label}: "${line.trim().slice(0, 140)}"`);
    // Menu labels are whole: no soft hyphen or CSS hyphenation, no word split over two lines, nothing cut off.
    const labels = await evaluate(`(() => [...document.querySelectorAll(".menu__label")].map((el) => {
      const node = el.firstChild;
      const text = el.textContent;
      const split = [...text.matchAll(/\\S+/g)].filter((m) => {
        const range = document.createRange();
        range.setStart(node, m.index);
        range.setEnd(node, m.index + m[0].length);
        return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size > 1;
      }).map((m) => m[0]);
      const box = el.getBoundingClientRect();
      const door = el.closest("a, button")?.getBoundingClientRect() ?? box;
      return {
        text,
        soft: text.includes("\\u00AD"),
        hyphens: getComputedStyle(el).hyphens === "auto",
        split,
        overflow: el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1,
        outside: box.left < door.left - 1 || box.right > door.right + 1,
      };
    }))()`);
    for (const l of labels) {
      labelsSeen.add(l.text);
      const wrong = [l.soft && "tanda pemenggalan", l.hyphens && "hyphens:auto", l.split.length && `kata terbelah: ${l.split.join(", ")}`, l.overflow && "terpotong", l.outside && "keluar dari pintunya"].filter(Boolean);
      if (wrong.length) labelProblems.push(`${label} "${l.text}": ${wrong.join("; ")}`);
    }
    const reward = text.split("\n").find((l) => REWARD_WORDS.test(l));
    if (label.startsWith("penelitian") && reward) researchLeaks.push(`${label}: "${reward.trim().slice(0, 140)}"`);
    return text;
  };
  const start = async (state, device = null) => {
    await send("Page.navigate", { url: base });
    await waitForScreen();
    await evaluate(`localStorage.clear()`);
    if (state) await evaluate(`localStorage.setItem("kanjiGame.progress.v2", ${JSON.stringify(JSON.stringify(state))})`);
    if (device) await evaluate(`localStorage.setItem("kanjiGame.device.v1", ${JSON.stringify(JSON.stringify(device))})`);
    await send("Page.reload");
    await waitForScreen();
  };
  const visit = async (state, routes) => {
    for (const route of routes) {
      await evaluate(`location.hash = ${JSON.stringify(route)}`);
      await sleep(150);
      await waitForScreen();
      await check(`${state} ${route}`);
    }
  };
  const click = (text) => evaluate(`(() => { const b = [...document.querySelectorAll("button, a")].find((x) => x.textContent.trim().startsWith(${JSON.stringify(text)})); if (b) b.click(); return Boolean(b); })()`);

  try {
    // A new player: welcome, character, then every screen with nothing played (empty collection, empty index).
    await start(null);
    await check("baru #/ (sambutan)");
    await click("Mulai");
    await sleep(150);
    await check("baru pemilihan karakter");
    await evaluate(`document.querySelector(".character-card")?.click()`);
    await click("Mulai");
    await sleep(150);
    // The opening scene of world 1 plays before the first map (D-124): start card, every line, then the map.
    sceneFlow.push(await evaluate(`Boolean(document.querySelector(".scene__start"))`));
    await check("baru adegan pembuka (kartu mulai)");
    await click("▶ Mulai");
    for (let i = 0; i < 20 && (await evaluate(`Boolean(document.querySelector(".scene__next"))`)); i++) {
      await sleep(80);
      await check(`baru adegan pembuka baris ${i + 1}`);
      if (i === 1) {
        await click("🔊 Suara nyala");
        await check("baru adegan pembuka suara mati");
      }
      await evaluate(`document.querySelector(".scene__next").click()`);
    }
    await sleep(150);
    sceneFlow.push(await evaluate(`Boolean(document.querySelector(".map-screen"))`));
    await visit("baru", ALL_ROUTES);

    // Playing: a free cat without pattern or accessory (its rescue moment), a mission without test conversations.
    await start(states.playing);
    await visit("bermain", ALL_ROUTES);
    await evaluate(`location.hash = "#/quest/B06/1"`);
    await sleep(200);
    await check("bermain momen penyelamatan");
    await evaluate(`location.hash = "#/quest/B06/2"`);
    await sleep(200);
    for (let i = 0; i < 8 && !(await evaluate(`Boolean(document.querySelector(".choice, .choices, [role=radiogroup], .option"))`)); i++) {
      if (!(await click("Lanjut")) && !(await click("Mulai latihan"))) break;
      await sleep(150);
      await check(`bermain #/quest/B06/2 langkah ${i + 1}`);
    }

    // Everything done: region and world states, the review's result, a reward ready to redeem.
    await start(states.done);
    await visit("tuntas", ["#/", "#/region/B06", "#/kucing", "#/review/B06", "#/quest/B06/2", "#/index", "#/settings", "#/hadiah"]);
    await evaluate(`location.hash = "#/"`);
    await sleep(150);
    rewardShown.push((await check("tuntas kartu hadiah")).includes("Hadiah siap ditukar"));
    await evaluate(`location.hash = "#/hadiah"`);
    await sleep(150);
    await click("Sudah ditukar");
    await sleep(100);
    await check("tuntas konfirmasi penukaran");
    await start(states.redeemed);
    await visit("ditukar", ["#/", "#/hadiah", "#/settings"]);

    // Research mode, before and after the participant code; the research link over an existing player.
    await start(states.researchNoCode);
    await visit("penelitian-tanpa-kode", ["#/", "#/settings", "#/quest/B06/1"]);
    // A research participant who finished B06: the reward's milestone is met, and still nothing shows.
    await start({ ...states.done, sessionMode: "research", participantCode: "K4-01", consent: { choice: "agreed", version: "placeholder-0", at: now } });
    await visit("penelitian", ["#/", "#/region/B06", "#/settings", "#/kucing", "#/peringkat", "#/consent", "#/about", "#/index"]);
    await evaluate(`location.hash = "#/hadiah"`);
    await sleep(150);
    rewardHidden.push(await evaluate(`document.querySelector("#app h1")?.innerText`));
    await start(states.playing);
    await visit("tautan-penelitian", ["#/penelitian"]);

    // Exhibition mode: no consent screen, the leaderboard.
    await start(states.playing, { exhibitionMode: true });
    await visit("pameran", ["#/", "#/peringkat", "#/settings", "#/consent", "#/quest/B06/2"]);

    // The narrowest phone still in use: the five menu doors at 320 px.
    await send("Emulation.setDeviceMetricsOverride", { width: 320, height: 640, deviceScaleFactor: 1, mobile: true });
    await start(states.playing);
    await visit("320px", ["#/", "#/kucing", "#/cerita", "#/settings"]);
  } finally {
    browser.close();
    server.close();
  }

  assert.ok(visited.length > 60, `${visited.length} screens visited`);
  assert.deepEqual(errors, [], "no uncaught errors in the browser");
  assert.deepEqual(leaks, [], "screens showing an empty value as text");
  assert.deepEqual([...labelsSeen].sort(), ["Cerita", "Index", "Kucing", "Panduan kana", "Setelan"], "the five doors were checked");
  assert.deepEqual(labelProblems, [], "menu labels are whole: not hyphenated, not split, not cut off");
  assert.deepEqual(rewardShown, [true], "outside research mode the earned reward is on the map");
  assert.deepEqual(sceneFlow, [true, true], "the opening scene plays after character selection, then the map shows");
  assert.deepEqual(researchLeaks, [], "research mode never mentions rewards");
  assert.deepEqual(rewardHidden, ["Halaman tidak ditemukan"], "in research mode #/hadiah answers like an unknown page");
});
