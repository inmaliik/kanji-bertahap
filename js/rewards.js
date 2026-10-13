// Rewards for the team's physical cards (D-123). A milestone in the content
// ("finish regions B01–B05", "complete world 1") earns a reward whose text the
// team writes (for example a discount). A reward is redeemed face to face: the
// rewards screen shows the reward, the date it was earned, the player's
// character and code and the number of cats, and the seller presses "Sudah
// ditukar" so that this device cannot redeem it twice.
//
// This is a system of trust, not a safeguard: a static site cannot keep a
// secret, and a reset, another browser or another phone can earn the same
// reward again. Nothing here pretends otherwise.
//
// Research mode has no rewards at all: none shown, none mentioned, none earned
// (an incentive changes how participants play, like the leaderboard, D-106).
// Pure module: no DOM, no storage.

import { reviewId } from "./model.js";
import { chapterRanges } from "./worlds.js";
import { STATUS } from "./state.js";
import { worldSummary } from "./progression.js";
import { SESSION_MODE } from "./session-mode.js";

export const rewardsAvailable = (mode) => mode !== SESSION_MODE.RESEARCH;

/** Short code shown to the seller, from the random player id: "#7F3A". */
export const playerCode = (progress) => `#${progress.playerId.replace(/[^0-9a-f]/gi, "").slice(0, 4).toUpperCase()}`;

const regionDone = (progress, region) => progress.quests[reviewId(region.chapter)]?.status === STATUS.PASSED;

/**
 * How far the player is on one reward's milestone. A region counts when it is
 * done (all its missions and its review); a world counts when it is complete,
 * which needs every chapter of its range in the material (D-116).
 * @returns {{met: boolean, done: number, total: number, reachable: boolean}}
 */
export function rewardProgress(model, progress, reward) {
  const wanted = reward.requires.regions ?? [];
  const regions = wanted.map((id) => model.regions.find((r) => r.id === id) ?? null);
  let done = regions.filter((r) => r && regionDone(progress, r)).length;
  let total = wanted.length;
  let reachable = regions.every(Boolean);
  let met = done === total;
  if (reward.requires.world != null) {
    const world = model.worlds.find((w) => w.number === reward.requires.world);
    const summary = world ? worldSummary(model, progress, world) : null;
    total += 1;
    if (summary?.complete) done += 1;
    else met = false;
    if (!summary || summary.missing.length) reachable = false;
  }
  return { met: met && total > 0, done, total, reachable };
}

/**
 * Record every reward whose milestone is met now, with the date and the texts
 * as they are now. A reward once earned stays earned, whatever later changes in
 * the material (D-123). Does nothing in research mode.
 * @returns {object[]} rewards earned by this call
 */
export function updateRewards(model, rewards, progress, mode, now = new Date()) {
  if (!rewardsAvailable(mode)) return [];
  const earned = [];
  for (const reward of rewards ?? []) {
    if (progress.rewards[reward.id]) continue;
    if (!rewardProgress(model, progress, reward).met) continue;
    progress.rewards[reward.id] = { title: reward.title, text: reward.text, achievedAt: now.toISOString(), redeemedAt: null };
    earned.push(reward);
  }
  return earned;
}

/**
 * The seller pressed "Sudah ditukar". A reward can be redeemed once.
 * @returns {boolean} false if it was not earned or is already redeemed
 */
export function redeemReward(progress, id, now = new Date()) {
  const entry = progress.rewards[id];
  if (!entry || entry.redeemedAt) return false;
  entry.redeemedAt = now.toISOString();
  return true;
}

/** Earned rewards not redeemed yet, oldest first. */
export const unredeemed = (progress) =>
  Object.entries(progress.rewards)
    .filter(([, r]) => !r.redeemedAt)
    .map(([id, r]) => ({ id, ...r }))
    .sort((a, b) => a.achievedAt.localeCompare(b.achievedAt));

/** "Bab 1–5" for a milestone's regions, "tamatkan Dunia 1" for its world. */
export function milestoneText(reward) {
  const parts = [];
  const chapters = (reward.requires.regions ?? []).map((id) => Number(id.slice(1))).filter(Number.isInteger);
  if (chapters.length) parts.push(`selesaikan Bab ${chapterRanges(chapters)}`);
  if (reward.requires.world != null) parts.push(`tamatkan Dunia ${reward.requires.world}`);
  return parts.join(" dan ");
}

