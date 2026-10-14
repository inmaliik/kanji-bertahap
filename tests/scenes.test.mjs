// Story scenes (D-124): when they play, which voice files they use, what the
// validator checks in the script, and how a playing is logged in each session
// mode (D-112): nothing in exhibition mode; sessionMode and buildId in research.

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, clone, jsModule, loadSampleContent, MemoryStorage } from "./helpers.mjs";

const { setStorageBackend } = await import(jsModule("storage.js"));
setStorageBackend(new MemoryStorage());

const SC = await import(jsModule("scenes.js"));
const S = await import(jsModule("state.js"));
const L = await import(jsModule("leaderboard.js"));
const logger = await import(jsModule("logger.js"));
const { recordEvent } = await import(jsModule("event-log.js"));
const { buildModel } = await import(jsModule("model.js"));
const { validateContent } = await import(jsModule("validate.js"));
const { convertCsvFilesToContent } = await import(jsModule("csv-content.js"));

const codes = (issues) => issues.map((i) => i.code);
const sample = () => clone(loadSampleContent());
const opening = () => sample().scenes.find((s) => s.trigger === "world-opening");
const closing = () => sample().scenes.find((s) => s.trigger === "world-closing");

beforeEach(() => {
  logger.clearLog();
  L.saveDevice({ exhibitionMode: false });
});

test("the opening scene plays once, before the first map; the closing one only when the world is complete", () => {
  const content = sample();
  const model = buildModel(content);
  const [world] = model.worlds;
  const progress = S.createProgress();
  assert.equal(SC.dueScene(model, content.scenes, progress, world)?.id, "S-D1-pembuka");
  SC.markSceneSeen(progress, opening(), new Date("2026-10-14T08:00:00Z"));
  SC.markSceneSeen(progress, opening(), new Date("2026-10-15T08:00:00Z"));
  assert.equal(progress.scenesSeen["S-D1-pembuka"], "2026-10-14T08:00:00.000Z", "the first time is kept");
  assert.equal(SC.dueScene(model, content.scenes, progress, world), null, "world 1 has 1 of 25 chapters: the closing scene waits (D-116)");
  assert.deepEqual(
    SC.sceneMenu(model, content.scenes, progress).map((m) => [m.scene.id, m.seen]),
    [["S-D1-pembuka", true], ["S-D1-penutup", false]]
  );
  assert.equal(SC.dueScene(model, undefined, S.createProgress(), world), null, "material without scenes plays none");
});

test("voice files: the player's lines have none, unless the name holds {karakter}", () => {
  const scene = opening();
  const narrator = SC.sceneLines(scene)[0].line;
  const player = SC.sceneLines(closing()).find(({ line }) => line.speaker === "player").line;
  assert.equal(SC.voicePath(scene, narrator, "hana"), "assets/suara/S-D1-pembuka/01-1.mp3");
  assert.equal(SC.voicePath(scene, { ...player, audio: "02-2" }, "hana"), null, "a single recording cannot fit every player character");
  assert.equal(SC.voicePath(scene, { ...player, audio: "02-2-{karakter}" }, "kazu"), "assets/suara/S-D1-pembuka/02-2-kazu.mp3");
  assert.equal(SC.voicePath(scene, { ...narrator, audio: null }, "hana"), null);
  assert.equal(SC.panelPath(scene, scene.panels[1]), "assets/cerita/S-D1-pembuka/02.png");
});

/** An app context for recordEvent: a player in `mode` with consent and, for research, a participant code. */
function app({ mode, consent = "agreed", code = null }) {
  L.saveDevice({ exhibitionMode: mode === "exhibition" });
  const progress = S.createProgress();
  if (consent) S.setConsent(progress, consent, "v1");
  if (mode === "research") progress.sessionMode = "research";
  progress.participantCode = code;
  return { progress, consentText: { version: "v1" }, content: { contentRevision: "draft-0" } };
}
const col = (row, name) => row[logger.LOG_COLUMNS.indexOf(name)];
const play = (ctx, finished = true) => recordEvent(ctx, SC.sceneEvent(opening(), { finished, linesShown: finished ? 5 : 2, replay: false, ms: 4200 }));

test("a scene playing is one event row that follows the session mode (D-112)", () => {
  play(app({ mode: "exhibition" }));
  assert.equal(logger.getLogStatus().totalRows, 0, "exhibition mode records nothing, even with consent");
  play(app({ mode: "general", consent: "declined" }));
  play(app({ mode: "research", code: null }));
  assert.equal(logger.getLogStatus().totalRows, 0, "no consent, or research without a participant code: nothing");

  play(app({ mode: "research", code: "K4-01" }), false);
  play(app({ mode: "general" }));
  const [research, general] = logger.getLogRows();
  assert.equal(col(research, "sessionMode"), "research");
  assert.equal(col(research, "participantCode"), "K4-01");
  assert.equal(col(research, "buildId"), "dev", "the build id is in every row (D-115)");
  assert.equal(col(research, "phase"), "event");
  assert.equal(col(research, "questStep"), "scene");
  assert.equal(col(research, "itemId"), "S:S-D1-pembuka");
  assert.equal(col(research, "answer"), "dilewati");
  assert.equal(col(research, "blankLine"), 2, "lines shown before skipping");
  assert.equal(col(research, "responseMs"), 4200);
  assert.equal(col(general, "sessionMode"), "general");
  assert.equal(col(general, "answer"), "selesai");
});

test("the validator: D-79 by the moment a scene plays, Japanese above the player's chapter, voiced player lines", () => {
  const ok = validateContent(sample());
  assert.deepEqual(ok.errors, []);

  const leak = sample();
  leak.scenes[0].panels[0].lines[0].text = "Ayo kita 食べます!";
  const leakIssue = validateContent(leak).errors.find((e) => e.code === "SCENE_LEAKS_KOTOBA");
  assert.ok(leakIssue, "the opening plays before any mission");
  assert.equal(leakIssue.path, "scenes[0].panels[0].lines[0].text");

  const reading = sample();
  reading.scenes[0].panels[0].lines[0].ja = "[毎晩|まいばん]のみます";
  reading.scenes[0].sentenceChapter = 1;
  assert.ok(codes(validateContent(reading).errors).includes("SCENE_LEAKS_KOTOBA"), "the reading のみます counts too");

  const closing = sample();
  closing.scenes[1].panels[0].lines[0].text = "Sekarang kamu bisa 食べます.";
  assert.ok(!codes(validateContent(closing).errors).includes("SCENE_LEAKS_KOTOBA"), "the closing plays after every mission of its world");

  const ja = sample();
  ja.scenes[0].panels[0].lines[0].ja = "こんにちは";
  assert.ok(codes(validateContent(ja).warnings).includes("SENTENCE_CHAPTER_UNKNOWN"), "a Japanese line needs its chapter");
  ja.scenes[0].sentenceChapter = 2;
  assert.ok(codes(validateContent(ja).warnings).includes("SCENE_JA_ABOVE_LEVEL"), "the opening plays before chapter 1");

  const voiced = sample();
  voiced.scenes[1].panels[0].lines[1].audio = "02-2";
  assert.ok(codes(validateContent(voiced).warnings).includes("PLAYER_LINE_VOICED"));
  voiced.scenes[1].panels[0].lines[1].audio = "02-2-{karakter}";
  assert.ok(!codes(validateContent(voiced).warnings).includes("PLAYER_LINE_VOICED"));

  const long = sample();
  long.scenes[0].panels[0].lines[0].text = "a".repeat(121);
  long.scenes[0].panels[1].lines[0].ja = "あ".repeat(41);
  long.scenes[0].sentenceChapter = 1;
  assert.equal(codes(validateContent(long).warnings).filter((c) => c === "SCENE_LINE_TOO_LONG").length, 2, "120 characters of subtitle, 40 of Japanese");

  const twice = sample();
  twice.scenes[1].trigger = "world-opening";
  assert.ok(codes(validateContent(twice).errors).includes("DUPLICATE_SCENE_TRIGGER"));
  const bad = sample();
  bad.scenes[0].trigger = "region-opening";
  assert.ok(codes(validateContent(bad).errors).includes("INVALID_SCENE_TRIGGER"), "only the triggers the code knows");
  const figure = sample();
  figure.scenes[1].panels[0].figures[0].at = "atas";
  assert.ok(codes(validateContent(figure).errors).includes("INVALID_SCENE_FIGURE"));
});

test("the cerita and naskah tabs: optional together, lines grouped by panel and ordered by number", () => {
  const read = (name) => ({ name, text: readFileSync(join(ROOT, "tools/templates", name), "utf8") });
  const base = ["wilayah.csv", "kanji.csv", "kotoba.csv", "quest.csv", "percakapan.csv"].map(read);
  const none = convertCsvFilesToContent(base, "draft-0");
  assert.equal(none.fatal, null);
  assert.equal("scenes" in none.content, false, "no tabs, no scenes");

  const half = convertCsvFilesToContent([...base, read("cerita.csv")], "draft-0");
  assert.ok(half.problems.some((p) => p.message.includes("naskah")), "one tab without the other is a problem");

  const naskah = read("naskah.csv");
  const lines = naskah.text.trim().split("\n");
  const shuffled = { ...naskah, text: `${[lines[0], ...lines.slice(1).reverse()].join("\n")}\n` };
  const both = convertCsvFilesToContent([...base, read("cerita.csv"), shuffled], "draft-0");
  assert.equal(both.problems.length, 0);
  const [scene, end] = both.content.scenes;
  assert.deepEqual(scene.panels.map((p) => p.image), ["01", "02", "03", "04", "05", "05", "05", "05", "06", "07", "08", "09"], "panels by panel_no, whatever the row order");
  assert.equal(scene.panels[0].lines[0].speaker, "narrator");
  assert.deepEqual(end.panels[0].figures, [{ who: "player", at: "kiri" }, { who: "lawan-bicara", at: "kanan" }]);
  assert.deepEqual(end.panels[0].lines.map((l) => l.speaker), ["lawan-bicara", "player"]);

  const orphan = { ...naskah, text: `${naskah.text}S-tidak-ada,1,1,01,,,narator,teks,,\n` };
  assert.ok(convertCsvFilesToContent([...base, read("cerita.csv"), orphan], "draft-0").problems.some((p) => p.message.includes("S-tidak-ada")));
});

test("pages with several panels (D-125): the box, a panel without lines, one tap per step", () => {
  const scene = opening();
  const page = scene.panels.filter((p) => p.image === "05");
  assert.deepEqual(page.map((p) => p.box ?? null), [null, { x: 69, y: 25, w: 26.5, h: 49.5 }, { x: 23, y: 25, w: 47, h: 49.5 }, { x: 3.5, y: 25, w: 38, h: 49.5 }], "whole page, then right to left as the data says");
  assert.deepEqual(page[0].lines, [], "the whole page has no line");
  const steps = SC.sceneSteps(scene);
  assert.equal(steps.length, SC.sceneLines(scene).length + 1, "a panel without lines is one step");
  assert.equal(steps[4].line, null);
  assert.equal(steps[4].panel.image, "05");
  assert.deepEqual(SC.panelBox(page[0]), SC.WHOLE_PAGE);

  // The whole 4:3 page in a 300 × 400 frame: frame-wide, centred top to bottom.
  const whole = SC.fitBox({ frameWidth: 300, frameHeight: 400, ratio: 4 / 3 });
  assert.equal(whole.scale, 1);
  assert.equal(whole.x, 0);
  assert.equal(whole.y, (400 - 225) / 2);
  // A box fills the frame on one side and is centred on the other.
  const box = { x: 70, y: 25, w: 25, h: 50 };
  const fit = SC.fitBox({ frameWidth: 300, frameHeight: 400, ratio: 4 / 3, box });
  const left = fit.x + fit.scale * 300 * 0.7;
  const top = fit.y + fit.scale * 225 * 0.25;
  const width = fit.scale * 300 * 0.25;
  const height = fit.scale * 225 * 0.5;
  assert.ok(Math.abs(width - 300) < 1e-9 || Math.abs(height - 400) < 1e-9, "one side fills the frame");
  assert.ok(width <= 300 + 1e-9 && height <= 400 + 1e-9, "the box stays whole");
  assert.ok(Math.abs(left + width / 2 - 150) < 1e-9 && Math.abs(top + height / 2 - 200) < 1e-9, "centred");
});

test("drawn text (D-125): the transcript is checked like the script, and the subtitles carry it", () => {
  const ok = validateContent(sample());
  assert.deepEqual(ok.errors, []);
  assert.ok(codes(ok.warnings).includes("SCENE_DRAWN_TEXT_MISSING"), "the closing panel has no transcript yet");

  const leak = sample();
  leak.scenes[0].panels[1].drawnText = "食べます!";
  assert.ok(validateContent(leak).errors.some((e) => e.code === "SCENE_LEAKS_KOTOBA" && e.path === "scenes[0].panels[1].drawnText"), "kotoba drawn in the picture is a leak too (D-79)");

  const subtitled = sample();
  subtitled.scenes[0].panels[1].drawnText = "Imutnya… / meow~";
  subtitled.scenes[0].panels[1].lines[0].text = "Imutnya…";
  const missing = validateContent(subtitled).warnings.filter((w) => w.code === "SCENE_DRAWN_TEXT_NOT_SUBTITLED");
  assert.equal(missing.length, 1);
  assert.match(missing[0].message, /"meow~"/);
  subtitled.scenes[0].panels[1].lines[0].text = "Imutnya… (meow~)";
  assert.ok(!codes(validateContent(subtitled).warnings).includes("SCENE_DRAWN_TEXT_NOT_SUBTITLED"));
  subtitled.scenes[0].panels[1].drawnText = "";
  assert.ok(!validateContent(subtitled).warnings.some((w) => w.path.startsWith("scenes[0].panels[1]") && w.code.startsWith("SCENE_DRAWN_TEXT")), '"-" (nothing drawn as text) counts as a transcript');
  delete subtitled.scenes[0].panels[1].drawnText;
  assert.ok(validateContent(subtitled).warnings.some((w) => w.path === "scenes[0].panels[1].drawnText" && w.code === "SCENE_DRAWN_TEXT_MISSING"));

  const box = sample();
  box.scenes[0].panels[5].box = { x: 80, y: 25, w: 30, h: 50 };
  assert.ok(codes(validateContent(box).errors).includes("INVALID_SCENE_BOX"), "a box outside the page");
  const silent = sample();
  for (const panel of silent.scenes[0].panels) panel.lines = [];
  assert.ok(codes(validateContent(silent).errors).includes("NO_SCENE_LINES"), "a scene needs at least one line");
});

test("the panel_box column: four numbers in percent, or a problem", () => {
  const read = (name) => ({ name, text: readFileSync(join(ROOT, "tools/templates", name), "utf8") });
  const base = ["wilayah.csv", "kanji.csv", "kotoba.csv", "quest.csv", "percakapan.csv", "cerita.csv"].map(read);
  const naskah = read("naskah.csv");
  const bad = { ...naskah, text: naskah.text.replace("69 25 26.5 49.5", "kanan") };
  assert.ok(convertCsvFilesToContent([...base, bad], "draft-0").problems.some((p) => p.message.includes("panel_box")));
  const old = { ...naskah, text: naskah.text.split("\n").map((l) => l.split(",").filter((_, i) => i !== 4 && i !== 5).join(",")).join("\n") };
  const converted = convertCsvFilesToContent([...base, old], "draft-0");
  assert.equal(converted.problems.length, 0, "a naskah tab from before D-125 still converts");
  assert.equal(converted.content.scenes[0].panels.some((p) => "box" in p || "drawnText" in p), false);
});
