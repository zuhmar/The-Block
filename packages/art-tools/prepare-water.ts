import sharp from "sharp";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = "art/ai/water",
  out = "apps/client/src/fps/textures/water";
await mkdir(out, { recursive: true });
const assets = [];
for (const [name, size] of [
  ["water", 512],
  ["foam", 512],
  ["ripple", 256],
] as const) {
  const source = await readFile(`${root}/references/${name}.png`);
  const target = await sharp(source)
    .resize(size, size)
    .webp({ quality: 88, alphaQuality: 100 })
    .toBuffer();
  await writeFile(`${out}/${name}.webp`, target);
  const info = await sharp(target).metadata();
  assets.push({
    name,
    file: `${name}.webp`,
    width: info.width,
    height: info.height,
    alpha: !!info.hasAlpha,
    bytes: target.length,
    referenceSha256: createHash("sha256").update(source).digest("hex"),
  });
}
await writeFile(
  `${root}/manifest.json`,
  JSON.stringify(
    {
      style: "original AI glossy cartoon",
      assets,
      animation:
        "two mirrored scrolling water layers, drifting shoreline foam, pooled scale/fade ripple sprites; runtime annular mask suppresses ripple fringe",
    },
    null,
    2,
  ) + "\n",
);
console.log(assets);
