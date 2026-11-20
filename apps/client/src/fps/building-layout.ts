export const BUILDINGS = [
  {
    x: -13,
    z: -10,
    width: 10,
    depth: 10,
    height: 4.4,
    color: 0xe6cba4,
    name: "GENERAL STORE",
    type: "store",
  },
  {
    x: 3,
    z: -12,
    width: 12,
    depth: 12,
    height: 5.2,
    color: 0xc4d5c4,
    name: "THE HAVEN",
    type: "shelter",
  },
  {
    x: 19,
    z: -8,
    width: 9,
    depth: 8,
    height: 4.2,
    color: 0xdcae8d,
    name: "WORKSHOP",
    type: "workshop",
  },
  {
    x: -19,
    z: 14,
    width: 9,
    depth: 9,
    height: 4.6,
    color: 0xc6c9d2,
    name: "OLD RESIDENCE",
    type: "home",
  },
  {
    x: 18,
    z: 19,
    width: 12,
    depth: 9,
    height: 5.3,
    color: 0xb5c2b2,
    name: "WAREHOUSE",
    type: "warehouse",
  },
];
export type Building = (typeof BUILDINGS)[number];
export type BuildingPoint = { x: number; z: number };
export type Fixture = {
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
};
export const DOOR_WIDTH = 1.6,
  OPENING_WIDTH = 1.8,
  WALL = 0.22;
export const doorAngles = BUILDINGS.map(() => 0);
export const doorTargets = BUILDINGS.map(() => false);
export const frontOf = (b: Building) => (b.z < 0 ? 1 : -1);
export const doorPosition = (index: number) => {
  const b = BUILDINGS[index],
    a = doorAngles[index];
  return {
    x: b.x - DOOR_WIDTH / 2 + (Math.cos(a) * DOOR_WIDTH) / 2,
    z: b.z + (frontOf(b) * b.depth) / 2 - (Math.sin(a) * DOOR_WIDTH) / 2,
  };
};
export function doorBlocksPoint(
  index: number,
  p: BuildingPoint,
  angle = doorAngles[index],
  radius = 0.32,
) {
  const b = BUILDINGS[index],
    dx = p.x - (b.x - DOOR_WIDTH / 2),
    dz = p.z - (b.z + (frontOf(b) * b.depth) / 2);
  const x = dx * Math.cos(angle) - dz * Math.sin(angle),
    z = dx * Math.sin(angle) + dz * Math.cos(angle);
  return x > -radius && x < DOOR_WIDTH + radius && Math.abs(z) < 0.07 + radius;
}
export function toggleDoor(index: number) {
  doorTargets[index] = !doorTargets[index];
}
export function resetDoors() {
  doorAngles.fill(0);
  doorTargets.fill(false);
}
export function animateDoors(dt: number, occupants: BuildingPoint[]) {
  for (let i = 0; i < BUILDINGS.length; i++) {
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
  switch (b.type) {
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
export const FURNITURE = BUILDINGS.map((_, i) => createFixtures(i));
export const fixtures = (index: number) => FURNITURE[index];
export function partitions(index: number) {
  const b = BUILDINGS[index];
  return b.type === "home"
    ? [
        { x: 0.9, z: -2.7, width: 0.16, depth: 3, height: 3.2 },
        { x: 0.9, z: 2.65, width: 0.16, depth: 3.7, height: 3.2 },
      ]
    : [];
}
export function buildingBlocked(p: BuildingPoint, radius = 0.32) {
  return BUILDINGS.some((b, i) => {
    const x = p.x - b.x,
      z = p.z - b.z,
      hx = b.width / 2,
      hz = b.depth / 2,
      front = frontOf(b);
    if (Math.abs(x) > hx + radius + 0.2 || Math.abs(z) > hz + radius + 0.2)
      return false;
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
      Math.abs(x) > DOOR_WIDTH / 2 - radius
    )
      return true;
    if (doorBlocksPoint(i, p, doorAngles[i], radius)) return true;
    if (
      partitions(i).some(
        (f) =>
          Math.abs(x - f.x) < f.width / 2 + radius &&
          Math.abs(z - f.z) < f.depth / 2 + radius,
      )
    )
      return true;
    return fixtures(i).some(
      (f) =>
        Math.abs(x - f.x) < f.width / 2 + radius &&
        Math.abs(z - f.z) < f.depth / 2 + radius,
    );
  });
}
export function containingBuilding(p: BuildingPoint) {
  return BUILDINGS.findIndex(
    (b) =>
      Math.abs(p.x - b.x) < b.width / 2 - WALL / 2 &&
      Math.abs(p.z - b.z) < b.depth / 2 - WALL / 2,
  );
}
