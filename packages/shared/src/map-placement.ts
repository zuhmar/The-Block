import type { MapObject, MapPoint } from "./official-map.js";
export interface PlacementRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export const STRUCTURE_GRID = 64,
  DETAIL_GRID = 16;
export function gridEnvelope(
  rect: PlacementRect,
  grid = DETAIL_GRID,
): PlacementRect {
  const x = Math.floor(rect.x / grid) * grid,
    y = Math.floor(rect.y / grid) * grid;
  return {
    x,
    y,
    width: Math.ceil((rect.x + rect.width) / grid) * grid - x,
    height: Math.ceil((rect.y + rect.height) / grid) * grid - y,
  };
}
export const isPublicPlanter = (o: MapObject) =>
  /^plaza-garden-\d+$/.test(o.id) ||
  o.id.startsWith("court-planter-") ||
  o.id.startsWith("plaza-plant-");
export function groundFootprint(o: MapObject): PlacementRect {
  let width = o.width,
    height = o.height,
    y = o.y;
  if (o.kind === "tree") {
    width = 28;
    height = 24;
  }
  if (isPublicPlanter(o)) {
    width = 64;
    height = 32;
  }
  if (o.asset === "map-prop-4") {
    width = 24;
    height = 16;
    y += o.height / 2 - 8;
  }
  return { x: o.x - width / 2, y: y - height / 2, width, height };
}
export class PlacementGrid {
  private occupied = new Set<string>();
  private cells(rect: PlacementRect) {
    const r = gridEnvelope(rect);
    const cells: string[] = [];
    for (let y = r.y; y < r.y + r.height; y += DETAIL_GRID)
      for (let x = r.x; x < r.x + r.width; x += DETAIL_GRID)
        cells.push(`${x},${y}`);
    return cells;
  }
  overlaps(rect: PlacementRect) {
    return this.cells(rect).some((cell) => this.occupied.has(cell));
  }
  reserve(rect: PlacementRect) {
    for (const cell of this.cells(rect)) this.occupied.add(cell);
  }
}
export function routeFootprints(
  points: MapPoint[],
  width: number,
): PlacementRect[] {
  return points.slice(1).map((b, i) => {
    const a = points[i];
    return gridEnvelope({
      x: Math.min(a.x, b.x) - width / 2,
      y: Math.min(a.y, b.y) - width / 2,
      width: Math.abs(a.x - b.x) + width,
      height: Math.abs(a.y - b.y) + width,
    });
  });
}
export const isFixedScenery = (o: MapObject) =>
  /^(dock-|crane-)/.test(o.id) ||
  (o.kind !== "decoration" &&
    !(o.kind === "rock" && o.asset.startsWith("map-prop-")));
export interface PlacementReport {
  moved: string[];
  omitted: string[];
}
export function fitDetailProps(
  objects: MapObject[],
  reserved: PlacementRect[],
  blocked: (rect: PlacementRect) => boolean,
): { objects: MapObject[]; report: PlacementReport } {
  const grid = new PlacementGrid(),
    report: PlacementReport = { moved: [], omitted: [] };
  for (const r of reserved) grid.reserve(r);
  for (const o of objects.filter(isFixedScenery))
    grid.reserve(groundFootprint(o));
  const keep = new Set(objects.filter(isFixedScenery).map((o) => o.id));
  const priority = (o: MapObject) =>
    o.id.startsWith("market-")
      ? 0
      : o.solid
        ? 1
        : /^(court-|plaza-|park-)/.test(o.id)
          ? 2
          : o.asset === "map-prop-4"
            ? 4
            : 3;
  const details = objects
    .filter((o) => !isFixedScenery(o))
    .sort((a, b) => priority(a) - priority(b) || a.id.localeCompare(b.id));
  const offsets: [number, number][] = [[0, 0]];
  for (let r = DETAIL_GRID; r <= 64; r += DETAIL_GRID)
    for (let y = -r; y <= r; y += DETAIL_GRID)
      for (let x = -r; x <= r; x += DETAIL_GRID)
        if (Math.max(Math.abs(x), Math.abs(y)) === r) offsets.push([x, y]);
  for (const o of details) {
    if (o.id.startsWith("market-flowers-")) {
      report.omitted.push(o.id);
      continue;
    }
    const original = { x: o.x, y: o.y },
      foot = groundFootprint(o),
      center = { x: foot.x + foot.width / 2, y: foot.y + foot.height / 2 };
    const dx = Math.round(center.x / DETAIL_GRID) * DETAIL_GRID - center.x,
      dy = Math.round(center.y / DETAIL_GRID) * DETAIL_GRID - center.y;
    let placed = false;
    for (const [ox, oy] of offsets) {
      const candidate = {
          ...o,
          x: original.x + dx + ox,
          y: original.y + dy + oy,
        },
        r = gridEnvelope(groundFootprint(candidate));
      if (grid.overlaps(r) || blocked(r)) continue;
      Object.assign(o, candidate);
      grid.reserve(r);
      keep.add(o.id);
      placed = true;
      if (o.x !== original.x || o.y !== original.y) report.moved.push(o.id);
      break;
    }
    if (!placed) report.omitted.push(o.id);
  }
  return { objects: objects.filter((o) => keep.has(o.id)), report };
}
