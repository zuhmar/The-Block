export const WEST_QUARTER = { minX: -188, maxX: -126, minZ: -26, maxZ: 28 };
export function inWestQuarter(p: { x: number; z: number }) {
  return (
    p.x > WEST_QUARTER.minX &&
    p.x < WEST_QUARTER.maxX &&
    p.z > WEST_QUARTER.minZ &&
    p.z < WEST_QUARTER.maxZ
  );
}
/** Bins sit beside traffic lanes, clear of entrances and the bridge deck. */
export const ROAD_BINS = [
  { x: -55, z: 7.9 },
  { x: -45, z: 0.1 },
  { x: 24, z: 6.9 },
  { x: 31.25, z: 8.49 },
  ...[-10, 10].flatMap((x) => [-18.1, 18.1].map((z) => ({ x, z }))),
  ...[-21.1, 21.1].flatMap((x) => [-3, 8].map((z) => ({ x, z }))),
  { x: 58, z: 10.9 },
  { x: 72, z: 10.9 },
  { x: 103, z: 3.1 },
  ...[-184, -168, -146, -128].flatMap((x) =>
    [-3.9, 3.9].map((z) => ({ x, z })),
  ),
];
export const BIN_SPECS = {
  metal: { width: 0.6, depth: 0.6, height: 0.95, reward: 8 },
  wheelie: { width: 0.65, depth: 0.7, height: 1.1, reward: 12 },
  litter: { width: 0.65, depth: 0.65, height: 1, reward: 10 },
};
export type BinKind = keyof typeof BIN_SPECS;
