import { buildingFootprint } from "./building-layout";
import { COMPACT, CITY_PLOTS } from "./compact-plan";
import {
  BUILDINGS,
  LOOT,
  inTown,
  blockedTerrain,
  roadDistance,
  pieceBox,
  pieceBase,
  type Piece,
} from "./world";
import { buildingEnabled } from "./building-layout";
import {
  inPlot,
  leaseStatus,
  type HousingPlot,
  type SurvivalState,
} from "./survival-state";
export function createHousingPlots(pieces: Piece[]): HousingPlot[] {
  if (COMPACT.active)
    return CITY_PLOTS.filter(
      (plot) =>
        !pieces.some(
          (p) =>
            Math.abs(p.x - plot.x) < plot.width / 2 + 2 &&
            Math.abs(p.z - plot.z) < plot.depth / 2 + 2,
        ),
    ).map((p) => ({ ...p }));
  const candidates: { x: number; z: number }[] = [];
  for (let x = -176; x <= 176; x += 8)
    for (let z = -176; z <= 176; z += 8)
      if (Math.hypot(x, z) > 65 && Math.hypot(x, z) < 185)
        candidates.push({ x, z });
  candidates.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
  const result: HousingPlot[] = [];
  for (const center of candidates) {
    const size = result.length % 3 === 2 ? 24 : 16,
      r = size / 2;
    if (
      result.some(
        (p) =>
          Math.abs(p.x - center.x) < p.width / 2 + r + 12 &&
          Math.abs(p.z - center.z) < p.depth / 2 + r + 12,
      )
    )
      continue;
    let clear = true;
    for (let dx = -r; dx <= r; dx += 2)
      for (let dz = -r; dz <= r; dz += 2) {
        const p = { x: center.x + dx, z: center.z + dz };
        if (inTown(p) || blockedTerrain(p, 1) || roadDistance(p) < 7)
          clear = false;
      }
    if (
      !clear ||
      [
        ...BUILDINGS.filter(buildingEnabled).map(buildingFootprint),
        ...LOOT,
        ...pieces.map(pieceBox),
      ].some(
        (b) =>
          Math.abs(b.x - center.x) < b.width / 2 + r + 2 &&
          Math.abs(b.z - center.z) < b.depth / 2 + r + 2,
      )
    )
      continue;
    result.push({
      id: "plot-" + (result.length + 1),
      ...center,
      width: size,
      depth: size,
      price: size === 16 ? 300 : 700,
      daily: size === 16 ? 25 : 60,
    });
    if (result.length === 12) break;
  }
  return result;
}
export function housingPlacementReason(
  s: SurvivalState,
  p: Omit<Piece, "id">,
  pieces: Piece[],
  now: number,
) {
  const plot = s.plots.find((a) => a.id === s.lease?.plotId);
  if (!plot || ["none", "forfeited"].includes(leaseStatus(s, now)))
    return "Buy a housing plot before building";
  const box = pieceBox({ ...p, id: "preview" });
  if (
    Math.abs(box.x - plot.x) + box.width / 2 > plot.width / 2 + 0.001 ||
    Math.abs(box.z - plot.z) + box.depth / 2 > plot.depth / 2 + 0.001
  )
    return "Keep the entire structure inside your plot";
  const height =
    p.kind === "wall" || p.kind === "doorway"
      ? 2.5
      : p.kind === "door"
        ? 2.1
        : p.kind === "foundation"
          ? 0.5
          : p.kind === "floor"
            ? 0.18
            : 3;
  if (pieceBase(p, pieces) + height > 9) return "Housing height limit: 9 m";
  if (pieces.filter((p) => inPlot(p, plot)).length >= 100)
    return "Plot budget reached: 100 structures";
  return "";
}
