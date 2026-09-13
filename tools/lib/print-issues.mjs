// Terminal output for validation issues, shared by the tools/ scripts.

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, text) => (useColor ? `\x1b[${code}m${text}\x1b[0m` : text);
export const red = (t) => paint("31;1", t);
export const yellow = (t) => paint("33;1", t);
export const green = (t) => paint("32;1", t);
export const dim = (t) => paint("2", t);

/**
 * @param {Array<object>} issues items from validateContent()
 * @param {(issue: object) => string|null} [extraLocation] e.g. CSV row numbers
 */
export function printIssues(issues, extraLocation = () => null) {
  for (const issue of issues) {
    const isError = issue.severity === "error";
    const tag = isError ? red("✗ ERROR") : yellow("⚠ PERINGATAN");
    const banner = issue.prominent ? red(" ████ ") : " ";
    console.log(`${tag}${banner}${issue.where || "(akar file)"}`);
    const extra = extraLocation(issue);
    if (extra) console.log(`  ${extra}`);
    console.log(`  ${issue.message}`);
    if (issue.path) console.log(dim(`  lokasi JSON: ${issue.path}  [${issue.code}]`));
    console.log("");
  }
}

export function printSummary(errors, warnings) {
  if (errors.length) {
    console.log(red(`Gagal: ${errors.length} error, ${warnings.length} peringatan.`));
  } else if (warnings.length) {
    console.log(yellow(`Lolos dengan ${warnings.length} peringatan.`));
  } else {
    console.log(green("Lolos tanpa error dan tanpa peringatan."));
  }
}
