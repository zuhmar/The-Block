import sharp from "sharp";

const source = new URL("../../art/ai/characters/", import.meta.url);
const directions = ["south", "north", "east", "west"];
const states = [
  "idle",
  "walk",
  "run",
  "crouch",
  "melee",
  "firearm",
  "hurt",
  "death",
];

// Technical crop/scale/packing only: every visible pixel comes from AI source PNGs.
export async function importCharacters(
  root: URL,
  manifest: Record<string, any>,
) {
  const sheets = new Map<
    string,
    { data: Buffer; width: number; height: number }
  >();
  for (const name of ["base", "walk", "run", "combat", "npcs"]) {
    const { data, info } = await sharp(
      new URL(`stick-${name}.png`, source).pathname,
    )
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    sheets.set(name, { data, width: info.width, height: info.height });
  }
  async function frame(
    name: string,
    row: number,
    column: number,
    scale: number,
  ) {
    const sheet = sheets.get(name)!;
    const cellWidth = sheet.width / (name === "npcs" ? 4 : 8);
    const cellHeight = sheet.height / 4;
    const left = column * cellWidth,
      top = row * cellHeight;
    let x0 = cellWidth,
      y0 = cellHeight,
      x1 = -1,
      y1 = -1;
    // Ignore the faint generated halo when finding the character's bounds.
    for (let y = 0; y < cellHeight; y++)
      for (let x = 0; x < cellWidth; x++) {
        if (sheet.data[((top + y) * sheet.width + left + x) * 4 + 3] >= 180) {
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x);
          y1 = Math.max(y1, y);
        }
      }
    if (x1 < x0) throw Error(`Empty AI source cell: ${name}/${row}/${column}`);
    x0 = Math.max(0, x0 - 2);
    y0 = Math.max(0, y0 - 2);
    x1 = Math.min(cellWidth - 1, x1 + 2);
    y1 = Math.min(cellHeight - 1, y1 + 2);
    const width = x1 - x0 + 1,
      height = y1 - y0 + 1;
    const ratio = Math.min(scale, 116 / width, 100 / height);
    const w = Math.round(width * ratio),
      h = Math.round(height * ratio);
    const buffer = await sharp(sheet.data, {
      raw: { width: sheet.width, height: sheet.height, channels: 4 },
    })
      .extract({ left: left + x0, top: top + y0, width, height })
      .resize(w, h)
      .png()
      .toBuffer();
    return { input: buffer, left: Math.round((128 - w) / 2), top: 105 - h };
  }
  for (const [directionRow, direction] of directions.entries()) {
    const cells: sharp.OverlayOptions[] = [];
    for (let stateRow = 0; stateRow < states.length; stateRow++) {
      for (let column = 0; column < 8; column++) {
        const state = states[stateRow];
        const sheet =
          state === "walk" || state === "run"
            ? state
            : state === "melee" || state === "firearm"
              ? "combat"
              : "base";
        const sourceColumn =
          sheet === "combat"
            ? Math.floor(column / 2) + (state === "firearm" ? 4 : 0)
            : sheet !== "base"
              ? column
              : state === "crouch"
                ? 4
                : state === "death"
                  ? 7
                  : 0;
        const cell = await frame(sheet, directionRow, sourceColumn, 0.55);
        cells.push({
          ...cell,
          left: cell.left + column * 128,
          top: cell.top + stateRow * 128,
        });
      }
    }
    const key = `player-stick-${direction}`;
    await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: "#00000000",
      },
    })
      .composite(cells)
      .png()
      .toFile(new URL(key + ".png", root).pathname);
    manifest[key] = {
      file: key + ".png",
      width: 1024,
      height: 1024,
      frameWidth: 128,
      frameHeight: 128,
      frames: 64,
      anchor: { x: 0.5, y: 0.82 },
      source: "ai-generated",
      animations: Object.fromEntries(
        states.map((state, row) => [
          state,
          {
            start: row * 8,
            end:
              row * 8 +
              (["idle", "crouch", "hurt", "death"].includes(state) ? 0 : 7),
            fps: state === "run" ? 12 : state === "walk" ? 8 : 16,
          },
        ]),
      ),
    };
  }
  for (const [row, role] of [
    "caretaker",
    "trader",
    "shopkeeper",
    "hostile",
  ].entries()) {
    for (const [column, direction] of directions.entries()) {
      const key = `${role}-${direction}`;
      await sharp({
        create: {
          width: 128,
          height: 128,
          channels: 4,
          background: "#00000000",
        },
      })
        .composite([await frame("npcs", row, column, 0.44)])
        .png()
        .toFile(new URL(key + ".png", root).pathname);
      manifest[key] = {
        file: key + ".png",
        width: 128,
        height: 128,
        frameWidth: 128,
        frameHeight: 128,
        frames: 1,
        anchor: { x: 0.5, y: 0.82 },
        source: "ai-generated",
      };
      if (direction === "south") manifest[role] = { ...manifest[key] };
    }
  }
}
