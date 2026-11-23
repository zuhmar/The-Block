import { onIsland } from "./coast";
import type { Fixture } from "./building-layout";
type Point = { x: number; z: number };
export const NORTH_LAB = {
  x: -80,
  z: -188,
  width: 120,
  depth: 100,
  enabled: true,
};
const specs = [
  ["north-main-lab", "NORTH WORKS · MAIN LAB", -33, 0, 36, 24, 5.4, 0xb65e43],
  [
    "north-workshop",
    "NORTH WORKS · MAINTENANCE",
    -43,
    -36,
    22,
    16,
    4.8,
    0x5b7079,
  ],
  ["north-warehouse", "NORTH WORKS · WAREHOUSE", -1, -32, 38, 20, 6, 0x348d91],
  ["north-secondary-lab", "NORTH WORKS · ANNEX", 41, -32, 24, 18, 5, 0xb86348],
  ["north-packing", "NORTH WORKS · PACKING", 41, 0, 26, 18, 5.4, 0x32868d],
  ["north-security", "NORTH WORKS · SECURITY", -44, 38, 12, 10, 3.7, 0xb9aa83],
  ["north-staff", "NORTH WORKS · STAFF", 35, 38, 28, 12, 4.2, 0xb56547],
] as const;
export const NORTH_BUILDINGS = specs.map(
  ([type, name, x, z, width, depth, height, color]) => ({
    type,
    name,
    x: NORTH_LAB.x + x,
    z: NORTH_LAB.z + z,
    width,
    depth,
    height,
    color,
  }),
);
export const isNorthBuilding = (type: string) => type.startsWith("north-");
export const northFront = (type: string) =>
  type === "north-security" || type === "north-staff" ? -1 : 1;
export function northBounds() {
  const n = NORTH_LAB;
  return { minX: n.x - 60, maxX: n.x + 60, minZ: n.z - 50, maxZ: n.z + 50 };
}
export const northEntry = () => ({ x: NORTH_LAB.x, z: NORTH_LAB.z + 50 });
export function inNorthLab(p: Point, margin = 0) {
  const b = northBounds();
  return (
    NORTH_LAB.enabled &&
    p.x > b.minX - margin &&
    p.x < b.maxX + margin &&
    p.z > b.minZ - margin &&
    p.z < b.maxZ + margin
  );
}
/** Default northern-shore placement; alternative northern sites protect previously saved bases. */
export function configureNorthLab(pieces: Point[]) {
  let site: Point | undefined;
  for (const p of [
    { x: -80, z: -188 },
    { x: -140, z: -178 },
    { x: -60, z: -188 },
    { x: -110, z: -182 },
    { x: -150, z: -156 },
    { x: -65, z: -172 },
  ]) {
    if (
      ![-60, 0, 60].every((dx) =>
        [-50, 0, 50].every((dz) => onIsland({ x: p.x + dx, z: p.z + dz }, 3)),
      )
    )
      continue;
    if (
      pieces.some((s) => Math.abs(s.x - p.x) < 64 && Math.abs(s.z - p.z) < 54)
    )
      continue;
    site = p;
    break;
  }
  NORTH_LAB.enabled = !!site;
  const next = site ?? { x: -80, z: -188 },
    dx = next.x - NORTH_LAB.x,
    dz = next.z - NORTH_LAB.z;
  NORTH_LAB.x = next.x;
  NORTH_LAB.z = next.z;
  NORTH_BUILDINGS.forEach((b) => {
    b.x += dx;
    b.z += dz;
  });
  return NORTH_LAB.enabled;
}
export type YardProp = {
  kind: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: number;
};
export const NORTH_PROPS: YardProp[] = [];
const prop = (
  kind: string,
  x: number,
  z: number,
  width: number,
  depth: number,
  height: number,
  color = 0x687d79,
) => NORTH_PROPS.push({ kind, x, z, width, depth, height, color });
prop("van", -28, 25, 2.4, 5.5, 2.4, 0x343944);
prop("forklift", 20, 12, 1.5, 2.5, 2.1, 0xdca732);
for (const [x, z] of [
  [56.5, 19],
  [56.5, 34],
])
  prop("container", x, z, 5.5, 12, 2.8, z === 19 ? 0xae4c38 : 0x368d92);
for (const [x, z] of [
  [-53, -12],
  [-53, -8],
  [-12, -15],
  [53, -19],
  [56, -24],
  [-22, -43],
  [22, -43],
  [-40, -22],
  [-44, -22],
  [36, 22],
  [40, 22],
])
  prop("pallet", x, z, 2, 1.7, 1.35, 0xd79c50);
for (const [x, z] of [
  [-24, -35],
  [23, -35],
  [15, -6],
  [-24, 16],
])
  prop("parcel", x, z, 1.7, 1.4, 1.15, 0xd89c4e);
for (const [x, z] of [
  [-13, 7],
  [-10, 7],
  [-7, 7],
  [45, 17],
  [45, 20],
  [42, 17],
])
  prop("barrel", x, z, 0.9, 0.9, 1.2, x < 0 ? 0x386d9b : 0xb74b37);
for (const [x, z] of [
  [-14, 14],
  [57, -5],
])
  prop("dumpster", x, z, 2.5, 1.4, 1.5, 0x4f795d);
for (const [x, z] of [
  [-10, 15],
  [-8, 15],
  [57, 0],
])
  prop("bin", x, z, 0.65, 0.75, 1.1, 0x64766f);
for (const [x, z] of [
  [-20, 14],
  [-57, -38],
  [50, -12],
])
  prop("generator", x, z, 2.5, 1.4, 1.5, 0xd7a333);
for (const b of specs) {
  const x = b[2],
    z = b[3],
    d = b[5];
  for (const dx of [-3, 0])
    prop(
      "ac",
      x + dx,
      z - northFront(b[0]) * (d / 2 + 1.1),
      1.3,
      0.65,
      1,
      0xb4b5a7,
    );
}
for (const [x, z] of [
  [-56, 23],
  [-12, 30],
  [56, 41],
  [-56, -46],
  [25, -46],
])
  prop("lamp", x, z, 0.2, 0.2, 5, 0x454e55);
export type NorthBox = Point & { width: number; depth: number; height: number };
let boxCache: NorthBox[] = [];
let boxKey = "";
export function northYardBoxes(): NorthBox[] {
  if (!NORTH_LAB.enabled) return [];
  const { x, z } = NORTH_LAB;
  const key = `${x},${z}`;
  if (boxKey === key) return boxCache;
  boxKey = key;
  return (boxCache = [
    { x: x - 60, z, width: 0.18, depth: 100, height: 2.7 },
    { x: x + 60, z: z - 46, width: 0.18, depth: 8, height: 2.7 },
    { x: x + 60, z: z + 8, width: 0.18, depth: 84, height: 2.7 },
    { x, z: z - 50, width: 120, depth: 0.18, height: 2.7 },
    ...[-1, 1].map((s) => ({
      x: x + s * 32.5,
      z: z + 50,
      width: 55,
      depth: 0.18,
      height: 2.7,
    })),
    ...[-5.5, 5.5].map((dx) => ({
      x: x + dx,
      z: z + 50,
      width: 0.6,
      depth: 0.6,
      height: 3.2,
    })),
    ...NORTH_PROPS.map((p) => ({ ...p, x: p.x + x, z: p.z + z })),
  ]);
}
export function northBlocked(p: Point, r = 0.32, feet = 0) {
  if (!inNorthLab(p, 4)) return false;
  return northYardBoxes().some(
    (b) =>
      feet < b.height &&
      feet + 1.9 > 0 &&
      Math.abs(p.x - b.x) < b.width / 2 + r &&
      Math.abs(p.z - b.z) < b.depth / 2 + r,
  );
}
export function northFixtures(type: string): Fixture[] {
  if (type === "north-main-lab" || type === "north-secondary-lab")
    return [
      ...[-1, 1].flatMap((s) =>
        [-3, 3].map((z) => ({
          kind: "counter" as const,
          x: s * (type === "north-main-lab" ? 6 : 4),
          z,
          width: 3,
          depth: 1.4,
        })),
      ),
      {
        kind: "shelf",
        x: type === "north-main-lab" ? -15 : -9,
        z: -6,
        width: 1.2,
        depth: 5,
      },
      {
        kind: "cabinet",
        x: type === "north-main-lab" ? 11 : 8,
        z: -8,
        width: 1.6,
        depth: 1.6,
      },
      ...(type === "north-main-lab"
        ? [
            { kind: "table" as const, x: -13, z: 9, width: 3, depth: 1.4 },
            { kind: "cabinet" as const, x: -16, z: 9, width: 0.9, depth: 1.2 },
            { kind: "counter" as const, x: 16, z: -9, width: 3, depth: 1.2 },
          ]
        : []),
    ];
  if (type === "north-warehouse")
    return [-12, -6, 6, 12].flatMap((x) => [
      { kind: "rack" as const, x, z: -1, width: 1.5, depth: 10 },
      { kind: "pallet" as const, x, z: -7.5, width: 2, depth: 1.7 },
    ]);
  if (type === "north-workshop")
    return [
      { kind: "table", x: 3, z: 4, width: 3, depth: 1.2 },
      { kind: "workbench", x: -7, z: 0, width: 1.2, depth: 8 },
      { kind: "rack", x: 7, z: 0, width: 1.2, depth: 8 },
      { kind: "cabinet", x: 0, z: -5, width: 3, depth: 1 },
    ];
  if (type === "north-packing")
    return [
      { kind: "cabinet", x: -10, z: -6, width: 1, depth: 2.3 },
      { kind: "counter", x: -7, z: 0, width: 1.5, depth: 8 },
      { kind: "rack", x: 8, z: -2, width: 1.5, depth: 9 },
      { kind: "pallet", x: 5, z: 5, width: 2, depth: 1.7 },
    ];
  if (type === "north-security")
    return [
      { kind: "table", x: 2, z: -2, width: 2, depth: 1 },
      { kind: "bench", x: 3, z: 0, width: 1.5, depth: 0.6 },
      { kind: "counter", x: -3, z: 0, width: 1, depth: 5 },
      { kind: "cabinet", x: 3, z: 2, width: 0.9, depth: 1.5 },
    ];
  return [
    { kind: "kitchen", x: -8, z: 3.5, width: 6, depth: 1 },
    { kind: "table", x: -6, z: 0, width: 3, depth: 1.5 },
    { kind: "bench", x: -6, z: 1.7, width: 3, depth: 0.6 },
    { kind: "table", x: 3, z: 0, width: 3, depth: 1.5 },
    { kind: "cabinet", x: 11, z: 2, width: 1.2, depth: 4 },
  ];
}

export function northSurface(p: Point, maxHeight: number) {
  if (!inNorthLab(p)) return 0;
  let y = 0;
  const boxes = northYardBoxes();
  for (let i = 8; i < boxes.length; i++) {
    const b = boxes[i];
    if (
      b.height <= maxHeight &&
      Math.abs(p.x - b.x) <= b.width / 2 &&
      Math.abs(p.z - b.z) <= b.depth / 2
    )
      y = Math.max(y, b.height);
  }
  return y;
}
