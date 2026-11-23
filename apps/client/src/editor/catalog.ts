/// <reference types="vite/client" />
import { BUILDINGS, ROADS, pavedWidth, LOOT, riverX } from "../fps/world";
import { COASTLINE } from "../fps/coast";
import { ResourceWorld } from "../fps/resource-world";
import {
  makeObject,
  type MapDocument,
  type Layer,
  type Behavior,
} from "./document";
export type CatalogAsset = {
  id: string;
  name: string;
  layer: Layer;
  behavior: Behavior;
  url?: string;
  primitive?: string;
  anchor?: [number, number, number];
  size?: [number, number, number];
  scale?: [number, number, number];
};
const urls = import.meta.glob("../fps/models/**/*.glb", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
export const CATALOG: CatalogAsset[] = [];
for (const [path, url] of Object.entries(urls)) {
  const key = path.split("/models/")[1];
  if (
    !/^(buildings|build-wood|street|loot-chests|meshy-warehouse)\//.test(key) ||
    key.endsWith("jail-grounds.glb") ||
    key.endsWith("meshy-warehouse/warehouse.glb")
  )
    continue;
  const type = key.split("/").at(-1)!.replace(".glb", ""),
    b = key.startsWith("buildings/")
      ? BUILDINGS.find((b) => b.type === type)
      : undefined;
  CATALOG.push({
    id: "model:" + key,
    name: type.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    layer: b ? "Buildings" : "Props",
    behavior: key.startsWith("loot-chests") ? "loot" : "solid",
    url,
    anchor: b ? [0, 0, 0] : undefined,
    size: b ? [b.width, b.height, b.depth] : undefined,
  });
}
const warehouse = Object.entries(urls).find(([p]) =>
  p.endsWith("/meshy-warehouse/warehouse.glb"),
);
const wb = BUILDINGS.find((b) => b.type === "warehouse")!;
if (warehouse)
  CATALOG.push({
    id: "building:warehouse",
    name: "Warehouse · furnished",
    layer: "Buildings",
    behavior: "solid",
    url: warehouse[1],
    anchor: [0, 0, 0],
    size: [wb.width, wb.height, wb.depth],
  });
const jail = Object.entries(urls).find(([p]) =>
  p.endsWith("/street/jail-grounds.glb"),
);
if (jail)
  CATALOG.push({
    id: "assembly:jail",
    name: "Jail perimeter · assembled",
    layer: "Props",
    behavior: "solid",
    url: jail[1],
    anchor: [0, 0, 0],
  });
CATALOG.push({
  id: "assembly:harbor",
  name: "South harbor · assembled",
  layer: "Buildings",
  behavior: "solid",
  url: "/assets/harbor/south-harbor.glb",
  anchor: [-60, 0, 234],
});
for (const kind of [
  "tree-broadleaf",
  "tree-pine",
  "tree-birch",
  "node-rock",
  "node-sulfur",
  "node-metal",
])
  CATALOG.push({
    id: "nature:" + kind,
    name: kind.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    layer: "Nature",
    behavior: kind.startsWith("tree")
      ? "tree"
      : kind === "node-sulfur"
        ? "sulfur"
        : kind === "node-metal"
          ? "metal"
          : "rock",
    url: `/assets/nature-models/${kind}-lod1.glb`,
  });
for (const kind of ["workbench", "furnace"])
  CATALOG.push({
    id: "station:" + kind,
    name: kind === "workbench" ? "Crafting bench" : "Furnace",
    layer: "Props",
    behavior: kind === "workbench" ? "workbench" : "furnace",
    url: `/assets/crafting/station-${kind}.glb`,
  });
for (const [id, name, primitive, layer, behavior, scale] of [
  ["road", "Road segment", "road", "Terrain", "decoration", [8, 0.08, 16]],
  [
    "junction",
    "Road junction",
    "roadplain",
    "Terrain",
    "decoration",
    [10, 0.08, 10],
  ],
  ["sidewalk", "Sidewalk", "box", "Terrain", "decoration", [2, 0.15, 12]],
  ["water", "Water patch", "water", "Terrain", "decoration", [12, 0.1, 12]],
  ["grass", "Grass patch", "grass", "Terrain", "decoration", [12, 0.15, 12]],
  ["dirt", "Dirt path", "dirt", "Terrain", "decoration", [3, 0.08, 12]],
  [
    "plateau",
    "Grass plateau / cliff",
    "plateau",
    "Terrain",
    "solid",
    [15, 5, 15],
  ],
  ["box", "Block / wall", "box", "Props", "solid", [2, 2, 1]],
  ["cylinder", "Cylinder / column", "cylinder", "Props", "solid", [1, 2, 1]],
  ["barrel", "Steel barrel", "barrel", "Props", "solid", [1, 1, 1]],
  ["fence", "Chain-link fence", "fence", "Props", "solid", [4, 2, 1]],
  [
    "container",
    "Shipping container · long",
    "container",
    "Props",
    "solid",
    [12, 2.6, 2.5],
  ],
  [
    "container-small",
    "Shipping container · short",
    "container",
    "Props",
    "solid",
    [6, 2.6, 2.5],
  ],
  ["dock", "Dock section", "dock", "Props", "solid", [6, 1, 12]],
  ["bridge", "Bridge section", "bridge", "Terrain", "solid", [8, 1, 24]],
  ["lamp", "Street lamp", "lamp", "Props", "solid", [1, 1, 1]],
  ["bench", "Park bench", "bench", "Props", "solid", [1, 1, 1]],
  ["table", "Table", "table", "Props", "solid", [1, 1, 1]],
  ["chair", "Chair", "chair", "Props", "solid", [1, 1, 1]],
  ["tower", "Watchtower", "tower", "Props", "solid", [1, 1, 1]],
  ["stairs", "Stairs", "stairs", "Props", "solid", [2, 2, 4]],
  [
    "spawn-player",
    "Player spawn",
    "marker",
    "Markers",
    "player-spawn",
    [1, 1, 1],
  ],
  [
    "spawn-easy",
    "Easy NPC spawn",
    "marker",
    "Markers",
    "enemy-easy",
    [1, 1, 1],
  ],
  [
    "spawn-police",
    "Police NPC spawn",
    "marker",
    "Markers",
    "enemy-police",
    [1, 1, 1],
  ],
  [
    "spawn-swat",
    "SWAT NPC spawn",
    "marker",
    "Markers",
    "enemy-swat",
    [1, 1, 1],
  ],
] as [string, string, string, Layer, Behavior, [number, number, number]][])
  CATALOG.push({ id, name, primitive, layer, behavior, scale });
export const KNOWN_ASSETS = new Set(CATALOG.map((a) => a.id));
export function newMap(current = true): MapDocument {
  const objects: MapDocument["objects"] = [];
  const add = (
    asset: string,
    name: string,
    x: number,
    z: number,
    values: Parameters<typeof makeObject>[4] = {},
  ) => {
    const a = CATALOG.find((a) => a.id === asset);
    if (!a) return;
    objects.push(
      makeObject(asset, name, a.layer, a.behavior, {
        id: `base-${objects.length}`,
        x,
        z,
        scale: a.scale ?? [1, 1, 1],
        ...values,
      }),
    );
  };
  if (current) {
    BUILDINGS.forEach((b) =>
      add(
        b.type === "warehouse"
          ? "building:warehouse"
          : "model:buildings/" + b.type + ".glb",
        b.name,
        b.x,
        b.z,
      ),
    );
    add("assembly:jail", "Jail fence & towers", 0, 0);
    add("assembly:harbor", "South harbor assembly", -60, 234);
    for (const [r, road] of ROADS.entries())
      for (let i = 1; i < road.length; i++) {
        const a = road[i - 1],
          b = road[i],
          length = Math.hypot(b.x - a.x, b.z - a.z),
          yaw = (Math.atan2(b.x - a.x, b.z - a.z) * 180) / Math.PI;
        add("road", `Road ${r + 1} / ${i}`, (a.x + b.x) / 2, (a.z + b.z) / 2, {
          yaw,
          scale: [pavedWidth(road), 0.08, length],
          y: 0.01,
        });
      }
    for (let z = -232; z < 233; z += 16) {
      const x = riverX(z);
      add("water", "Eastern river", x, z, {
        scale: [7.5, 0.1, 17],
        y: -0.025,
        yaw: (Math.atan2(riverX(z + 8) - riverX(z - 8), 16) * 180) / Math.PI,
      });
    }
    add("bridge", "Eastern road bridge", 47, 7, {
      yaw: 90,
      scale: [10, 1, 34],
      y: 0.1,
    });
    LOOT.forEach((l) =>
      add(
        l.kind === "trash"
          ? `model:street/bin-${l.model ?? "metal"}.glb`
          : `model:loot-chests/tier-${l.tier}-${["", "small", "supply", "reinforced", "long", "heavy"][l.tier]}.glb`,
        l.name,
        l.x,
        l.z,
        {
          y: l.y ?? 0,
          behavior: "loot",
          lootTier: Math.max(1, l.tier),
          respawn: 300,
        },
      ),
    );
    let seed = 73;
    const resources = new ResourceWorld(
      () => [],
      undefined,
      0,
      () => {
        seed = (1664525 * seed + 1013904223) >>> 0;
        return seed / 4294967296;
      },
    );
    resources.entities.forEach((t, i) =>
      add("nature:" + t.kind, "Resource " + (i + 1), t.x, t.z, {
        yaw: ((t.rotation * 180) / Math.PI) % 360,
        scale: [t.scale, t.scale, t.scale],
        solid: true,
        respawn: t.kind.startsWith("tree") ? 120 : 45,
      }),
    );
    add("spawn-player", "Town start", 0, 14);
    for (const [i, p] of [
      [-14, 33],
      [-32, -30],
      [32, -32],
      [68, 0],
      [90, -18],
      [72, 30],
      [96, 14],
    ].entries())
      add(
        i === 0 ? "spawn-easy" : i === 1 ? "spawn-police" : "spawn-swat",
        "NPC spawn " + (i + 1),
        p[0],
        p[1],
      );
  }
  return {
    format: "street-survival-map",
    version: 1,
    name: current ? "Street Survival · current map" : "Untitled island",
    worldSize: 640,
    coast: COASTLINE.filter((_, i) => i % 16 === 0).map((p) => ({ ...p })),
    objects,
    assets: [],
  };
}
