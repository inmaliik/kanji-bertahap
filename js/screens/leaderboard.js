// Exhibition leaderboard (D-106): players of this device by XP, shown with
// their character's portrait and a running number. Reference only; nothing
// here is logged.

import { h } from "../dom.js";
import { avatar } from "../cast.js";
import { playerLabel, ranking } from "../leaderboard.js";
import { currentMode } from "../event-log.js";
import { leaderboardAvailable } from "../session-mode.js";
import { backLink } from "./common.js";
import { menuBar } from "./menu.js";

export function leaderboardScreen(app) {
  const head = [backLink("#/", "Peta"), h("h1", { tabindex: "-1" }, "🏆 Papan peringkat")];
  if (!leaderboardAvailable(currentMode(app))) {
    return h(
      "div",
      { class: "screen" },
      head,
      h("p", {}, "Papan peringkat hanya ada dalam mode pameran, yang dinyalakan petugas di Pengaturan."),
      menuBar(app)
    );
  }
  const players = new Map((app.characters?.players ?? []).map((c) => [c.id, c]));
  const rows = ranking();
  return h(
    "div",
    { class: "screen" },
    head,
    h("p", { class: "muted" }, "Pemain yang pernah bermain di perangkat ini, diurutkan menurut XP."),
    rows.length
      ? h(
          "ol",
          { class: "ranking" },
          rows.map((r, i) => {
            const own = r.playerId === app.progress.playerId;
            return h(
              "li",
              { class: `ranking__row ${own ? "ranking__row--own" : ""}` },
              h("span", { class: "ranking__place" }, String(i + 1)),
              avatar(players.get(r.character) ?? null, { className: "ranking__avatar" }),
              h("span", { class: "ranking__name" }, playerLabel(r.number), own ? h("span", { class: "ranking__own" }, " (kamu)") : null),
              h("span", { class: "ranking__score" }, `Lv ${r.level} · ${r.xp} XP`)
            );
          })
        )
      : h("p", { class: "notice notice--info" }, "Belum ada pemain di papan ini."),
    menuBar(app)
  );
}
