// Cats (D-121): every mission that is passed frees one cat. Which cats are
// free is derived from progress, like XP (D-105), so it never drifts and never
// depends on XP or levels. Each mission names its cat in the content
// (quest.cat: name and the layers it is made of, data/layers.json).
// Pure module: no DOM, no storage.

import { questPassed } from "./progression.js";
import { usesColors } from "./layers.js";

/** Layers of a cat as one comparable value: two missions may not share it. */
export const catKey = (cat) => [cat.body, cat.pattern, cat.accessory, cat.color ?? ""].join(" / ");

/** Missions of a region with their cat, and whether it is free. */
export function regionCats(progress, region) {
  return region.quests.filter((q) => q.cat).map((quest) => ({ quest, cat: quest.cat, free: questPassed(progress, quest), index: region.quests.indexOf(quest) }));
}

/** Every cat of the given regions, in play order. */
export const catsOf = (progress, regions) => regions.flatMap((region) => regionCats(progress, region).map((c) => ({ ...c, region })));

/** The rescue moment plays once per cat, right after its mission is passed. */
export const rescueDue = (progress, quest) => Boolean(quest.cat) && questPassed(progress, quest) && !progress.rescuesShown.includes(quest.id);

export function markRescueShown(progress, quest) {
  if (!progress.rescuesShown.includes(quest.id)) progress.rescuesShown.push(quest.id);
}

/**
 * Cat layers that data/layers.json does not have, per mission. The content
 * validator cannot see layers.json, so the tools and the content check page
 * run this next to it.
 * @returns {Array<{questId: string, message: string}>}
 */
export function catLayerProblems(content, layers) {
  const problems = [];
  const has = (list, id) => list.some((item) => item.id === id);
  const { bodies, patterns, accessories, colors = [] } = layers.cat;
  for (const region of content.regions ?? []) {
    for (const quest of region.quests ?? []) {
      const cat = quest?.cat;
      if (!cat || typeof cat !== "object") continue;
      const add = (message) => problems.push({ questId: quest.id, message: `Kucing misi ${quest.id}: ${message}` });
      if (!has(bodies, cat.body)) add(`tubuh "${cat.body}" tidak ada di data/layers.json (ada: ${bodies.map((b) => b.id).join(", ")}).`);
      if (!has(patterns, cat.pattern)) add(`corak "${cat.pattern}" tidak ada di data/layers.json (ada: ${patterns.map((p) => p.id).join(", ")}).`);
      if (!has(accessories, cat.accessory)) add(`aksesori "${cat.accessory}" tidak ada di data/layers.json (ada: ${accessories.map((a) => a.id).join(", ")}).`);
      if (usesColors(layers)) {
        if (!has(colors, cat.color)) add(`warna "${cat.color ?? ""}" tidak ada di data/layers.json (ada: ${colors.map((c) => c.id).join(", ")}).`);
      } else if (cat.color) {
        add(`kolom warna berisi "${cat.color}", tetapi data/layers.json tidak memakai warna dari data; kosongkan kolomnya.`);
      }
    }
  }
  return problems;
}

/**
 * catLayerProblems() as validator issues (errors), with the JSON path of each
 * mission's cat so the converter can point at the spreadsheet row.
 */
export function catLayerIssues(content, layers) {
  const paths = new Map();
  (content.regions ?? []).forEach((region, i) => (region.quests ?? []).forEach((quest, j) => paths.set(quest?.id, `regions[${i}].quests[${j}].cat`)));
  return catLayerProblems(content, layers).map(({ questId, message }) => ({
    severity: "error",
    code: "CAT_UNKNOWN_LAYER",
    where: `quest ${questId} › cat`,
    path: paths.get(questId) ?? "",
    message,
    prominent: false,
  }));
}
