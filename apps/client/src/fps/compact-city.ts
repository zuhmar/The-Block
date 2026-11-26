import { configureCityStreets, clearCityStreets } from "./city-streets-layout";
import denseCityPlan from "./dense-city-plan.json";
import {
  orientCityFrontages,
  CITY_FRONTAGES,
  frontageOptions,
} from "./building-frontage";
import {
  BUILDING_YAWS,
  buildingWorld,
  buildingFootprint,
} from "./building-layout";
import { TIMBER_YARD } from "./timber-yard-layout";
import { CITY_APARTMENTS } from "./city-apartments-layout";
import {
  JAIL_KIT_TOWERS,
  JAIL_KIT_PROPS,
  JAIL_KIT_BUILDING_Z,
} from "./jail-kit-layout";
import {
  COMPACT,
  CITY_OUTLINE,
  CITY_PLOTS,
  RESOURCE_PARKS,
  denseOutline,
} from "./compact-plan";
import {
  BUILDINGS,
  BUILDING_FRONTS,
  frontOf,
  copyCityBuilding,
  addCityBuilding,
  truncateCityBuildings,
} from "./building-layout";
import {
  ROADS,
  CITY_RING,
  LOOT,
  TREES,
  START,
  pieceBox,
  blockedTerrain,
  roadDistance,
  type Piece,
  type Save,
} from "./world";
import { COASTLINE } from "./coast";
import {
  JAIL_BOXES,
  JAIL_TOWERS,
  JAIL_STAIRS,
  JAIL_GROUNDS,
  JAIL_OFFSET,
} from "./jail-ground-layout";
import {
  COMPOUND,
  COMPOUND_BARRIERS,
  COMPOUND_PATROLS,
} from "./military-compound";
import { WEST_QUARTER, ROAD_BINS } from "./west-quarter";
import { NORTH_LAB } from "./north-lab-layout";
import {
  HARBOR,
  HARBOR_ENTRY,
  PIERS,
  DECKS,
  CONTAINERS,
  HARBOR_BOXES,
} from "./harbor-layout";
import { newSurvival, inPlot } from "./survival-state";
const shifts = {
  jail: { x: 0, z: -124 },
  military: { x: -176, z: -40 },
  west: { x: 68, z: 40 },
  lab: { x: 168, z: 170 },
  harbor: { x: 0, z: -60 },
};
let undo: (() => void) | undefined;
export function configureCompactCity() {
  if (COMPACT.active) return undo!;
  const snapshots = new Map<object, Record<string, unknown>>();
  function remember(o: object) {
    if (!snapshots.has(o)) snapshots.set(o, { ...o });
  }
  function shift(o: { x: number; z: number }, d: { x: number; z: number }) {
    remember(o);
    o.x += d.x;
    o.z += d.z;
  }
  function bounds(
    o: { minX: number; maxX: number; minZ: number; maxZ: number },
    d: { x: number; z: number },
  ) {
    remember(o);
    o.minX += d.x;
    o.maxX += d.x;
    o.minZ += d.z;
    o.maxZ += d.z;
  }
  const buildingCount = BUILDINGS.length,
    lootCount = LOOT.length,
    oldJailBoxes = JAIL_BOXES.slice(),
    trees = TREES.slice(),
    coast = COASTLINE.slice(),
    roads = ROADS.slice();
  const oldBuildings = BUILDINGS.map((b) => ({ ...b }));
  // Move containers with the building that owns their position, retaining saved loot indices.
  for (const loot of LOOT) {
    const b = oldBuildings.find(
      (b) =>
        Math.abs(loot.x - b.x) < b.width / 2 &&
        Math.abs(loot.z - b.z) < b.depth / 2,
    );
    let d = { x: 0, z: 0 };
    if (b?.type === "jail")
      d = { x: shifts.jail.x, z: shifts.jail.z + JAIL_KIT_BUILDING_Z };
    else if (b?.type.startsWith("military-")) d = shifts.military;
    else if (b?.type.startsWith("district-")) d = shifts.west;
    else if (b?.type.startsWith("north-")) d = shifts.lab;
    else if (loot.z > 190) d = shifts.harbor;
    else if (loot.x > 60 && loot.x < 116 && loot.z > -24 && loot.z < 38)
      d = shifts.military;
    else if (loot.x < -125 && loot.z > -30 && loot.z < 32) d = shifts.west;
    shift(loot, d);
  }
  // Keep the harbor weapon case off the southern avenue without changing its saved index.
  for (const l of LOOT)
    if (Math.abs(l.z - 168) < 1.5) {
      remember(l);
      l.z = 169.4;
    }
  // Keep this container's saved cooldown index; move it clear of the new shelves.
  remember(LOOT[5]);
  LOOT[5].x = BUILDINGS[0].x - 3.2;
  LOOT[5].z = BUILDINGS[0].z + 1;
  for (const b of BUILDINGS) {
    BUILDING_FRONTS.set(b, frontOf(b));
    let d = { x: 0, z: 0 };
    if (b.type === "jail")
      d = { x: shifts.jail.x, z: shifts.jail.z + JAIL_KIT_BUILDING_Z };
    else if (b.type.startsWith("military-")) d = shifts.military;
    else if (b.type.startsWith("district-")) d = shifts.west;
    else if (b.type.startsWith("north-")) d = shifts.lab;
    else if (b.type === "warehouse") d = { x: -60, z: 4 };
    else if (b.type === "workshop") d = { x: -60.5, z: -29 };
    // The central warehouse and workshop also keep their indoor loot aligned.
    if (b.type === "warehouse" || b.type === "workshop")
      for (const l of LOOT)
        if (
          Math.abs(l.x - b.x) < b.width / 2 &&
          Math.abs(l.z - b.z) < b.depth / 2
        )
          shift(l, d);
    shift(b, d);
    if (b.type === "store") {
      b.name = "BLOCK MART";
      b.height = 5.3;
    }
  }
  for (const o of [...JAIL_BOXES, ...JAIL_TOWERS]) shift(o, shifts.jail);
  for (const s of JAIL_STAIRS) {
    remember(s);
    s.startZ += shifts.jail.z;
  }
  shift(JAIL_OFFSET, shifts.jail);
  bounds(JAIL_GROUNDS, shifts.jail);
  JAIL_GROUNDS.minX = -17;
  JAIL_GROUNDS.maxX = 17;
  JAIL_GROUNDS.minZ = JAIL_OFFSET.z - 17;
  JAIL_GROUNDS.maxZ = JAIL_OFFSET.z + 17;
  JAIL_TOWERS.forEach((t, i) =>
    Object.assign(t, JAIL_KIT_TOWERS[i], {
      z: JAIL_KIT_TOWERS[i].z + JAIL_OFFSET.z,
    }),
  );
  JAIL_STAIRS.forEach((s, i) => {
    const t = JAIL_KIT_TOWERS[i];
    s.x = t.x;
    s.startZ = JAIL_OFFSET.z + t.front * 7;
  });
  const kitBoxes = [
    ...[-17, 17].map((x) => ({
      x,
      z: 0,
      y: 0,
      width: 0.15,
      depth: 34,
      height: 3,
      role: "fence",
    })),
    { x: 0, z: -17, y: 0, width: 34, depth: 0.15, height: 3, role: "fence" },
    ...[
      [-9.5, 15],
      [4, 4],
      [12.5, 9],
    ].map(([x, width]) => ({
      x,
      z: 17,
      y: 0,
      width,
      depth: 0.15,
      height: 3,
      role: "fence",
    })),
    ...JAIL_KIT_PROPS.map((p) => ({ ...p, y: 0, role: "prop" })),
    ...JAIL_KIT_TOWERS.flatMap((t) => [
      {
        x: t.x,
        z: t.z,
        y: 0,
        width: 1.6,
        depth: 1.6,
        height: 3.2,
        role: "shaft",
      },
      ...[-1, 1].map((side) => ({
        x: t.x + side * 1.45,
        z: t.z,
        y: 3.2,
        width: 0.1,
        depth: 3,
        height: 2.85,
        role: "rail",
      })),
      {
        x: t.x,
        z: t.z + t.front * 1.45,
        y: 3.2,
        width: 3,
        depth: 0.1,
        height: 2.85,
        role: "rail",
      },
      ...[-1, 1].map((side) => ({
        x: t.x + side * 1.15,
        z: t.z - t.front * 1.45,
        y: 3.2,
        width: 0.7,
        depth: 0.1,
        height: 2.85,
        role: "rail",
      })),
    ]),
    ...[-8.5, -5.5].map((x) => ({
      x,
      z: 15,
      y: 0,
      width: 0.16,
      depth: 3,
      height: 2.8,
      role: "gatehouse",
    })),
    {
      x: -7,
      z: 16.5,
      y: 0,
      width: 3,
      depth: 0.16,
      height: 2.8,
      role: "gatehouse",
    },
    ...[-8.125, -5.875].map((x) => ({
      x,
      z: 13.5,
      y: 0,
      width: 0.75,
      depth: 0.16,
      height: 2.8,
      role: "gatehouse",
    })),
  ];
  JAIL_BOXES.splice(
    0,
    JAIL_BOXES.length,
    ...kitBoxes.map((b) => ({ ...b, z: b.z + JAIL_OFFSET.z })),
  );

  shift(START, shifts.jail);
  bounds(COMPOUND, shifts.military);
  COMPOUND_BARRIERS.forEach((b) => shift(b, shifts.military));
  COMPOUND_PATROLS.forEach((p) =>
    p.points.forEach((q) => shift(q, shifts.military)),
  );
  bounds(WEST_QUARTER, shifts.west);
  ROAD_BINS.filter((p) => p.x < -125).forEach((p) => shift(p, shifts.west));
  shift(NORTH_LAB, shifts.lab);
  remember(NORTH_LAB);
  NORTH_LAB.enabled = true;
  bounds(HARBOR, shifts.harbor);
  shift(HARBOR_ENTRY, shifts.harbor);
  const seen = new Set<object>();
  for (const b of [...PIERS, ...DECKS, ...CONTAINERS, ...HARBOR_BOXES])
    if (!seen.has(b)) {
      seen.add(b);
      shift(b, shifts.harbor);
    }
  ROADS.splice(
    0,
    ROADS.length,
    [
      { x: 0, z: -110 },
      { x: 0, z: -74 },
      { x: 18, z: -74 },
    ],
    ...[-128, -48, 18, 154].map((x) => [
      { x, z: -74 },
      { x, z: 164 },
    ]),
    ...[-74, 40, 80, 124, 164].map((z) => [
      { x: -152, z },
      { x: 154, z },
    ]),
    [
      { x: -128, z: -33 },
      { x: -48, z: -33 },
    ],
    [
      { x: 46, z: 118 },
      { x: 46, z: 124 },
    ],
    [
      { x: 62, z: 102 },
      { x: 66, z: 102 },
      { x: 66, z: 124 },
    ],
    [
      { x: 30, z: 102 },
      { x: 18, z: 102 },
    ],
    [
      { x: 88, z: 80 },
      { x: 88, z: 124 },
    ],
    CITY_RING,
    [
      { x: 88, z: 32 },
      { x: 88, z: 40 },
    ],
    [
      { x: -60, z: 124 },
      { x: -60, z: 147 },
    ],
  );
  COMPACT.active = true;
  COASTLINE.splice(0, COASTLINE.length, ...denseOutline(CITY_OUTLINE));
  // Reuse furnished buildings to fill street blocks, leaving mixed residential lots between them.
  for (const [type, x, z, name] of [
    ["workshop", -144, -56, "NORTHWEST REPAIRS"],
    ["flats", -8, 60, "MARKET STREET FLATS"],
    ["home", 70, 60, "EAST ROW HOUSE"],
    ["district-clinic", 132, 60, "EASTSIDE CLINIC"],
    ["tenement", -62, 102, "SOUTH TENEMENTS"],
    ["district-market", -112, 102, "SOUTH MARKET"],
    ["home", 12, 102, "CANAL ROW HOUSE"],
    ["district-duplex", 76, 102, "FOUNDRY DUPLEX"],
    ["district-offices", 70, 146, "DOCKSIDE OFFICES"],
    ["home", -144, 146, "PORT ROW HOUSE"],
  ] as const) {
    const index = copyCityBuilding(
      BUILDINGS.findIndex((b) => b.type === type),
      x,
      z,
      name,
    );
    const b = BUILDINGS[index];
    LOOT.push({
      x: b.x,
      z: b.z + (frontOf(b) > 0 ? -1 : 1),
      width: 1.1,
      depth: 0.85,
      height: 0.9,
      tier: 2,
      name: name + " supplies",
      color: 0x728b76,
    });
  }
  // Append after existing loot, preserving every saved cooldown index.
  addCityBuilding(CITY_APARTMENTS);
  for (let floor = 0; floor < 3; floor++)
    for (const z of [-6, 4.2])
      LOOT.push({
        x: CITY_APARTMENTS.x + 2.4,
        z: CITY_APARTMENTS.z + z,
        y: floor * 3.2,
        width: 1.1,
        depth: 0.85,
        height: 0.9,
        tier: floor + 2,
        name: "West Court apartment supplies",
        color: 0x728b76,
      });
  const desired = [
    { x: 0, z: 0 },
    { x: -30, z: 60 },
    { x: 102, z: 60 },
    { x: -90, z: 102 },
    { x: -18, z: 102 },
    { x: 42, z: 60 },
    { x: 106, z: 102 },
    { x: 42, z: 146 },
    { x: 102, z: 146 },
    { x: -144, z: 60 },
    { x: -32, z: -52 },
    { x: -146, z: -30 },
  ];
  CITY_PLOTS.splice(0);
  for (const c of desired) {
    const size = CITY_PLOTS.length % 3 === 2 ? 24 : 16;
    CITY_PLOTS.push({
      id: "plot-" + (CITY_PLOTS.length + 1),
      ...c,
      width: size,
      depth: size,
      price: size === 16 ? 300 : 700,
      daily: size === 16 ? 25 : 60,
    });
  }
  // Authored street-facing infill. Append after existing loot to retain saved cooldown IDs.
  let added = 0;
  for (const [type, x, z] of [
    ["tenement", -16, -60],
    ["flats", -2, -60],
    ["district-offices", 0, -46],
    ["district-duplex", -144, -10],
    ["tenement", -36, 2],
    ["flats", -66, 6],
    ["district-offices", -18, 28],
    ["district-duplex", 6, 52],
    ["tenement", 82, 52],
    ["flats", 6, 64],
    ["district-offices", -114, 68],
    ["district-duplex", -98, 68],
    ["tenement", -84, 68],
    ["flats", -70, 68],
  ] as const) {
    const source = BUILDINGS.findIndex((b) => b.type === type),
      b = BUILDINGS[source];
    copyCityBuilding(source, x, z, `CITY BLOCK ${++added}`);
    LOOT.push({
      x,
      z: z + (frontOf(b) > 0 ? -1 : 1),
      width: 1.1,
      depth: 0.85,
      height: 0.9,
      tier: 2,
      name: "City apartment supplies",
      color: 0x728b76,
    });
  }
  TREES.splice(0);
  for (const park of RESOURCE_PARKS.filter((p) => p.kind === "tree"))
    for (const dx of park.x === TIMBER_YARD.x && park.z === TIMBER_YARD.z
      ? [-6, -2, 4]
      : [-6, 0, 6])
      for (const dz of park.x === TIMBER_YARD.x && park.z === TIMBER_YARD.z
        ? [-7, 7]
        : [
            -Math.min(7, park.depth / 2 - 3),
            0,
            Math.min(7, park.depth / 2 - 3),
          ])
        TREES.push({
          x: park.x + dx,
          z: park.z + dz,
          width: 0.65,
          depth: 0.65,
          scale: 0.8,
        });
  // Leave the apartment's straight entrance walk clear of the street bin.
  for (const p of [...ROAD_BINS, ...LOOT])
    if (Math.abs(p.x + 100) < 0.01 && Math.abs(p.z - 36.1) < 0.01) {
      remember(p);
      p.x = -97.5;
    }
  orientCityFrontages((b) => {
    for (const l of LOOT)
      if (
        Math.abs(l.x - b.x) < b.width / 2 &&
        Math.abs(l.z - b.z) < b.depth / 2
      ) {
        remember(l);
        const p = buildingWorld(b, { x: l.x - b.x, z: l.z - b.z });
        l.x = p.x;
        l.z = p.z;
      }
  });
  // Append new street rows after all previous building and cache indices.
  for (const [row, p] of denseCityPlan.entries()) {
    const source = BUILDINGS.findIndex((b) => b.type === p.type);
    const index = copyCityBuilding(source, p.x, p.z, `STREET ROW ${row + 1}`),
      b = BUILDINGS[index];
    BUILDING_YAWS.set(b, p.yaw);
    const frontage = frontageOptions(index).find(
      (f) => Math.abs(Math.sin((f.yaw - p.yaw) / 2)) < 0.001,
    );
    if (!frontage)
      throw Error(`Street row ${row + 1} has no clear road-facing entrance`);
    CITY_FRONTAGES.push(frontage);
    const cache = buildingWorld(b, { x: 0, z: frontOf(b) > 0 ? -1 : 1 });
    LOOT.push({
      ...cache,
      width: 1.1,
      depth: 0.85,
      height: 0.9,
      tier: 2,
      name: "Street row supplies",
      color: 0x728b76,
    });
  }
  configureCityStreets();
  undo = () => {
    if (!COMPACT.active) return;
    for (const [o, values] of snapshots) Object.assign(o, values);
    JAIL_BOXES.splice(0, JAIL_BOXES.length, ...oldJailBoxes);
    BUILDINGS.forEach((b) => BUILDING_YAWS.delete(b));
    CITY_FRONTAGES.splice(0);
    clearCityStreets();
    truncateCityBuildings(buildingCount);
    BUILDINGS.forEach((b) => BUILDING_FRONTS.delete(b));
    LOOT.splice(lootCount);
    TREES.splice(0, TREES.length, ...trees);
    COASTLINE.splice(0, COASTLINE.length, ...coast);
    ROADS.splice(0, ROADS.length, ...roads);
    CITY_PLOTS.splice(0);
    COMPACT.active = false;
  };
  return undo;
}
export function cityPlotClear(p: (typeof CITY_PLOTS)[number]) {
  const r = p.width / 2;
  for (let dx = -r; dx <= r; dx += 2)
    for (let dz = -r; dz <= r; dz += 2)
      if (
        blockedTerrain({ x: p.x + dx, z: p.z + dz }, 0.5) ||
        roadDistance({ x: p.x + dx, z: p.z + dz }) < 4.5
      )
        return false;
  return (
    ![
      ...BUILDINGS.map(buildingFootprint),
      ...HARBOR_BOXES,
      ...COMPOUND_BARRIERS,
    ].some(
      (b) =>
        Math.abs(b.x - p.x) < b.width / 2 + r + 1 &&
        Math.abs(b.z - p.z) < b.depth / 2 + r + 1,
    ) &&
    !RESOURCE_PARKS.some(
      (b) =>
        Math.abs(b.x - p.x) < b.width / 2 + r + 1 &&
        Math.abs(b.z - p.z) < b.depth / 2 + r + 1,
    )
  );
}
/** Translate bases as whole groups; never scale, flatten, refund or discard a player's structures. */
export function migrateCompactSave(save: Save) {
  save.survival ??= newSurvival();
  const s = save.survival;
  if (s.mapVersion === 2) return;
  const old = s.plots,
    plots = CITY_PLOTS.map((p) => ({ ...p }));
  const moved = new Set<string>(),
    occupied = new Set<string>();
  const move = (pieces: Piece[], dx: number, dz: number) => {
    for (const p of pieces) {
      p.x += dx;
      p.z += dz;
      moved.add(p.id);
    }
  };
  for (const oldPlot of old) {
    const group = save.pieces.filter(
      (p) => !moved.has(p.id) && inPlot(p, oldPlot),
    );
    const target = plots.find((p) => p.id === oldPlot.id);
    if (!target) throw Error("No matching city plot");
    if (
      group.length &&
      (oldPlot.width > target.width || oldPlot.depth > target.depth)
    )
      throw Error("Base exceeds replacement lot");
    move(group, target.x - oldPlot.x, target.z - oldPlot.z);
    if (
      group.length ||
      s.lease?.plotId === target.id ||
      s.abandoned.some((a) => a.plotId === target.id)
    )
      occupied.add(target.id);
  }
  const remaining = save.pieces.filter((p) => !moved.has(p.id));
  while (remaining.length) {
    const group = [remaining.shift()!];
    for (let i = 0; i < group.length; i++)
      for (let j = remaining.length - 1; j >= 0; j--)
        if (
          Math.hypot(group[i].x - remaining[j].x, group[i].z - remaining[j].z) <
          5
        )
          group.push(remaining.splice(j, 1)[0]);
    const boxes = group.map(pieceBox),
      minX = Math.min(...boxes.map((p) => p.x - p.width / 2)),
      maxX = Math.max(...boxes.map((p) => p.x + p.width / 2)),
      minZ = Math.min(...boxes.map((p) => p.z - p.depth / 2)),
      maxZ = Math.max(...boxes.map((p) => p.z + p.depth / 2));
    const candidates = plots.map((p) => ({
      plot: p,
      dx: Math.round((p.x - (minX + maxX) / 2) / 2) * 2,
      dz: Math.round((p.z - (minZ + maxZ) / 2) / 2) * 2,
    }));
    const placement = candidates.find(
      ({ plot: p, dx, dz }) =>
        !occupied.has(p.id) &&
        minX + dx >= p.x - p.width / 2 &&
        maxX + dx <= p.x + p.width / 2 &&
        minZ + dz >= p.z - p.depth / 2 &&
        maxZ + dz <= p.z + p.depth / 2,
    );
    if (!placement) throw Error("Legacy base needs a larger parcel");
    const target = placement.plot;
    move(group, placement.dx, placement.dz);
    occupied.add(target.id);
  }
  // Legacy builds have no new rent assigned. They occupy reserved city parcels outside the sale catalog.
  s.plots = plots.filter(
    (p) =>
      !occupied.has(p.id) ||
      s.lease?.plotId === p.id ||
      s.abandoned.some((a) => a.plotId === p.id),
  );
  if (save.inventory)
    for (const [i, d] of save.inventory.drops.entries()) {
      d.x = 4 + (i % 4) * 0.35;
      d.z = -70 + (Math.floor(i / 4) % 4) * 0.35;
      d.y = 0;
    }
  save.harvest = undefined;
  s.mapVersion = 2;
}
