import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
const source = "art/branding/survive-the-block-logo.png";
const out = "apps/client/static/assets/branding";
await mkdir(out, { recursive: true });
const files = [];
for (const width of [384, 768, 1536]) {
  const path = `${out}/survive-the-block-${width}.webp`;
  const image = sharp(source).resize({ width });
  const info = await image
    .webp({ quality: 92, alphaQuality: 100, effort: 6 })
    .toFile(path);
  files.push({
    path,
    width: info.width,
    height: info.height,
    bytes: info.size,
  });
}
const iconPath = `${out}/survive-the-block-icon.png`;
const icon = await sharp(source).resize({ width: 96 }).png().toFile(iconPath);
files.push({
  path: iconPath,
  width: icon.width,
  height: icon.height,
  bytes: icon.size,
});
await writeFile(
  "art/branding/web-assets.json",
  JSON.stringify({ source, files }, null, 2) + "\n",
);
console.log(files);
