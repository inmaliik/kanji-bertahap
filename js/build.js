// Build identity (D-115). On Netlify, terbitkan.sh writes build.json with the
// commit being published; every log row carries it as buildId, so a research
// period can show that all participants used the same build. Locally, or when
// the file is missing or unreadable, the build is "dev". The app never depends
// on this file for anything else.

export const DEV_BUILD = "dev";

let buildId = DEV_BUILD;

/** @returns {string} a commit id (7–40 hex characters) or "dev" */
export function parseBuildId(data) {
  const id = data && typeof data === "object" ? data.buildId : null;
  return typeof id === "string" && /^[0-9a-f]{7,40}$/.test(id) ? id : DEV_BUILD;
}

export async function loadBuildId(url) {
  try {
    const response = await fetch(url, { cache: "no-cache" });
    buildId = response.ok ? parseBuildId(JSON.parse(await response.text())) : DEV_BUILD;
  } catch {
    buildId = DEV_BUILD;
  }
  return buildId;
}

export const getBuildId = () => buildId;
