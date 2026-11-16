import sharp from "sharp";
import { BUILD_KINDS, type Kind } from "../shared/src/index.js";

const source = new URL("../../art/ai/construction/source.png", import.meta.url);
const columns: Record<Kind, number> = {
  foundation: 0,
  wall: 1,
  door: 2,
  roof: 3,
  storage: 3,
};
const states = ["intact", "damaged", "breached"];

export async function importConstruction(
  root: URL,
  manifest: Record<string, any>,
) {
  const { data, info } = await sharp(source.pathname)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (const kind of BUILD_KINDS)
    for (const [row, state] of states.entries()) {
      const column = columns[kind];
      // Measured cell windows: image generation did not produce an even grid.
      const xs = [0, 320, 744, 1184, info.width],
        ys = [0, 400, 720, info.height];
      const left = xs[column],
        top = ys[row],
        width = xs[column + 1] - left,
        height = ys[row + 1] - top;
      let x0 = width,
        y0 = height,
        x1 = -1,
        y1 = -1;
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
          if (data[((top + y) * info.width + left + x) * 4 + 3] >= 180) {
            x0 = Math.min(x0, x);
            y0 = Math.min(y0, y);
            x1 = Math.max(x1, x);
            y1 = Math.max(y1, y);
          }
        }
      if (x1 < x0) throw Error(`Empty construction cell ${kind}/${state}`);
      const key = `${kind}-${state}`;
      const strip = kind === "wall" || kind === "door";
      const cropped = sharp(source.pathname).extract({
        left: left + x0,
        top: top + y0,
        width: x1 - x0 + 1,
        height: y1 - y0 + 1,
      });
      if (strip)
        await cropped
          .resize(128, 32, { fit: "contain", background: "#00000000" })
          .extend({
            top: 48,
            bottom: 48,
            left: 0,
            right: 0,
            background: "#00000000",
          })
          .png()
          .toFile(new URL(`${key}.png`, root).pathname);
      else
        await cropped
          .resize(128, 128, { fit: "contain", background: "#00000000" })
          .png()
          .toFile(new URL(`${key}.png`, root).pathname);
      manifest[key] = {
        file: `${key}.png`,
        width: 128,
        height: 128,
        frameWidth: 128,
        frameHeight: 128,
        frames: 1,
        anchor: { x: 0.5, y: 0.5 },
        source: "ai-generated",
        sourceGroup: "construction",
        sourceCell: { row, column },
        sourceCrop: {
          left: left + x0,
          top: top + y0,
          width: x1 - x0 + 1,
          height: y1 - y0 + 1,
        },
        artSource: "art/ai/construction/source.png",
      };
    }
}
