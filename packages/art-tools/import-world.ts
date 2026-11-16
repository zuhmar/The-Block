import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { ITEMS, PIECES } from "../shared/src/index.js";

const packRoot = new URL("../../art/ai/world/", import.meta.url);

export async function importWorld(root: URL, manifest: Record<string, any>) {
  const pack = JSON.parse(
    await readFile(new URL("manifest.json", packRoot), "utf8"),
  );
  const mappings: Record<string, string[]> = {
    "street-props-dumpster": ["dumpster"],
    "street-props-trash-can": ["trash"],
    "street-props-bench": ["td-bench"],
    "street-props-pallet": ["td-pallet"],
    "street-props-streetlamp": ["td-streetlamp", "streetlight"],
    "street-props-abandoned-car": ["vehicle"],
    "street-props-cardboard-boxes": ["td-boxes"],
    "street-props-road-barricade": ["td-barricade"],
    "street-props-tree": ["td-tree-0", "td-tree-1", "td-tree-2", "td-tree-3"],
    "street-props-bush": ["td-bush"],
    "street-props-rubble": ["td-rubble"],
    "street-props-tires": ["td-tires"],
    "street-props-shopping-cart": ["td-shopping-cart"],
    "street-props-water-barrel": ["td-water-barrel"],
    "street-props-chainlink-fence": ["td-fence"],
    "street-props-campfire": ["td-campfire"],
    "buildings-shelter": ["shelter", "td-building-0"],
    "buildings-convenience-store": ["shop", "td-building-1"],
    "buildings-workshop": ["td-building-2"],
    "buildings-ruined-building": ["td-building-3"],
  };
  for (const item of Object.keys(ITEMS))
    mappings[`inventory-items-${item}`] = [item];
  for (const kind of Object.keys(PIECES)) {
    const source = `buildings-${kind === "storage" ? "storage-chest" : kind}`;
    // Damaged structures retain their silhouette, with runtime tint + HP feedback.
    mappings[source] = [`${kind}-intact`, `${kind}-damaged`];
    mappings["street-props-rubble"].push(`${kind}-breached`);
  }
  const imported = new Set<string>();
  for (const [sourceKey, keys] of Object.entries(mappings)) {
    const source = pack.assets[sourceKey];
    if (!source) throw Error(`Missing AI world sprite ${sourceKey}`);
    imported.add(sourceKey);
    for (const key of keys) {
      const previous = manifest[key];
      const width = previous?.width || 128,
        height = previous?.height || 128;
      const file = `${key}.png`;
      await sharp(new URL(source.file, packRoot).pathname)
        .resize(width, height, { fit: "contain", background: "#00000000" })
        .png()
        .toFile(new URL(file, root).pathname);
      manifest[key] = {
        file,
        width,
        height,
        frameWidth: width,
        frameHeight: height,
        frames: 1,
        anchor: previous?.anchor || { x: 0.5, y: 0.8 },
        source: "ai-generated",
        sourceAsset: sourceKey,
        ...(key.endsWith("-damaged") ? { damageVisual: "tint" } : {}),
      };
    }
  }
  if (imported.size !== Object.keys(pack.assets).length)
    throw Error("Every generated world sprite must have a runtime mapping");
}
