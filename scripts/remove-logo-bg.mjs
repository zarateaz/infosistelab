// One-off: the logo PNG the user supplied has a baked-in off-white
// background (no alpha channel) — unusable directly on a dark navbar.
// Keys out near-white pixels to transparent with a soft-edged threshold
// (linear alpha falloff) instead of a hard cutoff, to avoid jagged edges.
import sharp from "sharp";

const SRC = "public/brand/infosistel-logo.png";
const OUT = "public/brand/infosistel-logo.png";

const BG = { r: 251, g: 253, b: 253 };
const LOW = 18; // fully transparent below this distance from BG
const HIGH = 45; // fully opaque above this distance from BG

function dist(r, g, b) {
  return Math.sqrt((r - BG.r) ** 2 + (g - BG.g) ** 2 + (b - BG.b) ** 2);
}

const image = sharp(SRC).ensureAlpha();
const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += info.channels) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const d = dist(r, g, b);
  let alpha = 255;
  if (d <= LOW) alpha = 0;
  else if (d < HIGH) alpha = Math.round(((d - LOW) / (HIGH - LOW)) * 255);
  data[i + 3] = alpha;
}

await sharp(data, { raw: info }).png().toFile(OUT + ".tmp");
const fs = await import("node:fs/promises");
await fs.rename(OUT + ".tmp", OUT);
console.log("done:", OUT);
