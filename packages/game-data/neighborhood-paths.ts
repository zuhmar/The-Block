import {
  BUILDINGS,
  DISTRICTS,
  PARKS,
  type MapObject,
  type MapPoint,
} from "../shared/src/official-map.js";
import {
  MARKET_QUARTER,
  inMarketQuarter,
} from "../shared/src/market-quarter.js";
import {
  mapObjects,
  roadOverlapsRect,
  terrainRectBlocked,
  mapObstacleEnabled,
  mapObjectEnabled,
} from "../shared/src/terrain.js";
import {
  groundFootprint,
  type PlacementRect,
} from "../shared/src/map-placement.js";
import { propVisual } from "./map-visuals.js";
export interface NeighborhoodPath {
  id: string;
  district: string;
  buildings: MapObject[];
  points: MapPoint[];
  width: number;
  material: "concrete" | "service" | "dirt";
}
export const pathRects = (points: MapPoint[], width: number): PlacementRect[] =>
  points.slice(1).map((b, i) => ({
    x: Math.min(points[i].x, b.x) - width / 2,
    y: Math.min(points[i].y, b.y) - width / 2,
    width: Math.abs(points[i].x - b.x) + width,
    height: Math.abs(points[i].y - b.y) + width,
  }));
const overlaps = (a: PlacementRect, b: PlacementRect) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;
let cache: NeighborhoodPath[] | undefined;
export function neighborhoodPaths(): NeighborhoodPath[] {
  if (cache) return cache;
  const occupied = mapObjects()
    .map(propVisual)
    .filter((o) => o && !["mountain", "cliff", "waterfall"].includes(o.kind))
    .map((o) => groundFootprint(o!));
  const buildings = BUILDINGS.map((b) => ({
    x: b.x - b.width / 2 - 8,
    y: b.y - b.height / 2 - 8,
    width: b.width + 16,
    height: b.height + 16,
  }));
  const parks = PARKS.map((p) => ({
    x: p.x - p.width / 2 - 32,
    y: p.y - p.height / 2 - 32,
    width: p.width + 64,
    height: p.height + 64,
  }));
  const blocked = (r: PlacementRect) =>
    roadOverlapsRect(r, 12) ||
    terrainRectBlocked(r) ||
    overlaps(r, MARKET_QUARTER.bounds) ||
    parks.some((p) => overlaps(r, p)) ||
    buildings.some((b) => overlaps(r, b)) ||
    occupied.some((o) => overlaps(r, o));
  const paths: NeighborhoodPath[] = [],
    degree = new Map<string, number>();
  for (const d of DISTRICTS) {
    if (d.id === "downtown") continue; // Already a joined commercial surface with authored circulation.
    const group = BUILDINGS.filter(
      (b) =>
        !b.id.startsWith("legacy") &&
        !inMarketQuarter(b) &&
        b.x >= d.x &&
        b.x < d.x + d.width &&
        b.y >= d.y &&
        b.y < d.y + d.height,
    );
    const pairs = group
      .flatMap((a, i) =>
        group
          .slice(i + 1)
          .filter((b) => Math.hypot(a.x - b.x, a.y - b.y) <= 900)
          .map((b) => ({
            a,
            b,
            distance: Math.abs(a.x - b.x) + Math.abs(a.y - b.y),
          })),
      )
      .sort(
        (a, b) =>
          a.distance - b.distance ||
          a.a.id.localeCompare(b.a.id) ||
          a.b.id.localeCompare(b.b.id),
      );
    for (const { a, b } of pairs) {
      if ((degree.get(a.id) || 0) >= 2 || (degree.get(b.id) || 0) >= 2)
        continue;
      const width = d.id === "industrial" ? 64 : 48;
      const start = {
          x: Math.round(a.x / 16) * 16,
          y: Math.ceil((a.y + a.height / 2 + width / 2 + 24) / 16) * 16,
        },
        end = {
          x: Math.round(b.x / 16) * 16,
          y: Math.ceil((b.y + b.height / 2 + width / 2 + 24) / 16) * 16,
        };
      const candidates: MapPoint[][] = [];
      for (const y of [
        Math.max(start.y, end.y),
        Math.max(start.y, end.y) + 64,
        Math.min(start.y, end.y),
      ])
        candidates.push([start, { x: start.x, y }, { x: end.x, y }, end]);
      for (const x of [
        Math.ceil((Math.max(a.x + a.width / 2, b.x + b.width / 2) + 48) / 16) *
          16,
        Math.floor((Math.min(a.x - a.width / 2, b.x - b.width / 2) - 48) / 16) *
          16,
      ])
        candidates.push([start, { x, y: start.y }, { x, y: end.y }, end]);
      const options = candidates
        .map((points) =>
          points.filter(
            (p, i) => !i || p.x !== points[i - 1].x || p.y !== points[i - 1].y,
          ),
        )
        .map((points) => ({
          points,
          length: points
            .slice(1)
            .reduce(
              (sum, p, i) =>
                sum + Math.abs(p.x - points[i].x) + Math.abs(p.y - points[i].y),
              0,
            ),
        }))
        .filter(
          (r) =>
            r.length >= 96 &&
            r.length <= 1152 &&
            !pathRects(r.points, width + 8).some(blocked),
        )
        .sort((a, b) => a.length - b.length);
      if (!options.length) continue;
      paths.push({
        id: `neighborhood-${a.id}-${b.id}`,
        district: d.id,
        buildings: [a, b],
        points: options[0].points,
        width,
        material:
          d.id === "industrial"
            ? "service"
            : d.id === "uptown"
              ? "dirt"
              : "concrete",
      });
      degree.set(a.id, (degree.get(a.id) || 0) + 1);
      degree.set(b.id, (degree.get(b.id) || 0) + 1);
    }
  }
  cache = paths;
  return cache;
}
export const neighborhoodPathEnabled = (p: NeighborhoodPath) =>
  p.buildings.every(mapObjectEnabled) &&
  pathRects(p.points, p.width + 8).every(mapObstacleEnabled);
