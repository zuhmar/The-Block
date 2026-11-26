import {
  isCityApartments,
  apartmentFixtures,
  apartmentPartitions,
  apartmentDoors,
  apartmentDoorBlocked,
  resetApartmentDoors,
  animateApartmentDoors,
} from "./city-apartments-layout";
import {
  isMart,
  martInside,
  martBlocked,
  martDoorPoint,
  martDoorBlocked,
  resetMartDoors,
  animateMartDoors,
  martPlan,
} from "./block-mart-layout";
import {
  JAIL_DOOR_Z,
  JAIL_BUILDING_WALLS,
  inJailCourtyard,
} from "./jail-kit-layout";
import {
  NORTH_BUILDINGS,
  NORTH_LAB,
  isNorthBuilding,
  northFront,
  northFixtures,
} from "./north-lab-layout";
export const BUILDINGS = [
  {
    x: -26.5,
    z: -10,
    width: 10,
    depth: 10,
    height: 4.4,
    color: 0xe9ad6a,
    name: "GENERAL STORE",
    type: "store",
  },
  {
    x: 0,
    z: -24,
    width: 12,
    depth: 12,
    height: 5.2,
    color: 0x7bb9b4,
    name: "THE HAVEN",
    type: "shelter",
  },
  {
    x: 26.5,
    z: -9,
    width: 9,
    depth: 8,
    height: 4.2,
    color: 0xca7855,
    name: "WORKSHOP",
    type: "workshop",
  },
  {
    x: -26.5,
    z: 16,
    width: 9,
    depth: 9,
    height: 4.6,
    color: 0x9c91ba,
    name: "OLD RESIDENCE",
    type: "home",
  },
  {
    x: 26,
    z: 24,
    width: 12,
    depth: 9,
    height: 5.3,
    color: 0x6f93a2,
    name: "WAREHOUSE",
    type: "warehouse",
  },
  {
    x: 0,
    z: 0,
    width: 16,
    depth: 14,
    height: 5.5,
    color: 0xa6b4bb,
    name: "CENTRAL JAIL",
    type: "jail",
  },
  {
    x: 0,
    z: 23,
    width: 12,
    depth: 10,
    height: 6.7,
    color: 0xd5aa78,
    name: "COURTYARD FLATS",
    type: "flats",
  },
  {
    x: -26.5,
    z: -25,
    width: 10,
    depth: 10,
    height: 9.9,
    color: 0xa87968,
    name: "CORNER TENEMENTS",
    type: "tenement",
  },
  {
    x: 76,
    z: -12,
    width: 12,
    depth: 10,
    height: 4.5,
    color: 0x83946d,
    name: "FORT EAST COMMAND",
    type: "military-command",
  },
  {
    x: 96,
    z: -12,
    width: 14,
    depth: 10,
    height: 4.3,
    color: 0x75856a,
    name: "SWAT BARRACKS",
    type: "military-barracks",
  },
  {
    x: 100,
    z: 25,
    width: 16,
    depth: 12,
    height: 6,
    color: 0x6e8077,
    name: "MILITARY SUPPLY HANGAR",
    type: "military-hangar",
  },
  {
    x: 74,
    z: 22,
    width: 8,
    depth: 8,
    height: 3.8,
    color: 0x778354,
    name: "FIELD TENT",
    type: "military-tent",
  },
  {
    x: 86,
    z: 22,
    width: 8,
    depth: 8,
    height: 3.8,
    color: 0xb6aa85,
    name: "MEDICAL TENT",
    type: "military-medical",
  },
  {
    x: -179,
    z: -14,
    width: 12,
    depth: 10,
    height: 4.2,
    color: 0xc77c66,
    name: "CORNER DINER",
    type: "district-diner",
  },
  {
    x: -157,
    z: -14,
    width: 14,
    depth: 12,
    height: 4.5,
    color: 0x83a977,
    name: "WEST MARKET",
    type: "district-market",
  },
  {
    x: -135,
    z: -14,
    width: 10,
    depth: 10,
    height: 4.6,
    color: 0xbe8b5e,
    name: "REPAIR GARAGE",
    type: "district-garage",
  },
  {
    x: -179,
    z: 15,
    width: 12,
    depth: 10,
    height: 6.7,
    color: 0xbb7865,
    name: "BRICK DUPLEX",
    type: "district-duplex",
  },
  {
    x: -157,
    z: 15,
    width: 12,
    depth: 12,
    height: 4.5,
    color: 0x83b9b0,
    name: "WEST CLINIC",
    type: "district-clinic",
  },
  {
    x: -135,
    z: 15,
    width: 14,
    depth: 10,
    height: 9.9,
    color: 0x819caf,
    name: "CORNER OFFICES",
    type: "district-offices",
  },
  ...NORTH_BUILDINGS,
];
export type Building = (typeof BUILDINGS)[number];
export const buildingEnabled = (b: Building) =>
  !isNorthBuilding(b.type) || NORTH_LAB.enabled;
export type BuildingPoint = { x: number; z: number; y?: number };
export type Fixture = {
  /** Prepared Meshy prop and measured shooting/visual bounds, when supplied. */
  asset?: string;
  height?: number;
  kind:
    | "shelf"
    | "counter"
    | "fridge"
    | "bed"
    | "bench"
    | "table"
    | "cabinet"
    | "sofa"
    | "kitchen"
    | "rack"
    | "pallet"
    | "workbench";
  x: number;
  z: number;
  width: number;
  depth: number;
  rotation?: number;
  y?: number;
};
export const DOOR_WIDTH = 1.6,
  OPENING_WIDTH = 1.8,
  WALL = 0.22;
export const doorAngles = BUILDINGS.map(() => 0);
export const doorTargets = BUILDINGS.map(() => false);
export const BUILDING_FRONTS = new WeakMap<object, number>();
export const frontOf = (b: Building) =>
  BUILDING_FRONTS.get(b) ??
  (isNorthBuilding(b.type)
    ? northFront(b.type)
    : b.type === "jail" || b.z < 0
      ? 1
      : -1);
/** Cardinal world orientation; all room, stair and door plans remain in prefab coordinates. */
export const BUILDING_YAWS = new WeakMap<object, number>();
export const buildingYaw = (b: Building) => BUILDING_YAWS.get(b) ?? 0;
export function buildingFootprint(b: Building) {
  const odd = Math.abs(Math.sin(buildingYaw(b))) > 0.5;
  return {
    ...b,
    width: odd ? b.depth : b.width,
    depth: odd ? b.width : b.depth,
  };
}
export function buildingWorld(b: Building, p: BuildingPoint): BuildingPoint {
  const a = buildingYaw(b),
    c = Math.cos(a),
    s = Math.sin(a);
  return { ...p, x: b.x + p.x * c + p.z * s, z: b.z - p.x * s + p.z * c };
}
export function buildingLocal(b: Building, p: BuildingPoint): BuildingPoint {
  const a = buildingYaw(b),
    c = Math.cos(a),
    s = Math.sin(a),
    x = p.x - b.x,
    z = p.z - b.z;
  return { ...p, x: x * c - z * s, z: x * s + z * c };
}
export const buildingDoorOffset = (b: Building) =>
  b.type === "jail" ? JAIL_DOOR_Z : (frontOf(b) * b.depth) / 2;
export const doorPosition = (index: number) => {
  const b = BUILDINGS[index],
    a = doorAngles[index];
  if (isMart(b)) {
    const p = martDoorPoint(0, a);
    return buildingWorld(b, p);
  }
  return buildingWorld(b, {
    x: -DOOR_WIDTH / 2 + (Math.cos(a) * DOOR_WIDTH) / 2,
    z: buildingDoorOffset(b) - (Math.sin(a) * DOOR_WIDTH) / 2,
  });
};
export function doorBlocksPoint(
  index: number,
  p: BuildingPoint,
  angle = doorAngles[index],
  radius = 0.32,
) {
  const building = BUILDINGS[index];
  if (isMart(building))
    return martDoorBlocked(0, buildingLocal(building, p), angle, radius);
  if ((p.y ?? 0) > 2.8) return false;
  const b = BUILDINGS[index],
    local = buildingLocal(b, p),
    dx = local.x + DOOR_WIDTH / 2,
    dz = local.z - buildingDoorOffset(b);
  const x = dx * Math.cos(angle) - dz * Math.sin(angle),
    z = dx * Math.sin(angle) + dz * Math.cos(angle);
  return x > -radius && x < DOOR_WIDTH + radius && Math.abs(z) < 0.07 + radius;
}
export function toggleDoor(index: number) {
  doorTargets[index] = !doorTargets[index];
}
export function resetDoors() {
  resetMartDoors();
  resetApartmentDoors();
  doorAngles.fill(0);
  doorTargets.fill(false);
}
export function animateDoors(dt: number, occupants: BuildingPoint[]) {
  for (let i = 0; i < BUILDINGS.length; i++) {
    const b = BUILDINGS[i];
    if (isCityApartments(b))
      animateApartmentDoors(
        i,
        dt,
        occupants.map((p) => buildingLocal(b, p)),
      );
    if (isMart(b))
      animateMartDoors(
        i,
        dt,
        occupants.map((p) => buildingLocal(b, p)),
      );
    const goal = doorTargets[i] ? (frontOf(BUILDINGS[i]) * Math.PI) / 2 : 0,
      delta = goal - doorAngles[i];
    if (Math.abs(delta) < 0.0001) {
      doorAngles[i] = goal;
      continue;
    }
    const next =
      doorAngles[i] +
      Math.sign(delta) *
        Math.min(Math.abs(delta), Math.max(0, Math.min(dt, 0.05)) * 4.5);
    if (!occupants.some((p) => doorBlocksPoint(i, p, next, 0.36)))
      doorAngles[i] = next;
  }
}
function createFixtures(index: number): Fixture[] {
  const b = BUILDINGS[index],
    x = b.width / 2,
    z = b.depth / 2;
  if (isCityApartments(b)) return structuredClone(apartmentFixtures);
  if (isNorthBuilding(b.type)) return northFixtures(b.type);
  switch (b.type) {
    case "district-diner":
      return [
        { kind: "counter", x: 3.8, z: 0, width: 1, depth: 5 },
        { kind: "bench", x: -3.5, z: -2, width: 2, depth: 0.55 },
        { kind: "table", x: -3.5, z: -0.7, width: 1.5, depth: 1.2 },
        { kind: "bench", x: -3.5, z: 1, width: 2, depth: 0.55 },
        { kind: "kitchen", x: 0, z: -4, width: 3, depth: 0.8 },
      ];
    case "district-market":
      return [
        { kind: "shelf", x: -5.5, z: 0, width: 1, depth: 6 },
        { kind: "shelf", x: 5.5, z: 0, width: 1, depth: 6 },
        { kind: "counter", x: 0, z: -4, width: 3, depth: 0.9 },
        { kind: "fridge", x: 4.5, z: -4.5, width: 1.4, depth: 0.8 },
      ];
    case "district-garage":
      return [
        { kind: "workbench", x: -3.5, z: 0, width: 1, depth: 4 },
        { kind: "rack", x: 3.5, z: 0, width: 1, depth: 4 },
        { kind: "cabinet", x: -3.8, z: -3.8, width: 0.8, depth: 1 },
        { kind: "table", x: 0, z: -3.5, width: 2, depth: 1 },
      ];
    case "district-clinic":
      return [
        { kind: "bed", x: -3.7, z: -2, width: 1.5, depth: 2.3 },
        { kind: "bed", x: 3.7, z: -2, width: 1.5, depth: 2.3 },
        { kind: "counter", x: 3.8, z: 3.5, width: 2, depth: 0.8 },
        { kind: "cabinet", x: -4.8, z: 3.7, width: 0.8, depth: 1 },
      ];
    case "military-command":
      return [
        { kind: "counter", x: -3, z: -2, width: 4, depth: 0.9 },
        { kind: "table", x: 2, z: -1, width: 2, depth: 1.3 },
        { kind: "cabinet", x: 4.8, z: -3.8, width: 0.8, depth: 1 },
        { kind: "bench", x: -4.5, z: 2, width: 1.6, depth: 0.6 },
      ];
    case "military-barracks":
      return [
        ...[-5.4, 5.4].flatMap((x) =>
          [-2.4, 0.8].map((z) => ({
            kind: "bed" as const,
            x,
            z,
            width: 1.5,
            depth: 2.3,
          })),
        ),
        { kind: "cabinet", x: 0, z: -3.8, width: 2, depth: 0.8 },
        { kind: "table", x: 0, z: 1, width: 2, depth: 1.2 },
      ];
    case "military-hangar":
      return [
        ...[-6.8, 6.8].map((x) => ({
          kind: "rack" as const,
          x,
          z: 0,
          width: 1.2,
          depth: 5.5,
        })),
        ...[-3, 3].map((x) => ({
          kind: "pallet" as const,
          x,
          z: 4.4,
          width: 1.4,
          depth: 1.2,
        })),
        { kind: "workbench", x: 0, z: 4.8, width: 2.7, depth: 1 },
      ];
    case "military-tent":
      return [
        ...[-2.5, 2.5].map((x) => ({
          kind: "bed" as const,
          x,
          z: -1.2,
          width: 1.5,
          depth: 2.3,
        })),
        { kind: "table", x: -2.1, z: 2.5, width: 1.2, depth: 0.7 },
        { kind: "cabinet", x: 2.8, z: 2.5, width: 0.7, depth: 0.8 },
      ];
    case "military-medical":
      return [
        ...[-2.4, 2.4].map((x) => ({
          kind: "bed" as const,
          x,
          z: -0.8,
          width: 1.5,
          depth: 2.3,
        })),
        { kind: "cabinet", x: -2.8, z: 2.6, width: 0.7, depth: 0.8 },
        { kind: "counter", x: 2.5, z: 2.5, width: 1.8, depth: 0.7 },
      ];
    case "district-duplex":
    case "district-offices":
    case "flats":
    case "tenement":
      return Array.from({ length: buildingStories(b) }, (_, floor) => [
        {
          kind:
            b.type === "district-offices"
              ? ("table" as const)
              : ("bed" as const),
          x: -3.3,
          z: -3.4,
          width: 1.5,
          depth: 2.3,
          y: floor * STORY_HEIGHT,
        },
        {
          kind: "table" as const,
          x: -3.2,
          z: 3.5,
          width: 1.2,
          depth: 0.8,
          y: floor * STORY_HEIGHT,
        },
        {
          kind: "cabinet" as const,
          x: -4.35,
          z: 4,
          width: 0.8,
          depth: 1,
          y: floor * STORY_HEIGHT,
        },
        {
          kind: "bench" as const,
          x: 1.4,
          z: 0,
          width: 1.2,
          depth: 0.5,
          y: floor * STORY_HEIGHT,
        },
      ]).flat();
    case "jail":
      return [
        ...[-5.3, 0, 5.3].map((at) => ({
          kind: "bed" as const,
          x: at,
          z: -5,
          width: 1.5,
          depth: 2.3,
        })),
        { kind: "bench", x: -6, z: 3.7, width: 2.2, depth: 0.6 },
        { kind: "counter", x: 6.6, z: 3.2, width: 1.4, depth: 0.9 },
        { kind: "cabinet", x: 6.8, z: 5.4, width: 0.8, depth: 1 },
      ];
    case "store":
      return [
        { kind: "shelf", x: -x + 1.05, z: 0, width: 1.1, depth: 4.8 },
        { kind: "shelf", x: x - 1.05, z: 0, width: 1.1, depth: 4.8 },
        { kind: "counter", x: 0, z: -z + 2, width: 3, depth: 0.85 },
        { kind: "fridge", x: x - 1.1, z: -z + 1, width: 1.4, depth: 0.75 },
      ];
    case "shelter":
      return [
        ...[-1, 1].flatMap((side) =>
          [-2, 1.1].map((at) => ({
            kind: "bed" as const,
            x: side * (x - 1.3),
            z: at,
            width: 1.5,
            depth: 2.3,
          })),
        ),
        { kind: "table", x: 0, z: 0, width: 2, depth: 1.2 },
        { kind: "bench", x: 0, z: -1.4, width: 2, depth: 0.55 },
        { kind: "kitchen", x: 0, z: -z + 0.7, width: 3.5, depth: 0.8 },
        { kind: "cabinet", x: -x + 0.7, z: -z + 1, width: 0.8, depth: 1.1 },
      ];
    case "workshop":
      return [
        { kind: "workbench", x: -x + 1, z: -0.3, width: 1.1, depth: 3.8 },
        { kind: "workbench", x: 0, z: -z + 0.8, width: 2.7, depth: 0.85 },
        { kind: "cabinet", x: x - 0.8, z: -z + 1.3, width: 0.9, depth: 1.6 },
        { kind: "table", x: x - 1.3, z: 1.1, width: 1.5, depth: 1.2 },
      ];
    case "home":
      return [
        { kind: "sofa", x: -x + 1.1, z: -1, width: 1, depth: 2.4 },
        { kind: "table", x: -1.3, z: -1, width: 1.1, depth: 1.1 },
        { kind: "bed", x: x - 1.3, z: 1.3, width: 1.6, depth: 2.3 },
        { kind: "cabinet", x: x - 0.8, z: -1.4, width: 0.8, depth: 1.4 },
        { kind: "kitchen", x: -1.2, z: z - 0.7, width: 3.6, depth: 0.8 },
        { kind: "table", x: 1.6, z: z - 1.1, width: 1.2, depth: 0.8 },
      ];
    default:
      return [
        { kind: "rack", x: -x + 1.1, z: 0, width: 1.2, depth: 4.8 },
        { kind: "rack", x: x - 1.1, z: 0, width: 1.2, depth: 4.8 },
        { kind: "pallet", x: -2, z: z - 1.2, width: 1.4, depth: 1.2 },
        { kind: "pallet", x: 0, z: z - 1.2, width: 1.4, depth: 1.2 },
        { kind: "workbench", x: 2.5, z: z - 0.8, width: 2, depth: 0.9 },
      ];
  }
}
export const STORY_HEIGHT = 3.2;
export function buildingStories(b: Building) {
  return b.type === "flats" || b.type === "district-duplex"
    ? 2
    : b.type === "tenement" ||
        b.type === "district-offices" ||
        isCityApartments(b)
      ? 3
      : 1;
}
type Stair = {
  x: number;
  startZ: number;
  run: number;
  width: number;
  y: number;
};
type Slab = { x: number; z: number; width: number; depth: number; y: number };
const stairCache = new Map<number, Stair[]>(),
  slabCache = new Map<number, Slab[]>();
export function buildingStairs(index: number): Stair[] {
  const cached = stairCache.get(index);
  if (cached) return cached;
  const b = BUILDINGS[index];
  const stairs = Array.from(
    { length: buildingStories(b) - (isCityApartments(b) ? 0 : 1) },
    (_, floor) => ({
      x: b.width / 2 - 1.35,
      startZ: frontOf(b) * (isCityApartments(b) ? 4 : 3.4),
      run: isCityApartments(b) ? 8 : 6,
      width: 1.8,
      y: floor * STORY_HEIGHT,
    }),
  );
  stairCache.set(index, stairs);
  return stairs;
}
export function buildingSlabs(index: number): Slab[] {
  const cached = slabCache.get(index);
  if (cached) return cached;
  const b = BUILDINGS[index],
    stair = buildingStairs(index)[0];
  if (!stair) {
    slabCache.set(index, []);
    return [];
  }
  const left = -b.width / 2 + 0.12,
    right = b.width / 2 - 0.12,
    holeLeft = stair.x - 1.05,
    holeRight = stair.x + 1.05;
  const holeMin = Math.min(stair.startZ, stair.startZ - frontOf(b) * stair.run),
    holeMax = Math.max(stair.startZ, stair.startZ - frontOf(b) * stair.run);
  const slabs = Array.from(
    { length: buildingStories(b) - (isCityApartments(b) ? 0 : 1) },
    (_, floor) => [
      {
        x: (left + holeLeft) / 2,
        z: 0,
        width: holeLeft - left,
        depth: b.depth - 0.24,
        y: (floor + 1) * STORY_HEIGHT,
      },
      {
        x: (holeRight + right) / 2,
        z: 0,
        width: right - holeRight,
        depth: b.depth - 0.24,
        y: (floor + 1) * STORY_HEIGHT,
      },
      {
        x: stair.x,
        z: (-b.depth / 2 + 0.12 + holeMin) / 2,
        width: 2.1,
        depth: holeMin + b.depth / 2 - 0.12,
        y: (floor + 1) * STORY_HEIGHT,
      },
      {
        x: stair.x,
        z: (b.depth / 2 - 0.12 + holeMax) / 2,
        width: 2.1,
        depth: b.depth / 2 - 0.12 - holeMax,
        y: (floor + 1) * STORY_HEIGHT,
      },
    ],
  ).flat();
  slabCache.set(index, slabs);
  return slabs;
}
function within(
  p: BuildingPoint,
  b: { x: number; z: number; width: number; depth: number },
  radius = 0,
) {
  return (
    Math.abs(p.x - b.x) <= b.width / 2 + radius &&
    Math.abs(p.z - b.z) <= b.depth / 2 + radius
  );
}
export function buildingSurface(p: BuildingPoint, maxHeight: number) {
  let y = 0;
  BUILDINGS.forEach((b, i) => {
    const local = buildingLocal(b, p);
    for (const slab of buildingSlabs(i))
      if (within(local, slab) && slab.y <= maxHeight + 0.001)
        y = Math.max(y, slab.y);
    for (const stair of buildingStairs(i)) {
      const progress = ((stair.startZ - local.z) * frontOf(b)) / stair.run;
      const top = stair.y + Math.max(0, Math.min(1, progress)) * STORY_HEIGHT;
      if (
        Math.abs(local.x - stair.x) <= stair.width / 2 &&
        progress >= 0 &&
        progress <= 1 &&
        top <= maxHeight + 0.001
      )
        y = Math.max(y, top);
    }
  });
  return y;
}
export function buildingCeiling(p: BuildingPoint, feet: number) {
  let ceiling = Infinity;
  BUILDINGS.forEach((b, i) => {
    if (isMart(b) && martInside(buildingLocal(b, p)) && feet < 4.04)
      ceiling = Math.min(ceiling, 4.04);
    if (buildingStories(b) < 2) {
      if (
        (b.type === "military-tent" || b.type === "military-medical") &&
        within(p, b)
      )
        ceiling = Math.min(
          ceiling,
          b.height - 0.15 - (Math.abs(p.x - b.x) / (b.width / 2)) * 1.1,
        );
      return;
    }
    const local = buildingLocal(b, p);
    for (const slab of buildingSlabs(i))
      if (within(local, slab, 0.12) && slab.y - 0.18 >= feet + 1.9 - 0.01)
        ceiling = Math.min(ceiling, slab.y - 0.18);
    for (const stair of buildingStairs(i)) {
      const progress = ((stair.startZ - local.z) * frontOf(b)) / stair.run;
      const underside = stair.y + progress * STORY_HEIGHT - 0.2;
      if (
        progress >= 0 &&
        progress <= 1 &&
        Math.abs(local.x - stair.x) < stair.width / 2 + 0.12 &&
        underside >= feet + 1.9 - 0.01
      )
        ceiling = Math.min(ceiling, underside);
    }
    if (isCityApartments(b)) {
      if (
        within(local, { x: 7.65, z: -0.8, width: 2.5, depth: 10.6 }) &&
        feet < 12.5
      )
        ceiling = Math.min(ceiling, 12.5);
    } else if (within(local, { x: 0, z: 0, width: b.width, depth: b.depth }))
      ceiling = Math.min(ceiling, b.height - 0.15);
  });
  return ceiling;
}
export const FURNITURE = BUILDINGS.map((_, i) => createFixtures(i));
export const fixtures = (index: number): Fixture[] =>
  isMart(BUILDINGS[index])
    ? martPlan.fixtures.map((f) => ({
        kind:
          f.kind === "retail-shelf"
            ? "shelf"
            : f.kind === "refrigerator"
              ? "fridge"
              : f.kind === "stock-boxes"
                ? "pallet"
                : "counter",
        x: (f.bounds.min[0] + f.bounds.max[0]) / 2,
        z: (f.bounds.min[2] + f.bounds.max[2]) / 2,
        width: f.bounds.max[0] - f.bounds.min[0],
        depth: f.bounds.max[2] - f.bounds.min[2],
      }))
    : FURNITURE[index];
export type Partition = {
  x: number;
  z: number;
  y?: number;
  width: number;
  depth: number;
  height: number;
};
function createPartitions(index: number): Partition[] {
  const b = BUILDINGS[index];
  if (isCityApartments(b)) return structuredClone(apartmentPartitions);
  if (b.type === "north-main-lab")
    return [
      { x: -8, z: 8.5, width: 0.2, depth: 7, height: 3.5 },
      ...[-16, -10].map((x) => ({
        x,
        z: 5,
        width: 4,
        depth: 0.2,
        height: 3.5,
      })),
      { x: 8, z: -8.5, width: 0.2, depth: 7, height: 3.5 },
      ...[10, 16].map((x) => ({ x, z: -5, width: 4, depth: 0.2, height: 3.5 })),
    ];
  if (b.type === "north-staff")
    return [{ x: 8, z: 2, width: 0.2, depth: 8, height: 3.2 }];
  if (b.type === "district-clinic")
    return [{ x: 0.7, z: 1.8, width: 0.18, depth: 3.8, height: 3.1 }];
  if (b.type === "military-command")
    return [{ x: 0.8, z: -2.5, width: 0.18, depth: 4, height: 3.1 }];
  if (buildingStories(b) > 1)
    return Array.from({ length: buildingStories(b) }, (_, floor) => [
      ...[-4, 0, 4].map((z) => ({
        x: -1.3,
        z,
        y: floor * STORY_HEIGHT,
        width: 0.16,
        depth: 2,
        height: STORY_HEIGHT - 0.18,
      })),
      {
        x: (-b.width / 2 + 0.12 - 1.3) / 2,
        z: 0,
        y: floor * STORY_HEIGHT,
        width: b.width / 2 - 1.3 - 0.12,
        depth: 0.16,
        height: STORY_HEIGHT - 0.18,
      },
    ]).flat();
  if (b.type === "jail")
    return [
      ...[-2.65, 2.65].map((x) => ({
        x,
        z: -4,
        width: 0.18,
        depth: 5.8,
        height: 3.1,
      })),
      ...[-5.3, 0, 5.3].flatMap((x) =>
        [-1, 1].map((side) => ({
          x: x + side * 1.65,
          z: -2,
          width: 2,
          depth: 0.12,
          height: 2.8,
        })),
      ),
    ];
  return b.type === "home"
    ? [
        { x: 0.9, z: -2.7, width: 0.16, depth: 3, height: 3.2 },
        { x: 0.9, z: 2.65, width: 0.16, depth: 3.7, height: 3.2 },
      ]
    : [];
}
const PARTITIONS = BUILDINGS.map((_, index) => createPartitions(index));
export function partitions(index: number) {
  return isMart(BUILDINGS[index]) ? [] : PARTITIONS[index];
}
export function buildingBlocked(
  p: BuildingPoint,
  radius = 0.32,
  ignoreDoors = false,
) {
  return BUILDINGS.some((b, i) => {
    if (!buildingEnabled(b)) return false;
    const odd = Math.abs(Math.sin(buildingYaw(b))) > 0.5,
      extentX = isMart(b) ? 7 : (odd ? b.depth : b.width) / 2,
      extentZ = isMart(b) ? 7 : (odd ? b.width : b.depth) / 2;
    if (
      Math.abs(p.x - b.x) > extentX + radius + 0.2 ||
      Math.abs(p.z - b.z) > extentZ + radius + 0.2
    )
      return false;
    const feet = p.y ?? 0;
    const { x, z } = buildingLocal(b, p),
      hx = b.width / 2,
      hz = b.depth / 2,
      front = frontOf(b);
    if (isMart(b))
      return (
        Math.abs(x) < 7 + radius &&
        Math.abs(z) < 7 + radius &&
        martBlocked(i, { x, z, y: feet }, radius, ignoreDoors, doorAngles[i])
      );
    if (Math.abs(x) > hx + radius + 0.2 || Math.abs(z) > hz + radius + 0.2)
      return false;
    if (b.type === "jail") {
      if (
        JAIL_BUILDING_WALLS.some(
          (w) =>
            feet + 1.9 > w.y &&
            feet < w.y + w.height &&
            Math.abs(x - w.x) < w.width / 2 + radius &&
            Math.abs(z - w.z) < w.depth / 2 + radius,
        )
      )
        return true;
    } else if (!isCityApartments(b) || feet < b.height) {
      if (
        Math.abs(Math.abs(x) - hx) < WALL / 2 + radius &&
        Math.abs(z) < hz + radius
      )
        return true;
      if (
        Math.abs(z + front * hz) < WALL / 2 + radius &&
        Math.abs(x) < hx + radius
      )
        return true;
      if (
        Math.abs(z - front * hz) < WALL / 2 + radius &&
        Math.abs(x) < hx + radius &&
        (feet > 2.8 || Math.abs(x) > DOOR_WIDTH / 2 - radius)
      )
        return true;
    }
    if (
      !ignoreDoors &&
      isCityApartments(b) &&
      apartmentDoors.some((_, id) =>
        apartmentDoorBlocked(i, id, { x, z, y: feet }, radius),
      )
    )
      return true;
    if (!ignoreDoors && doorBlocksPoint(i, p, doorAngles[i], radius))
      return true;
    if (
      partitions(i).some(
        (f) =>
          feet + 1.9 > (f.y ?? 0) &&
          feet < (f.y ?? 0) + f.height &&
          Math.abs(x - f.x) < f.width / 2 + radius &&
          Math.abs(z - f.z) < f.depth / 2 + radius,
      )
    )
      return true;
    if (
      buildingStairs(i).some((stair) => {
        const progress = ((stair.startZ - z) * frontOf(b)) / stair.run;
        const top = stair.y + progress * STORY_HEIGHT;
        if (
          progress > 0 &&
          progress < 1 &&
          feet < top + 0.9 &&
          feet + 1.9 > top &&
          [-1, 1].some(
            (side) =>
              Math.abs(x - (stair.x + side * (stair.width / 2 + 0.07))) <
              0.025 + radius,
          )
        )
          return true;
        return (
          Math.abs(x - stair.x) < stair.width / 2 + radius &&
          progress > 0 &&
          progress < 1 &&
          feet + 1.9 > stair.y + progress * STORY_HEIGHT - 0.2 &&
          feet < stair.y + progress * STORY_HEIGHT - 0.45
        );
      })
    )
      return true;
    return fixtures(i).some(
      (f) =>
        feet + 1.9 > (f.y ?? 0) &&
        feet < (f.y ?? 0) + 1.9 &&
        Math.abs(x - f.x) < f.width / 2 + radius &&
        Math.abs(z - f.z) < f.depth / 2 + radius,
    );
  });
}
export function containingBuilding(p: BuildingPoint) {
  return BUILDINGS.findIndex(
    (b) =>
      buildingEnabled(b) &&
      Math.abs(buildingLocal(b, p).x) < b.width / 2 - WALL / 2 &&
      Math.abs(buildingLocal(b, p).z) < b.depth / 2 - WALL / 2 &&
      !(
        b.type === "jail" &&
        inJailCourtyard(buildingLocal(b, p).x, buildingLocal(b, p).z)
      ) &&
      (!isMart(b) || martInside(buildingLocal(b, p))),
  );
}

/** Reuse an existing furnished prefab without changing its dimensions or door orientation. */
export function copyCityBuilding(
  source: number,
  x: number,
  z: number,
  name: string,
) {
  const template = BUILDINGS[source],
    b = { ...template, x, z, name };
  const index = BUILDINGS.push(b) - 1;
  BUILDING_FRONTS.set(b, frontOf(template));
  doorAngles.push(0);
  doorTargets.push(false);
  FURNITURE.push(structuredClone(FURNITURE[source]));
  PARTITIONS.push(structuredClone(PARTITIONS[source]));
  return index;
}
export function truncateCityBuildings(length: number) {
  for (const key of stairCache.keys())
    if (key >= length) stairCache.delete(key);
  for (const key of slabCache.keys()) if (key >= length) slabCache.delete(key);
  resetApartmentDoors();
  BUILDINGS.splice(length);
  doorAngles.splice(length);
  doorTargets.splice(length);
  FURNITURE.splice(length);
  PARTITIONS.splice(length);
}

/** Append a new prefab after legacy building and loot identities have been assigned. */
export function addCityBuilding(b: Building) {
  const index = BUILDINGS.push({ ...b }) - 1;
  BUILDING_FRONTS.set(BUILDINGS[index], 1);
  doorAngles.push(0);
  doorTargets.push(false);
  FURNITURE.push(createFixtures(index));
  PARTITIONS.push(createPartitions(index));
  return index;
}
