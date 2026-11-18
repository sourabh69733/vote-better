// Finds the file behind a web address, so nobody has to type folder names like [state].
// Next.js marks the changing parts of an address with square brackets in folder names;
// this prints those paths already quoted for the terminal.
//
//   npm run route                              every page and the file that serves it
//   npm run route -- /seats/rajasthan/jaipur   the file for one address, and its values
//   npm run route -- /seats/rajasthan/jaipur --open   open that file in your editor
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const app = join(root, "app");
const ENTRY = /^(page|route|opengraph-image)\.(tsx?|jsx?)$/;

function collect(dir, segments = []) {
  const found = [];
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      // (group) folders and @slots do not appear in the address.
      const skip = /^\(.*\)$/.test(name) || name.startsWith("@");
      found.push(...collect(path, skip ? segments : [...segments, name]));
    } else if (ENTRY.test(name)) {
      const kind = name.split(".")[0];
      found.push({ kind, segments, file: relative(root, path) });
    }
  }
  return found;
}

const display = (segments) => "/" + segments.map((s) => s.replace(/^\[\.\.\.(.+)\]$/, ":$1*").replace(/^\[(.+)\]$/, ":$1")).join("/");
const quote = (path) => (/[\s[\]()*?]/.test(path) ? `"${path}"` : path);

// Static segments win over [param], which wins over [...rest], as in Next.js.
function match(entry, parts) {
  const params = {};
  let score = 0;
  for (let i = 0; i < entry.segments.length; i++) {
    const segment = entry.segments[i];
    const rest = /^\[\.\.\.(.+)\]$/.exec(segment);
    if (rest) {
      if (i >= parts.length) return null;
      params[rest[1]] = parts.slice(i).join("/");
      return { params, score };
    }
    if (i >= parts.length) return null;
    const param = /^\[(.+)\]$/.exec(segment);
    if (param) { params[param[1]] = decodeURIComponent(parts[i]); score += 1; }
    else if (segment === parts[i]) score += 2;
    else return null;
  }
  return entry.segments.length === parts.length ? { params, score } : null;
}

const args = process.argv.slice(2);
const address = args.find((arg) => !arg.startsWith("--"));
const entries = collect(app);

if (!address) {
  const width = Math.max(...entries.map((e) => display(e.segments).length + (e.kind === "page" ? 0 : e.kind.length + 3)));
  for (const entry of entries) {
    const label = display(entry.segments) + (entry.kind === "page" ? "" : ` (${entry.kind})`);
    console.log(`${label.padEnd(width)}  ${quote(entry.file)}`);
  }
  process.exit(0);
}

const path = new URL(address, "http://local").pathname.replace(/\/$/, "");
const parts = path.split("/").filter(Boolean);
const wantImage = parts.at(-1) === "opengraph-image";
const candidates = entries
  .filter((entry) => (wantImage ? entry.kind === "opengraph-image" : entry.kind !== "opengraph-image"))
  .map((entry) => ({ entry, result: match(entry, wantImage ? parts.slice(0, -1) : parts) }))
  .filter(({ result }) => result)
  .sort((a, b) => b.result.score - a.result.score);

if (!candidates.length) {
  console.error(`No page serves ${path || "/"}. Run "npm run route" to list them.`);
  process.exit(1);
}
const { entry, result } = candidates[0];
console.log(quote(entry.file));
for (const [name, value] of Object.entries(result.params)) console.log(`  ${name} = ${value}`);
if (args.includes("--open")) {
  const editor = process.env.VISUAL || process.env.EDITOR;
  try {
    if (editor) execFileSync(editor, [join(root, entry.file)], { stdio: "inherit" });
    else execFileSync("code", [join(root, entry.file)], { stdio: "inherit" });
  } catch {
    execFileSync("open", [join(root, entry.file)]);
  }
}
