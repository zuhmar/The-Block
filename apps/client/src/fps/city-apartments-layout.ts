import propCatalog from "./models/apartment-props/catalog.json";
import type { BuildingPoint, Fixture, Partition } from "./building-layout";

/** A separate, metre-authored prefab. Existing tenement assets/layouts stay intact. */
export const CITY_APARTMENTS = {
  x: -100,
  z: 6,
  width: 18,
  depth: 16,
  height: 9.6,
  color: 0xb86a4b,
  name: "WEST COURT APARTMENTS",
  type: "city-apartments",
};
export const isCityApartments = (b: { type: string }) =>
  b.type === "city-apartments";
export const apartmentDoors = [
  ...Array.from({ length: 3 }, (_, floor) =>
    [-4, 3].map((z, unit) => ({
      x: 3.8,
      z: z - 0.7,
      y: floor * 3.2,
      yaw: -Math.PI / 2,
      width: 1.4,
      height: 2.55,
      label: `APARTMENT ${floor + 1}0${unit + 1}`,
    })),
  ).flat(),
  {
    x: 6.5,
    z: -5.85,
    y: 9.6,
    yaw: -Math.PI / 2,
    width: 1.4,
    height: 2.55,
    label: "ROOFTOP EXIT",
  },
];
export type ApartmentProp = keyof typeof propCatalog;
export const apartmentPropCatalog = propCatalog;
function prop(
  asset: ApartmentProp,
  kind: Fixture["kind"],
  x: number,
  z: number,
  y: number,
  rotation = 0,
): Fixture {
  const dimensions = propCatalog[asset],
    odd = Math.abs(Math.sin(rotation)) > 0.5;
  return {
    asset,
    kind,
    x,
    z,
    y: y + 0.025,
    rotation,
    width: odd ? dimensions.depth : dimensions.width,
    depth: odd ? dimensions.width : dimensions.depth,
    height: dimensions.height,
  };
}
export const apartmentFixtures: Fixture[] = Array.from(
  { length: 3 },
  (_, floor) =>
    [-1, 1].flatMap((side) => {
      const y = floor * 3.2,
        rear = side < 0,
        tableZ = rear ? -2.1 : 1.55;
      return [
        prop("apartment-bed", "bed", -6.5, rear ? -6 : 1.5, y),
        prop(
          "apartment-wardrobe",
          "cabinet",
          -8.1,
          rear ? -1.4 : 4.8,
          y,
          -Math.PI / 2,
        ),
        prop(
          "apartment-sofa",
          "sofa",
          1.1,
          rear ? -1.05 : 1,
          y,
          rear ? 0 : Math.PI,
        ),
        prop("apartment-table", "table", -1.5, tableZ, y),
        prop("apartment-chair", "bench", -2.47, tableZ, y, -Math.PI / 2),
        prop("apartment-chair", "bench", -0.53, tableZ, y, Math.PI / 2),
        prop(
          "apartment-kitchen",
          "kitchen",
          0.5,
          rear ? -7.2 : 5.35,
          y,
          rear ? Math.PI : 0,
        ),
        prop(
          "apartment-fridge",
          "fridge",
          2.2,
          rear ? -7.15 : 5.3,
          y,
          rear ? Math.PI : 0,
        ),
        prop(
          "apartment-tv-stand",
          "cabinet",
          -1.9,
          rear ? -5.55 : 4.55,
          y,
          rear ? Math.PI : 0,
        ),
      ];
    }),
).flat();
export const apartmentPartitions: Partition[] = [];
function wall(
  x: number,
  z: number,
  width: number,
  depth: number,
  y: number,
  height = 3.02,
) {
  apartmentPartitions.push({ x, z, width, depth, y, height });
}
for (let floor = 0; floor < 3; floor++) {
  const y = floor * 3.2;
  // Apartment entrance wall: genuine openings with lintels, then a private bedroom in each unit.
  for (const [a, b] of [
    [-7.88, -4.8],
    [-3.2, 2.2],
    [3.8, 6],
  ])
    wall(3.8, (a + b) / 2, 0.18, b - a, y);
  for (const z of [-4, 3]) wall(3.8, z, 0.18, 1.6, y + 2.65, 0.37);
  wall(-2.5, 0, 12.6, 0.18, y);
  wall(-2.5, 6, 12.6, 0.18, y);
  for (const [a, b] of [
    [-7.88, -4.9],
    [-3.1, 2.1],
    [3.9, 6],
  ])
    wall(-3, (a + b) / 2, 0.16, b - a, y);
  for (const z of [-4, 3]) wall(-3, z, 0.16, 1.8, y + 2.7, 0.32);
}
// Solid roof guard and stair enclosure. The west-side door opens onto the roof landing.
for (const x of [-9, 9]) wall(x, 0, 0.24, 16, 9.6, 1.1);
for (const z of [-8, 8]) wall(0, z, 18, 0.24, 9.6, 1.1);
wall(8.8, -0.8, 0.2, 10.6, 9.6, 2.9);
for (const [a, b] of [
  [-6.1, -5.95],
  [-4.35, 4.5],
])
  wall(6.5, (a + b) / 2, 0.2, b - a, 9.6, 2.9);
wall(6.5, -5.15, 0.2, 1.6, 12.25, 0.25);
for (const z of [-6.1, 4.5]) wall(7.65, z, 2.5, 0.2, 9.6, 2.9);
// AC plinths share the same physical bounds as the visible rooftop utilities.
wall(-5, -4, 1.8, 1.6, 9.6, 1.4);
wall(-5, 2, 1.2, 1.2, 9.6, 1.2);

const states = new Map<number, { angles: number[]; targets: boolean[] }>();
export function apartmentDoorState(index: number) {
  let s = states.get(index);
  if (!s) {
    s = {
      angles: apartmentDoors.map(() => 0),
      targets: apartmentDoors.map(() => false),
    };
    states.set(index, s);
  }
  return s;
}
export function resetApartmentDoors() {
  states.clear();
}
export function apartmentDoorPoint(index: number, id: number) {
  const d = apartmentDoors[id],
    a = d.yaw + apartmentDoorState(index).angles[id];
  return {
    x: d.x + (Math.cos(a) * d.width) / 2,
    z: d.z - (Math.sin(a) * d.width) / 2,
    y: d.y,
  };
}
export function apartmentDoorBlocked(
  index: number,
  id: number,
  p: BuildingPoint,
  radius = 0.32,
  angle = apartmentDoorState(index).angles[id],
) {
  const d = apartmentDoors[id];
  if ((p.y ?? 0) + 1.9 <= d.y || (p.y ?? 0) >= d.y + d.height) return false;
  const a = d.yaw + angle,
    dx = p.x - d.x,
    dz = p.z - d.z;
  const x = dx * Math.cos(a) - dz * Math.sin(a),
    z = dx * Math.sin(a) + dz * Math.cos(a);
  return x > -radius && x < d.width + radius && Math.abs(z) < 0.07 + radius;
}
export function animateApartmentDoors(
  index: number,
  dt: number,
  occupants: BuildingPoint[],
) {
  const s = apartmentDoorState(index);
  s.angles.forEach((angle, id) => {
    const target = s.targets[id] ? -Math.PI / 2 : 0,
      delta = target - angle;
    const next =
      angle +
      Math.sign(delta) *
        Math.min(Math.abs(delta), Math.max(0, Math.min(dt, 0.05)) * 4.5);
    if (!occupants.some((p) => apartmentDoorBlocked(index, id, p, 0.36, next)))
      s.angles[id] = next;
  });
}
