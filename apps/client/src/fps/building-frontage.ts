import { isMart, martDoorPoint } from "./block-mart-layout";
import { BUILDINGS, ROADS, blocked, pavedWidth, type Point } from "./world";
import { CITY_PLOTS, inRect } from "./compact-plan";
import {
  BUILDING_YAWS,
  buildingWorld,
  buildingYaw,
  buildingFootprint,
  frontOf,
  buildingDoorOffset,
  type Building,
} from "./building-layout";
export type Frontage = {
  index: number;
  yaw: number;
  door: Point;
  street: Point;
  distance: number;
  roadWidth: number;
};
export const CITY_FRONTAGES: Frontage[] = [];
export function frontageOptions(index: number) {
  const b = BUILDINGS[index],
    angles =
      b.type === "city-apartments"
        ? [0]
        : [0, Math.PI / 2, -Math.PI / 2, Math.PI];
  const options: Frontage[] = [];
  const previous = buildingYaw(b);
  for (const yaw of angles) {
    BUILDING_YAWS.set(b, yaw);
    const bounds = buildingFootprint(b);
    if (
      BUILDINGS.some((other) => {
        if (other === b) return false;
        const r = buildingFootprint(other);
        return (
          Math.abs(r.x - b.x) < (r.width + bounds.width) / 2 + 0.3 &&
          Math.abs(r.z - b.z) < (r.depth + bounds.depth) / 2 + 0.3
        );
      }) ||
      CITY_PLOTS.some(
        (r) =>
          Math.abs(r.x - b.x) < (r.width + bounds.width) / 2 + 1 &&
          Math.abs(r.z - b.z) < (r.depth + bounds.depth) / 2 + 1,
      )
    )
      continue;
    const door = buildingWorld(
        b,
        isMart(b) ? martDoorPoint(0, 0) : { x: 0, z: buildingDoorOffset(b) },
      ),
      nx = isMart(b) ? Math.cos(yaw - Math.PI / 4) : Math.sin(yaw) * frontOf(b),
      nz = isMart(b) ? Math.sin(Math.PI / 4 - yaw) : Math.cos(yaw) * frontOf(b);
    for (const road of ROADS)
      for (let i = 1; i < road.length; i++) {
        const a = road[i - 1],
          c = road[i];
        let t = Infinity,
          dx = 0,
          dz = 0;
        if (
          Math.abs(nx) > 0.65 &&
          Math.abs(a.x - c.x) < 0.01 &&
          door.z >= Math.min(a.z, c.z) &&
          door.z <= Math.max(a.z, c.z)
        ) {
          dx = Math.sign(nx);
          t = (a.x - door.x) / dx;
        }
        if (
          Math.abs(nz) > 0.65 &&
          Math.abs(a.z - c.z) < 0.01 &&
          door.x >= Math.min(a.x, c.x) &&
          door.x <= Math.max(a.x, c.x)
        ) {
          dz = Math.sign(nz);
          t = (a.z - door.z) / dz;
        }
        if (t < pavedWidth(road) / 2 + 0.5 || t > 65) continue;
        let clear = true;
        for (let d = 0.65; d <= t; d += 0.3) {
          const p = { x: door.x + dx * d, z: door.z + dz * d };
          if (
            blocked(p, [], 0, true) ||
            CITY_PLOTS.some((plot) => inRect(p, plot, 0.5))
          ) {
            clear = false;
            break;
          }
        }
        if (clear)
          options.push({
            index,
            yaw,
            door,
            street: { x: door.x + dx * t, z: door.z + dz * t },
            distance: t,
            roadWidth: pavedWidth(road),
          });
      }
  }
  BUILDING_YAWS.set(b, previous);
  return options.sort(
    (a, b) => a.distance - b.distance || Math.abs(a.yaw) - Math.abs(b.yaw),
  );
}
export function orientCityFrontages(onRotate: (b: Building) => void) {
  CITY_FRONTAGES.splice(0);
  BUILDINGS.forEach((b, index) => {
    if (
      b.type === "jail" ||
      b.type.startsWith("north-") ||
      b.type.startsWith("military-")
    )
      return;
    const selected = frontageOptions(index)[0];
    if (!selected) return;
    BUILDING_YAWS.set(b, selected.yaw);
    onRotate(b);
    CITY_FRONTAGES.push(selected);
  });
}
