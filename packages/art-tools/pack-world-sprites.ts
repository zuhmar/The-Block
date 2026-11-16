import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

// Slice original AI artwork into reusable cutouts; never redraw the source art.
const root = new URL("../../art/ai/world/", import.meta.url);
const packs = [
  {
    name: "street-props",
    columns: 4,
    names: [
      "dumpster",
      "trash-can",
      "bench",
      "pallet",
      "streetlamp",
      "abandoned-car",
      "cardboard-boxes",
      "road-barricade",
      "tree",
      "bush",
      "rubble",
      "tires",
      "shopping-cart",
      "water-barrel",
      "chainlink-fence",
      "campfire",
    ],
  },
  {
    name: "inventory-items",
    columns: 4,
    names: [
      "water",
      "snack",
      "bandage",
      "wood",
      "scrap",
      "stone",
      "brick",
      "concrete",
      "steel",
      "glass",
      "electronics",
      "backpack",
      "cash",
      "bat",
      "pistol",
      "ammo",
    ],
  },
  {
    name: "buildings",
    columns: 3,
    names: [
      "shelter",
      "convenience-store",
      "workshop",
      "foundation",
      "wall",
      "door",
      "roof",
      "storage-chest",
      "ruined-building",
    ],
  },
];
await mkdir(new URL("sprites/", root), { recursive: true });
const assets: Record<string, object> = {};
for (const pack of packs) {
  const file = new URL(`sources/${pack.name}.png`, root).pathname;
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.equal(info.channels, 4);
  const rows = pack.names.length / pack.columns;
  for (const [i, name] of pack.names.entries()) {
    const col = i % pack.columns,
      row = Math.floor(i / pack.columns);
    const left = Math.round((col * info.width) / pack.columns),
      top = Math.round((row * info.height) / rows);
    const width = Math.round(((col + 1) * info.width) / pack.columns) - left;
    const height = Math.round(((row + 1) * info.height) / rows) - top;
    let x0 = width,
      y0 = height,
      x1 = -1,
      y1 = -1;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        if (data[((top + y) * info.width + left + x) * 4 + 3] > 128) {
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x);
          y1 = Math.max(y1, y);
        }
      }
    assert(x1 > x0 && y1 > y0, `Empty source cell: ${name}`);
    // Add padding around the detected silhouette. Do not change artwork colors or geometry.
    x0 = Math.max(0, x0 - 4);
    y0 = Math.max(0, y0 - 4);
    x1 = Math.min(width - 1, x1 + 4);
    y1 = Math.min(height - 1, y1 + 4);
    const size =
      pack.name === "inventory-items"
        ? 128
        : pack.name === "buildings"
          ? 512
          : 256;
    const key = `${pack.name}-${name}`,
      output = `sprites/${key}.png`;
    await sharp(file)
      .extract({
        left: left + x0,
        top: top + y0,
        width: x1 - x0 + 1,
        height: y1 - y0 + 1,
      })
      .resize(size - 16, size - 16, { fit: "contain", background: "#00000000" })
      .extend({ top: 8, bottom: 8, left: 8, right: 8, background: "#00000000" })
      .png()
      .toFile(new URL(output, root).pathname);
    const image = sharp(new URL(output, root).pathname),
      meta = await image.metadata(),
      stats = await image.stats();
    assert(meta.hasAlpha && meta.width === size && meta.height === size);
    assert(stats.channels[3].min === 0 && stats.channels[3].max > 128);
    assets[key] = {
      file: output,
      width: size,
      height: size,
      source: `sources/${pack.name}.png`,
      sourceCell: { row, column: col },
      sourceCrop: {
        left: left + x0,
        top: top + y0,
        width: x1 - x0 + 1,
        height: y1 - y0 + 1,
      },
      origin: "ai-generated",
    };
  }
}
await writeFile(
  new URL("manifest.json", root),
  JSON.stringify({ version: 1, runtimeIntegrated: true, assets }, null, 2) +
    "\n",
);
console.log(
  `Packed and validated ${Object.keys(assets).length} AI-generated transparent world sprites.`,
);
