// Rewards (D-123): the card on the map and the rewards screen (#/hadiah).
// Neither exists in research mode: the route answers like an unknown page and
// the map has no card, so a participant never learns there are rewards.
//
// Redemption is face to face: the player shows the screen when buying a card,
// the seller presses "Sudah ditukar" and confirms by typing a word. The mark is
// kept on this device only; the screen says so.

import { h } from "../dom.js";
import { avatar } from "../cast.js";
import { catsOf } from "../cats.js";
import { currentMode } from "../event-log.js";
import { milestoneText, playerCode, redeemReward, rewardProgress, rewardsAvailable, unredeemed, updateRewards } from "../rewards.js";
import { saveProgress } from "../state.js";
import { backLink } from "./common.js";
import { menuBar } from "./menu.js";

/** Word the seller types to confirm a redemption. */
export const REDEEM_WORD = "DITUKAR";

const formatDate = (iso) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

/** Record rewards earned since the last look, and save if any. */
export function refreshRewards(app) {
  const earned = updateRewards(app.model, app.content.rewards, app.progress, currentMode(app));
  if (earned.length) saveProgress(app.progress);
  return earned;
}

/** The card on the map, or null: research mode, no rewards, or nothing earned or reachable. */
export function rewardMapCard(app) {
  if (!rewardsAvailable(currentMode(app))) return null;
  refreshRewards(app);
  const ready = unredeemed(app.progress);
  if (ready.length) {
    return h(
      "a",
      { class: "reward-card reward-card--ready", href: "#/hadiah" },
      h("span", { class: "reward-card__icon", "aria-hidden": "true" }, "🎁"),
      h(
        "span",
        { class: "reward-card__body" },
        h("span", { class: "reward-card__label" }, ready.length > 1 ? `${ready.length} hadiah siap ditukar` : "Hadiah siap ditukar"),
        h("span", { class: "reward-card__title" }, ready[0].title)
      )
    );
  }
  const next = (app.content.rewards ?? [])
    .filter((r) => !app.progress.rewards[r.id])
    .map((reward) => ({ reward, p: rewardProgress(app.model, app.progress, reward) }))
    .find(({ p }) => p.reachable);
  if (!next) return null;
  return h(
    "a",
    { class: "reward-card", href: "#/hadiah" },
    h("span", { class: "reward-card__icon", "aria-hidden": "true" }, "🎁"),
    h(
      "span",
      { class: "reward-card__body" },
      h("span", { class: "reward-card__label" }, "Hadiah berikutnya"),
      h("span", { class: "reward-card__title" }, next.reward.title),
      h("span", { class: "reward-card__progress" }, `${milestoneText(next.reward)} · ${next.p.done} dari ${next.p.total} tuntas`)
    )
  );
}

function playerBox(app) {
  const character = (app.characters?.players ?? []).find((c) => c.id === app.progress.character) ?? null;
  const cats = catsOf(app.progress, app.model.regions).filter((c) => c.free).length;
  return h(
    "div",
    { class: "reward-player" },
    avatar(character, { className: "reward-player__avatar" }),
    h(
      "div",
      {},
      h("p", { class: "reward-player__code" }, `Pemain ${playerCode(app.progress)}`),
      h("p", { class: "reward-player__cats" }, h("span", { "aria-hidden": "true" }, "🐾 "), `${cats} kucing di koleksi`)
    )
  );
}

export function rewardsScreen(app) {
  const root = h("div", { class: "screen rewards-screen" });
  const render = () => {
    refreshRewards(app);
    const defined = app.content.rewards ?? [];
    // Earned rewards stay, even when the material no longer lists them (D-123).
    const ids = [...new Set([...defined.map((r) => r.id), ...Object.keys(app.progress.rewards)])];
    const cards = ids.map((id) => rewardCard(id, defined.find((r) => r.id === id) ?? null));
    root.replaceChildren(
      ...h(
        "div",
        {},
        backLink("#/", "Peta"),
        h("h1", { tabindex: "-1" }, "Hadiah"),
        h(
          "p",
          {},
          "Hadiah berupa potongan harga kartu dari tim. Tunjukkan layar ini kepada penjual saat membeli kartu; penjual lalu menekan ",
          h("strong", {}, "Sudah ditukar"),
          "."
        ),
        h("p", { class: "muted" }, "Tanda sudah ditukar hanya tersimpan di perangkat ini, dan reset progres menghapus hadiah yang belum ditukar."),
        cards.length ? h("ul", { class: "reward-list" }, cards) : h("p", { class: "notice notice--info" }, "Belum ada hadiah."),
        menuBar(app)
      ).childNodes
    );
  };

  function rewardCard(id, reward) {
    const earned = app.progress.rewards[id] ?? null;
    const title = earned?.title ?? reward.title;
    const text = earned?.text ?? reward.text;
    const parts = [h("h2", { class: "reward__title" }, title), h("p", { class: "reward__text" }, text)];
    if (earned?.redeemedAt) {
      parts.push(
        h("p", { class: "reward__status reward__status--redeemed" }, `✓ Sudah ditukar pada ${formatDate(earned.redeemedAt)}`),
        h("p", { class: "muted" }, `Diraih pada ${formatDate(earned.achievedAt)}.`)
      );
    } else if (earned) {
      parts.push(h("p", { class: "reward__status reward__status--ready" }, `🎁 Diraih pada ${formatDate(earned.achievedAt)}`), playerBox(app), redeemFlow(id));
    } else {
      const p = rewardProgress(app.model, app.progress, reward);
      parts.push(
        h(
          "p",
          { class: "reward__status" },
          p.reachable
            ? `Syarat: ${milestoneText(reward)} · ${p.done} dari ${p.total} tuntas`
            : `Belum bisa diraih: syaratnya (${milestoneText(reward)}) menunggu bab yang belum ada di materi.`
        )
      );
    }
    return h("li", { class: `reward${earned && !earned.redeemedAt ? " reward--ready" : ""}${earned?.redeemedAt ? " reward--redeemed" : ""}` }, parts);
  }

  // Two steps for the seller: open the box, then type the word.
  function redeemFlow(id) {
    const wrapper = h("div", { class: "reward__redeem" });
    const open = h("button", { type: "button", class: "button button--primary button--block" }, "Sudah ditukar");
    const closed = () => wrapper.replaceChildren(open);
    open.addEventListener("click", () => {
      const input = h("input", { type: "text", class: "text-input", id: `redeem-${id}`, autocomplete: "off", autocapitalize: "characters", spellcheck: "false" });
      const confirm = h("button", { type: "button", class: "button button--primary", disabled: true }, "Ya, tandai sudah ditukar");
      input.addEventListener("input", () => (confirm.disabled = input.value.trim().toUpperCase() !== REDEEM_WORD));
      confirm.addEventListener("click", () => {
        if (redeemReward(app.progress, id)) saveProgress(app.progress);
        render();
        root.querySelector("h1")?.focus({ preventScroll: true });
      });
      wrapper.replaceChildren(
        h(
          "div",
          { class: "confirm", role: "group", "aria-label": "Konfirmasi penukaran" },
          h("p", { class: "confirm__title" }, "Untuk penjual: tandai hadiah ini sudah ditukar?"),
          h("ul", {}, h("li", {}, "Tekan hanya setelah kartu dibeli dengan hadiah ini."), h("li", {}, "Setelah ditandai, hadiah ini tidak bisa ditukar lagi di perangkat ini.")),
          h("label", { for: `redeem-${id}`, class: "confirm__label" }, `Ketik ${REDEEM_WORD} untuk melanjutkan:`),
          input,
          h("div", { class: "button-row" }, confirm, h("button", { type: "button", class: "button", onClick: () => (closed(), open.focus()) }, "Batal"))
        )
      );
      input.focus();
    });
    closed();
    return wrapper;
  }

  render();
  return root;
}
