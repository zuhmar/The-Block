import sharp from "sharp";
import { LOOT_CRATES } from "../game-data/loot-crates.js";
const sources = new URL("../../art/ai/loot-crates/sources/", import.meta.url);

export async function importLootCrates(
  root: URL,
  manifest: Record<string, any>,
) {
  for (const crate of LOOT_CRATES) {
    const source = new URL(`${crate.id}.png`, sources).pathname;
    const { data, info } = await sharp(source)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let x0 = info.width,
      y0 = info.height,
      x1 = -1,
      y1 = -1;
    for (let y = 0; y < info.height; y++)
      for (let x = 0; x < info.width; x++) {
        if (data[(y * info.width + x) * 4 + 3] >= 180) {
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x);
          y1 = Math.max(y1, y);
        }
      }
    if (x1 < x0) throw Error(`Empty AI crate: ${crate.id}`);
    const key = `loot-crate-${crate.id}`;
    await sharp(source)
      .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
      .resize(120, 120, { fit: "inside", background: "#00000000" })
      .extend({ left: 4, right: 4, top: 4, bottom: 4, background: "#00000000" })
      .png()
      .toFile(new URL(`${key}.png`, root).pathname);
    const output = await sharp(new URL(`${key}.png`, root).pathname).metadata();
    const width = output.width!,
      height = output.height!;
    manifest[key] = {
      file: `${key}.png`,
      width,
      height,
      frameWidth: width,
      frameHeight: height,
      frames: 1,
      anchor: { x: 0.5, y: 0.5 },
      source: "ai-generated",
      sourceGroup: "loot-crates",
      artSource: `art/ai/loot-crates/sources/${crate.id}.png`,
      sourceCrop: {
        left: x0,
        top: y0,
        width: x1 - x0 + 1,
        height: y1 - y0 + 1,
      },
    };
  }
}
