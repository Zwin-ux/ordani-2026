/**
 * Build README demo reel: product stills + hero + halt + optional screen capture.
 * Requires ffmpeg on PATH.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const demoDir = join(root, "docs", "demo");
const pubDir = join(root, "public", "assets", "demo");
mkdirSync(demoDir, { recursive: true });
mkdirSync(pubDir, { recursive: true });

function ff(args) {
  const r = spawnSync("ffmpeg", args, { encoding: "utf8" });
  if (r.status !== 0) {
    console.error(r.stderr?.slice(-800) || r.error);
    throw new Error(`ffmpeg failed: ${args.slice(0, 6).join(" ")}`);
  }
  return r;
}

const plates = [
  "public/assets/world/ch-00/plate.webp",
  "public/assets/world/ch-01/plate.webp",
  "public/assets/world/ch-02/plate.webp",
  "public/assets/onboarding/world/ob-print.webp",
  "public/assets/onboarding/halt/stop-poster.jpg",
]
  .map((p) => join(root, p))
  .filter((p) => existsSync(p));

const inputs = [];
const parts = [];
plates.forEach((p, i) => {
  inputs.push("-loop", "1", "-t", "2", "-i", p);
  parts.push(
    `[${i}:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0x0b0b0b,setsar=1,fps=15,format=yuv420p[v${i}]`
  );
});
const concatLabels = plates.map((_, i) => `[v${i}]`).join("");
const fc = `${parts.join(";")};${concatLabels}concat=n=${plates.length}:v=1:a=0[v]`;
const montage = join(demoDir, "montage.mp4");
ff(["-y", ...inputs, "-filter_complex", fc, "-map", "[v]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", montage]);
console.log("montage ok");

function scaleClip(inRel, outName, seconds) {
  const inPath = join(root, inRel);
  if (!existsSync(inPath)) return null;
  const outPath = join(demoDir, outName);
  ff([
    "-y",
    "-i",
    inPath,
    "-t",
    String(seconds),
    "-vf",
    "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0x0b0b0b,fps=15,format=yuv420p",
    "-an",
    "-c:v",
    "libx264",
    "-crf",
    "23",
    outPath,
  ]);
  return outName;
}

const clips = [
  "montage.mp4",
  scaleClip("public/assets/hero/space-soft.mp4", "hero-clip.mp4", 5),
  scaleClip("public/assets/onboarding/halt/stop-soft.mp4", "halt-clip.mp4", 5),
  scaleClip("docs/demo/screen-raw.mp4", "screen-clip.mp4", 8),
].filter(Boolean);

const listPath = join(demoDir, "final-concat.txt");
writeFileSync(listPath, clips.map((c) => `file '${c}'`).join("\n") + "\n");

const demoMp4 = join(demoDir, "tinyme-demo.mp4");
ff([
  "-y",
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  listPath,
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-crf",
  "24",
  "-an",
  demoMp4,
]);
console.log("demo mp4 ok");

const demoGif = join(demoDir, "tinyme-demo.gif");
ff([
  "-y",
  "-i",
  demoMp4,
  "-t",
  "12",
  "-vf",
  "fps=10,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4",
  "-loop",
  "0",
  demoGif,
]);
console.log("gif ok");

copyFileSync(demoMp4, join(pubDir, "tinyme-demo.mp4"));
copyFileSync(demoGif, join(pubDir, "tinyme-demo.gif"));
console.log("copied to public/assets/demo/");
