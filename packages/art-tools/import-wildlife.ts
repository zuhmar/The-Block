import sharp from "sharp";
const source = new URL("../../art/ai/wildlife/", import.meta.url);
const directions = ["south", "north", "east", "west"];
const states = ["idle", "walk", "run", "attack", "hurt", "death"];

export async function importWildlife(root: URL, manifest: Record<string, any>) {
  async function crop(
    file: string,
    row: number,
    column: number,
    columns: number,
    rows: number,
  ) {
    const image = sharp(new URL(file, source).pathname);
    const { data, info } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const left = Math.round((column * info.width) / columns),
      top = Math.round((row * info.height) / rows);
    const width = Math.round(((column + 1) * info.width) / columns) - left,
      height = Math.round(((row + 1) * info.height) / rows) - top;
    let x0 = width,
      y0 = height,
      x1 = -1,
      y1 = -1;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++)
        if (data[((top + y) * info.width + left + x) * 4 + 3] > 100) {
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x);
          y1 = Math.max(y1, y);
        }
    if (x1 < x0) throw Error(`Empty wildlife source: ${file}/${row}/${column}`);
    return image.extract({
      left: left + x0,
      top: top + y0,
      width: x1 - x0 + 1,
      height: y1 - y0 + 1,
    });
  }
  for (const [row, direction] of directions.entries()) {
    const cells: sharp.OverlayOptions[] = [];
    for (const [stateRow, state] of states.entries())
      for (let col = 0; col < 8; col++) {
        const file =
          state === "walk" || state === "run" ? "dog-walk.png" : "dog-base.png";
        const column =
          file === "dog-walk.png"
            ? col
            : state === "attack"
              ? 1 + Math.floor(col / 2)
              : state === "hurt"
                ? 5
                : state === "death"
                  ? 6
                  : 0;
        const buffer = await (await crop(file, row, column, 8, 4))
          .resize(116, 100, { fit: "inside" })
          .png()
          .toBuffer();
        const meta = await sharp(buffer).metadata();
        cells.push({
          input: buffer,
          left: col * 128 + Math.round((128 - meta.width!) / 2),
          top: stateRow * 128 + 105 - meta.height!,
        });
      }
    const key = `dog-stray-${direction}`;
    await sharp({
      create: {
        width: 1024,
        height: 768,
        channels: 4,
        background: "#00000000",
      },
    })
      .composite(cells)
      .png()
      .toFile(new URL(`${key}.png`, root).pathname);
    manifest[key] = {
      file: `${key}.png`,
      width: 1024,
      height: 768,
      frameWidth: 128,
      frameHeight: 128,
      frames: 48,
      anchor: { x: 0.5, y: 0.82 },
      source: "ai-generated",
      sourceGroup: "wildlife",
      animations: Object.fromEntries(
        states.map((state, i) => [
          state,
          {
            start: i * 8,
            end: i * 8 + (["idle", "hurt", "death"].includes(state) ? 0 : 7),
            fps: state === "run" ? 12 : state === "attack" ? 16 : 8,
          },
        ]),
      ),
    };
  }
  for (const [i, key] of [
    "projectile-bullet",
    "fx-muzzle",
    "fx-bullet-impact",
    "fx-bite",
  ].entries()) {
    const buffer = await (
      await crop("bullet-effects.png", Math.floor(i / 2), i % 2, 2, 2)
    )
      .resize(120, 120, { fit: "contain", background: "#00000000" })
      .extend({ left: 4, right: 4, top: 4, bottom: 4, background: "#00000000" })
      .png()
      .toBuffer();
    await sharp(buffer).toFile(new URL(`${key}.png`, root).pathname);
    manifest[key] = {
      file: `${key}.png`,
      width: 128,
      height: 128,
      frameWidth: 128,
      frameHeight: 128,
      frames: 1,
      anchor: { x: 0.5, y: 0.5 },
      source: "ai-generated",
      sourceGroup: "combat-effects",
    };
  }
}
