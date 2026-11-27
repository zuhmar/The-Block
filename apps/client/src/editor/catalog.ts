/// <reference types="vite/client" />
import { STREET_PLAN } from "../fps/city-streets-layout";
import { configureCompactCity } from "../fps/compact-city";
import { CITY_PLOTS, RESOURCE_PARKS, JAIL_ISLAND } from "../fps/compact-plan";
import { START } from "../fps/world";
import { ENEMY_TYPES } from "../fps/enemy";
import { COMPOUND_PATROLS } from "../fps/military-compound";
import { labEncounters } from "../fps/lab-enemies";
import { NORTH_LAB } from "../fps/north-lab-layout";
import { BUILDINGS, ROADS, pavedWidth, LOOT } from "../fps/world";
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
    !/^(buildings|build-wood|street|roadside|loot-chests|meshy-warehouse|jail-kit|block-mart|tenement-v2|apartment-props)\//.test(
      key,
    ) ||
    (key.startsWith("block-mart/") &&
      !key.startsWith("block-mart/parts/") &&
      !key.startsWith("block-mart/meshy/parts/")) ||
    (key.startsWith("tenement-v2/") && !key.startsWith("tenement-v2/parts/")) ||
    key.endsWith("jail-grounds.glb") ||
    key.endsWith("jail-meshy-grounds.glb") ||
    key.endsWith("meshy-warehouse/warehouse.glb")
  )
    continue;
  const type = key.split("/").at(-1)!.replace(".glb", ""),
    b = key.startsWith("buildings/")
      ? BUILDINGS.find((b) => b.type === type)
      : undefined;
  if (
    key.startsWith("block-mart/meshy/parts/") &&
    !/\/(retail-shelf|checkout-counter|refrigerator|stock-boxes|roof-ac|roof-vent|exterior-light|security-camera|rain-downpipe)\.glb$/.test(
      key,
    )
  )
    continue;
  CATALOG.push({
    id: "model:" + key,
    name:
      (key.startsWith("jail-kit/")
        ? "Jail · "
        : key.startsWith("block-mart/meshy/")
          ? "Block Mart Meshy · "
          : key.startsWith("tenement-v2/")
            ? "Tenement · "
            : "") +
      type.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    layer: b ? "Buildings" : "Props",
    behavior:
      key.startsWith("loot-chests") ||
      /^roadside\/(tier-|trash-can-metal|wheelie-bin|litter-basket|dumpster)/.test(
        key,
      )
        ? "loot"
        : "solid",
    url,
    anchor:
      b || key.startsWith("roadside/") || key.startsWith("apartment-props/")
        ? [0, 0, 0]
        : undefined,
    size: b ? [b.width, b.height, b.depth] : undefined,
  });
}
const apartment = Object.entries(urls).find(([p]) =>
  p.endsWith("/tenement-v2/tenement.glb"),
);
if (apartment)
  CATALOG.push({
    id: "building:tenement-v2",
    name: "Corner Tenements · furnished · 3 stories",
    layer: "Buildings",
    behavior: "solid",
    url: apartment[1],
    anchor: [0, 0, 0],
    size: [10, 11.22, 10],
  });
const westCourt = Object.entries(urls).find(([p]) =>
  p.endsWith("/city-apartments/city-apartments.glb"),
);
if (westCourt)
  CATALOG.push({
    id: "building:city-apartments",
    name: "West Court · 6 apartments · roof access",
    layer: "Buildings",
    behavior: "solid",
    url: westCourt[1],
    anchor: [0, 0, 0],
    size: [18, 12.74, 16],
  });
const mart = Object.entries(urls).find(([p]) =>
  p.endsWith("/block-mart/meshy/block-mart.glb"),
);
if (mart)
  CATALOG.push({
    id: "building:block-mart",
    name: "Block Mart · furnished",
    layer: "Buildings",
    behavior: "solid",
    url: mart[1],
    anchor: [0, 0, 0],
    size: [10, 5.3, 10],
  });
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
  p.endsWith("/street/jail-meshy-grounds.glb"),
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
    url: `/assets/meshy-nature-v1/${kind}-lod1.glb`,
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
  [
    "jail-island",
    "Jail island ground",
    "jail-island",
    "Terrain",
    "decoration",
    [48, 1, 52],
  ],
  [
    "housing-plot",
    "Housing plot boundary",
    "housing-plot",
    "Terrain",
    "decoration",
    [16, 1, 16],
  ],
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
for (const size of ["small", "large"] as const)
  CATALOG.push({
    id: "player-storage:" + size,
    name: (size === "small" ? "Small" : "Large") + " player storage chest",
    layer: "Props",
    behavior: "solid",
    url: `/assets/player-storage/chest-${size}.glb`,
  });
CATALOG.push({
  id: "assembly:north-lab-yard",
  name: "North Works · yard and perimeter",
  layer: "Buildings",
  behavior: "solid",
  url: "/assets/north-lab/yard.glb",
  anchor: [0, 0, 0],
});
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
    configureCompactCity();
    add(
      "assembly:north-lab-yard",
      "North Works · yard",
      NORTH_LAB.x,
      NORTH_LAB.z,
    );
    BUILDINGS.forEach((b) =>
      add(
        b.type === "city-apartments"
          ? "building:city-apartments"
          : b.type === "tenement"
            ? "building:tenement-v2"
            : b.type === "store"
              ? "building:block-mart"
              : b.type === "warehouse"
                ? "building:warehouse"
                : "model:buildings/" + b.type + ".glb",
        b.name,
        b.x,
        b.z,
      ),
    );
    add("assembly:jail", "Jail fence & towers", JAIL_ISLAND.x, JAIL_ISLAND.z);
    add("jail-island", "Jail island ground", JAIL_ISLAND.x, JAIL_ISLAND.z, {
      scale: [JAIL_ISLAND.rx * 2, 1, JAIL_ISLAND.rz * 2],
      y: -0.1,
    });
    add("assembly:harbor", "South harbor assembly", -60, 174);
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
    // The jail assembly includes its correctly aligned bridge.
    for (const plot of CITY_PLOTS)
      add(
        "housing-plot",
        plot.id + " · $" + plot.price + " / $" + plot.daily + " daily",
        plot.x,
        plot.z,
        { scale: [plot.width, 1, plot.depth] },
      );
    for (const park of RESOURCE_PARKS)
      add(
        park.kind === "tree" ? "grass" : "dirt",
        park.kind === "tree" ? "City pocket park" : "Resource yard",
        park.x,
        park.z,
        { scale: [park.width, 0.1, park.depth], y: -0.02 },
      );
    LOOT.forEach((l) =>
      add(
        l.kind === "trash"
          ? `model:roadside/${
              {
                dumpster: "dumpster",
                metal: "trash-can-metal",
                wheelie: "wheelie-bin",
                litter: "litter-basket",
              }[l.model ?? "metal"]
            }.glb`
          : `model:roadside/tier-${l.tier}-${["", "small", "supply", "reinforced", "long", "heavy"][l.tier]}.glb`,
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
    for (const p of STREET_PLAN.props) {
      const name =
        p.kind === "lamp"
          ? "streetlamp"
          : p.kind === "hydrant"
            ? "fire-hydrant"
            : p.kind === "bench"
              ? "bench"
              : undefined;
      if (name)
        add(`model:roadside/${name}.glb`, name, p.x, p.z, {
          y: p.y,
          yaw: p.yaw,
          scale:
            p.kind === "lamp"
              ? [p.height / 4.3, p.height / 4.3, p.height / 4.3]
              : [1, 1, 1],
        });
    }
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
    add("spawn-player", "Jail release", START.x, START.z);
    for (const [kind, spec] of Object.entries(ENEMY_TYPES))
      add(
        kind === "lookout"
          ? "spawn-easy"
          : kind === "police"
            ? "spawn-police"
            : "spawn-swat",
        kind + " patrol",
        spec.spawn.x,
        spec.spawn.z,
      );
    for (const patrol of COMPOUND_PATROLS)
      add("spawn-swat", patrol.id, patrol.points[0].x, patrol.points[0].z);
    for (const guard of labEncounters())
      add(
        guard.labTier === "easy"
          ? "spawn-easy"
          : guard.labTier === "medium"
            ? "spawn-police"
            : "spawn-swat",
        guard.id,
        guard.patrol.points[0].x,
        guard.patrol.points[0].z,
      );
  }
  return {
    format: "street-survival-map",
    version: 1,
    name: current
      ? "Survive the Block · compact city & jail island"
      : "Untitled island",
    worldSize: 640,
    coast: COASTLINE.filter((_, i) => i % 16 === 0).map((p) => ({ ...p })),
    objects,
    assets: [],
  };
}
