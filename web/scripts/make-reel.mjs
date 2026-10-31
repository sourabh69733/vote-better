// Builds an MP4 reel from a share deck's story frames, for posting from a computer.
// Needs ffmpeg and a running site (local or deployed).
//
//   npm run reel -- seat/lok-sabha-2024/rajasthan/jaipur
//   npm run reel -- closest/lok-sabha-2024/rajasthan --base=https://example.org --out=closest.mp4
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const option = (name, fallback) => args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const key = args.find((arg) => !arg.startsWith("--"));
if (!key || !/^[a-z0-9-]+(\/[a-z0-9-]+)*$/.test(key)) {
  console.error("Usage: npm run reel -- <deck key, e.g. seat/lok-sabha-2024/rajasthan/jaipur> [--base=URL] [--out=FILE] [--seconds=2.6]");
  process.exit(1);
}
const base = option("base", "http://localhost:3000").replace(/\/$/, "");
const out = option("out", `votebetter-${key.replaceAll("/", "-")}.mp4`);
const seconds = Number(option("seconds", "2.6"));
const fade = 0.4;

const dir = mkdtempSync(join(tmpdir(), "reel-"));
try {
  const frames = [];
  for (let index = 1; index <= 20; index++) {
    const response = await fetch(`${base}/share/image/story/${index}/${key}`);
    if (response.status === 404) break;
    if (!response.ok) throw new Error(`frame ${index}: HTTP ${response.status}`);
    const file = join(dir, `frame-${index}.png`);
    writeFileSync(file, Buffer.from(await response.arrayBuffer()));
    frames.push(file);
  }
  if (!frames.length) throw new Error(`no frames for ${key}; check the key and that the site is running at ${base}`);

  // Each frame shows for `seconds`; neighbours cross-fade.
  const inputs = frames.flatMap((file) => ["-loop", "1", "-t", String(seconds + fade), "-i", file]);
  const steps = [];
  let previous = "[0:v]";
  for (let index = 1; index < frames.length; index++) {
    const label = `[v${index}]`;
    steps.push(`${previous}[${index}:v]xfade=transition=fade:duration=${fade}:offset=${(index * seconds).toFixed(2)}${label}`);
    previous = label;
  }
  const filter = [...steps, `${previous}format=yuv420p,fps=30[out]`].join(";");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", filter, "-map", "[out]",
    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-movflags", "+faststart", out], { stdio: "inherit" });
  console.log(`${out}: ${frames.length} frames, about ${(frames.length * seconds).toFixed(1)} seconds`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
