export type HarborBox = {
  x: number;
  z: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  role: string;
};
export const HARBOR = { minX: -120, maxX: 2, minZ: 195, maxZ: 275 };
export const HARBOR_ENTRY = { x: -60, z: 207 };
export const inHarbor = (p: { x: number; z: number }) =>
  p.x > HARBOR.minX &&
  p.x < HARBOR.maxX &&
  p.z > HARBOR.minZ &&
  p.z < HARBOR.maxZ;
export const PIERS = [-99, -60, -21].map((x) => ({
  x,
  z: 251,
  width: 6,
  depth: 36,
}));
export const DECKS = [
  { x: -60, z: 231, width: 116, depth: 6 },
  ...PIERS,
  ...PIERS.map((p) => ({ x: p.x, z: 267, width: 12, depth: 4 })),
];
export const onDock = (p: { x: number; z: number }, radius = 0.32) =>
  DECKS.some(
    (b) =>
      Math.abs(p.x - b.x) < b.width / 2 - radius &&
      Math.abs(p.z - b.z) < b.depth / 2 - radius,
  );
export const CONTAINERS = [
  ...[-104, -84, -35, -15].flatMap((x, i) =>
    [206, 219].map((z, j) => ({
      x,
      z,
      y: 0,
      width: i % 2 ? 6.1 : 12.2,
      depth: 2.44,
      height: 2.59,
      color: (i + j) % 4,
    })),
  ),
  ...[-104, -35].map((x, i) => ({
    x,
    z: 219,
    y: 2.59,
    width: 12.2,
    depth: 2.44,
    height: 2.59,
    color: i + 2,
  })),
  { x: -104, z: 226, y: 0, width: 6.1, depth: 2.44, height: 2.59, color: 1 },
  { x: -15, z: 226, y: 0, width: 6.1, depth: 2.44, height: 2.59, color: 3 },
];
export const HARBOR_BOXES: HarborBox[] = CONTAINERS.map((b) => ({
  ...b,
  role: "container",
}));
const add = (
  role: string,
  x: number,
  z: number,
  width: number,
  depth: number,
  height: number,
  y = 0,
) => HARBOR_BOXES.push({ role, x, z, width, depth, height, y });
// Port office is an open-door room; no new building indices or saved crate indices.
add("office wall", -115, 198, 0.2, 6, 3.4);
add("office wall", -107, 198, 0.2, 6, 3.4);
add("office wall", -111, 195, 8, 0.2, 3.4);
for (const x of [-113.6, -108.4]) add("office entrance", x, 201, 2.8, 0.2, 3.4);
add("office lintel", -111, 201, 2.4, 0.2, 1, 2.4);
add("office roof", -111, 198, 8.5, 6.5, 0.25, 3.4);
add("office desk", -113, 197, 1.5, 0.8, 0.9);
for (const x of [-95, -89]) add("crane support", x, 230, 0.55, 0.55, 12);
for (const x of [-116, -80, -42, -4])
  add("bollard", x, 231, 0.6, 0.6, 0.7, 0.18);
for (const x of [-103, -96, -38, -31, -11])
  add("pallet cargo", x, 211.5, 1.6, 1.4, 1.5);
for (const x of [-111, -109, -107, -31, -29])
  add("barrel", x, 223, 0.65, 0.65, 1);
add("forklift", -40, 229, 1.8, 3.2, 2.7);
add("workbench", -10, 198, 3, 1, 0.9);
// Rails prevent walking off the finger piers; every deck entry stays open.
for (const p of PIERS) {
  for (const side of [-1, 1])
    add("dock rail", p.x + side * 2.9, 250, 0.12, 31, 1.05, 0.18);
  add("dock rail", p.x, 269, 12, 0.12, 1.05, 0.18);
}
export function harborBlocked(
  p: { x: number; z: number },
  feet = 0,
  radius = 0.32,
) {
  return HARBOR_BOXES.some(
    (b) =>
      feet < b.y + b.height - 0.01 &&
      feet + 1.9 > b.y + 0.01 &&
      Math.abs(p.x - b.x) < b.width / 2 + radius &&
      Math.abs(p.z - b.z) < b.depth / 2 + radius,
  );
}
export const harborSurface = (p: { x: number; z: number }, max = Infinity) =>
  onDock(p, 0) && max >= 0.18 ? 0.18 : 0;
