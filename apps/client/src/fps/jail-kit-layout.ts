/** Local, metre-based jail-island assembly. Renderer exports and physics share this plan. */
export const JAIL_KIT_LIMIT = 17;
export const JAIL_KIT_BUILDING_Z = -5;
export const JAIL_KIT_TOWERS = [-14, 14].flatMap((x) =>
  [-14, 14].map((z) => ({
    x,
    z,
    front: Math.sign(z),
    width: 3,
    depth: 3,
    y: 3.2,
  })),
);
export const JAIL_KIT_PROPS = [
  { kind: "bench", x: -10, z: 11, width: 2, depth: 0.65, height: 0.9 },
  { kind: "picnic-table", x: -10, z: 8.5, width: 2, depth: 2, height: 0.9 },
  { kind: "pullup-bars", x: 9, z: 10, width: 2, depth: 2, height: 2.6 },
  { kind: "weight-bench", x: 7, z: 14, width: 2, depth: 1.5, height: 1.2 },
  { kind: "trash-bin", x: -10, z: 15, width: 0.65, depth: 0.65, height: 1 },
  {
    kind: "basketball-hoop",
    x: -5,
    z: 8.5,
    width: 0.2,
    depth: 0.2,
    height: 3.3,
  },
] as const;
export const JAIL_KIT_GATEHOUSE = {
  x: -7,
  z: 15,
  width: 3,
  depth: 3,
  height: 2.8,
};
export const JAIL_KIT_GATES = [
  { id: "vehicle", x: 0, z: 17, width: 4 },
  { id: "pedestrian", x: 7, z: 17, width: 2 },
] as const;
