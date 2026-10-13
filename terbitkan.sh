#!/bin/sh
# Netlify build command (netlify.toml, D-115). Copies the six site items into
# _situs, unchanged, and writes _situs/build.json with the commit being built,
# so every log row can name the exact build it came from. Nothing is
# transformed: the app runs the same without build.json (buildId "dev").
set -eu

rm -rf _situs
mkdir _situs
cp -R index.html css js data assets tools _situs/

# Netlify sets COMMIT_REF during a build. Anything that is not a plain hex
# commit id is written as "dev", so the JSON below can never be broken.
commit="${COMMIT_REF:-dev}"
case "$commit" in
  "" | *[!0-9a-f]*) commit="dev" ;;
esac
printf '{ "buildId": "%s", "builtAt": "%s" }\n' "$commit" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > _situs/build.json
