import {
  BUILDINGS,
  DISTRICTS,
  type MapObject,
  PARKS,
  CIVIC_PLAZA,
} from "../shared/src/official-map.js";
import {
  nearestRoadPoint,
  mapObjectEnabled,
  mapObjects,
  blockSpaces,
  PLAZA_GARDENS,
} from "../shared/src/terrain.js";
import { segmentRect } from "../shared/src/index.js";
export const districtFor = (p: { x: number; y: number }) =>
  DISTRICTS.find(
    (d) =>
      p.x >= d.x && p.x < d.x + d.width && p.y >= d.y && p.y < d.y + d.height,
  );
export const frontageStyle = (b: MapObject) => {
  const district = districtFor(b)?.id || "the-block";
  return {
    district,
    material: district === "industrial" ? "gravel" : "concrete",
    walkWidth: district === "downtown" ? 72 : district === "uptown" ? 44 : 52,
    apron: district === "industrial" ? 52 : district === "downtown" ? 36 : 20,
  };
};
let connections:
  | { building: MapObject; points: { x: number; y: number }[]; width: number }[]
  | undefined;
export function streetConnections() {
  if (connections) return connections;
  connections = [];
  for (const b of BUILDINGS) {
    const start = { x: b.x, y: b.y + b.height / 2 + 3 },
      road = nearestRoadPoint(start);
    if (road.distance > 740 || road.distance < road.width / 2) continue;
    const length = road.distance,
      end = {
        x: road.x - ((road.x - start.x) / length) * (road.width / 2 + 7),
        y: road.y - ((road.y - start.y) / length) * (road.width / 2 + 7),
      };
    const side = b.x + b.width / 2 + 40;
    const points =
      end.y < b.y + b.height / 2
        ? [
            start,
            { x: start.x, y: start.y + 26 },
            { x: side, y: start.y + 26 },
            { x: side, y: end.y },
            end,
          ]
        : [
            start,
            { x: start.x, y: start.y + 26 },
            { x: end.x, y: start.y + 26 },
            end,
          ];
    if (
      BUILDINGS.some(
        (o) =>
          o.id !== b.id &&
          points.slice(1).some((p, i) =>
            segmentRect(points[i], p, {
              x: o.x - o.width / 2 - 8,
              y: o.y - o.height / 2 - 8,
              width: o.width + 16,
              height: o.height + 16,
            }),
          ),
      )
    )
      continue;
    connections.push({
      building: b,
      points,
      width: frontageStyle(b).walkWidth,
    });
  }
  return connections;
}
export interface CitySurface {
  id: string;
  buildings: MapObject[];
  points: { x: number; y: number }[];
  material: "concrete" | "gravel";
  alley?: boolean;
  court?: boolean;
  service?: boolean;
}
let surfaces: CitySurface[] | undefined;
// Ground geometry is shared by the playable renderer and map preview exporter.
export function citySurfaces(): CitySurface[] {
  if (surfaces) return surfaces;
  surfaces = [];
  for (const b of BUILDINGS) {
    const district = districtFor(b);
    if (!district || district.id === "uptown" || b.id.startsWith("legacy"))
      continue;
    const pad = district.id === "downtown" ? 32 : 18;
    const left = { x: b.x - b.width / 2 - pad, y: b.y + b.height / 2 + 12 };
    const right = { x: b.x + b.width / 2 + pad, y: left.y };
    const a = nearestRoadPoint(left),
      z = nearestRoadPoint(right);
    // Only a south-facing road can form the shop's pedestrian forecourt.
    if (a.distance < 360 && z.distance < 360 && a.y > left.y && z.y > right.y) {
      surfaces.push({
        id: "forecourt-" + b.id,
        buildings: [b],
        material: district.id === "industrial" ? "gravel" : "concrete",
        points: [left, right, { x: z.x, y: z.y }, { x: a.x, y: a.y }],
      });
    }
  }
  for (const space of blockSpaces()) {
    surfaces.push({
      id: space.id,
      buildings: space.buildings,
      material: space.kind === "service" ? "gravel" : "concrete",
      alley: space.kind === "alley",
      court: space.kind === "courtyard",
      service: space.kind === "service",
      points: [
        { x: space.x, y: space.y },
        { x: space.x + space.width, y: space.y },
        { x: space.x + space.width, y: space.y + space.height },
        { x: space.x, y: space.y + space.height },
      ],
    });
  }
  return surfaces;
}
let paving:
  | { x: number; y: number; width: number; height: number }[]
  | undefined;
export function cityPaving() {
  if (paving) return paving;
  paving = [];
  const district = DISTRICTS.find((d) => d.id === "downtown")!;
  for (let y = district.y; y < district.y + district.height; y += 64) {
    let start: number | undefined;
    for (let x = district.x; x <= district.x + district.width; x += 64) {
      const p = { x: x + 32, y: y + 32 };
      const occupied =
        x < district.x + district.width &&
        BUILDINGS.some(
          (b) =>
            districtFor(b)?.id === "downtown" &&
            Math.abs(b.x - p.x) < b.width / 2 + 96 &&
            Math.abs(b.y - p.y) < b.height / 2 + 80,
        ) &&
        !PARKS.some(
          (r) =>
            Math.hypot(
              (p.x - r.x) / (r.width / 2 + 32),
              (p.y - r.y) / (r.height / 2 + 32),
            ) < 1,
        );
      if (occupied && start === undefined) start = x;
      if (!occupied && start !== undefined) {
        paving.push({ x: start, y, width: x - start, height: 64 });
        start = undefined;
      }
    }
  }
  return paving;
}
export function paintCityFrontage(
  ctx: CanvasRenderingContext2D,
  bounds: { x: number; y: number; width: number; height: number },
  materials: {
    concrete: CanvasPattern;
    gravel: CanvasPattern;
    dirt: CanvasPattern;
    grass: CanvasPattern;
    pavers: CanvasPattern;
    service: CanvasPattern;
  },
) {
  const near = (b: { x: number; y: number }) =>
    b.x > bounds.x - 800 &&
    b.x < bounds.x + bounds.width + 800 &&
    b.y > bounds.y - 800 &&
    b.y < bounds.y + bounds.height + 800;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Joined rows form a continuous commercial surface instead of overlapping pads.
  ctx.fillStyle = materials.concrete;
  for (const r of cityPaving()) {
    if (
      r.x > bounds.x + bounds.width ||
      r.x + r.width < bounds.x ||
      r.y > bounds.y + bounds.height ||
      r.y + r.height < bounds.y
    )
      continue;
    ctx.fillRect(r.x, r.y, r.width, r.height);
  }
  const tiles = new Set(
    cityPaving().flatMap((r) =>
      Array.from({ length: r.width / 64 }, (_, i) => `${r.x + i * 64},${r.y}`),
    ),
  );
  ctx.strokeStyle = "#687578";
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (const key of tiles) {
    const [x, y] = key.split(",").map(Number);
    if (
      x < bounds.x - 64 ||
      x > bounds.x + bounds.width ||
      y < bounds.y - 64 ||
      y > bounds.y + bounds.height
    )
      continue;
    for (const [dx, dy, ax, ay, bx, by] of [
      [0, -64, 0, 0, 64, 0],
      [0, 64, 0, 64, 64, 64],
      [-64, 0, 0, 0, 0, 64],
      [64, 0, 64, 0, 64, 64],
    ]) {
      if (tiles.has(`${x + dx},${y + dy}`)) continue;
      ctx.moveTo(x + ax, y + ay);
      ctx.lineTo(x + bx, y + by);
    }
  }
  ctx.stroke();
  const plaza = CIVIC_PLAZA;
  if (near({ x: plaza.x + plaza.width / 2, y: plaza.y + plaza.height / 2 })) {
    ctx.fillStyle = materials.pavers;
    ctx.beginPath();
    ctx.roundRect(plaza.x, plaza.y, plaza.width, plaza.height, 28);
    ctx.fill();
    ctx.strokeStyle = "#727d7d";
    ctx.lineWidth = 7;
    ctx.stroke();
    for (const x of [plaza.x + 44, plaza.x + plaza.width - 172]) {
      ctx.fillStyle = "#868e74";
      ctx.fillRect(x - 5, plaza.y + 86, 138, 74);
      ctx.fillStyle = materials.grass;
      ctx.fillRect(x, plaza.y + 91, 128, 64);
    }
  }
  for (const r of PLAZA_GARDENS) {
    if (!near(r)) continue;
    ctx.fillStyle = "#92967b";
    ctx.beginPath();
    ctx.roundRect(r.x - 6, r.y - 6, r.width + 12, r.height + 12, 18);
    ctx.fill();
    ctx.fillStyle = materials.grass;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.width, r.height, 14);
    ctx.fill();
  }
  for (const surface of citySurfaces()) {
    if (
      !surface.buildings.some(near) ||
      !surface.buildings.every(mapObjectEnabled)
    )
      continue;
    ctx.beginPath();
    surface.points.forEach((p, i) =>
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
    );
    ctx.closePath();
    ctx.fillStyle = surface.service
      ? materials.service
      : surface.court
        ? materials.pavers
        : materials[surface.material];
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#718082";
    ctx.stroke();
    if (surface.court) {
      const a = surface.points[0],
        b = surface.points[2];
      ctx.fillStyle = materials.pavers;
      ctx.fillRect(a.x + 8, a.y + 8, b.x - a.x - 16, b.y - a.y - 16);
      // Planted center keeps a generous route down both sides of the shared court.
      ctx.fillStyle = materials.grass;
      ctx.beginPath();
      ctx.roundRect((a.x + b.x) / 2 - 36, (a.y + b.y) / 2 - 26, 72, 52, 12);
      ctx.fill();
    }
    if (surface.service) {
      const a = surface.points[0],
        b = surface.points[2];
      ctx.strokeStyle = "#c6ac68";
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 10]);
      ctx.strokeRect(a.x + 16, a.y + 16, b.x - a.x - 32, b.y - a.y - 32);
      ctx.setLineDash([]);
    }
    if (surface.alley) {
      // Narrow service lanes and drain seams read as alleys, not lawns.
      const a = surface.points[0],
        b = surface.points[2],
        center = (a.x + b.x) / 2;
      ctx.fillStyle = materials.service;
      ctx.fillRect(center - 18, a.y, 36, b.y - a.y);
      ctx.strokeStyle = "#535f5b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(center, a.y);
      ctx.lineTo(center, b.y);
      ctx.stroke();
      for (let y = a.y + 24; y < b.y; y += 80) {
        ctx.fillStyle = "#444f4c";
        ctx.fillRect(center - 12, y, 24, 6);
      }
    }
  }
  for (const car of mapObjects().filter(
    (o) => o.asset === "map-street-sedan" || o.asset === "map-street-van",
  )) {
    if (!near(car) || !mapObjectEnabled(car)) continue;
    const x = car.x - car.width / 2 - 14,
      y = car.y - car.height / 2 - 12,
      w = car.width + 28,
      h = car.height + 24;
    ctx.fillStyle = materials.service;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#e3dfbd";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.stroke();
  }
  for (const p of PARKS) {
    if (!near(p)) continue;
    ctx.fillStyle = materials.grass;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.width / 2, p.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const c of streetConnections()) {
    if (!near(c.building) || !mapObjectEnabled(c.building)) continue;
    ctx.beginPath();
    c.points.forEach((p, i) =>
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
    );
    ctx.strokeStyle = materials.concrete;
    ctx.lineWidth = c.width + 8;
    ctx.stroke();
    ctx.strokeStyle = materials.concrete;
    ctx.lineWidth = c.width;
    ctx.stroke();
  }
  for (const b of BUILDINGS) {
    if (!near(b) || !mapObjectEnabled(b)) continue;
    const s = frontageStyle(b),
      pad = s.apron,
      x = b.x - b.width / 2 - pad,
      y = b.y - b.height / 2 - 12,
      w = b.width + pad * 2,
      h = b.height + pad + 32;
    ctx.fillStyle =
      s.material === "gravel" ? materials.service : materials.concrete;
    ctx.beginPath();
    ctx.roundRect(
      x,
      y,
      w,
      h,
      s.district === "uptown" ? 24 : s.district === "downtown" ? 0 : 8,
    );
    ctx.fill();
    const shop = ["cafe", "laundry", "grocery", "books"].find(
      (n) => b.asset === "map-building-" + n,
    );
    if (shop) {
      const colors: Record<string, string> = {
        cafe: "#b66d57",
        laundry: "#698eab",
        grocery: "#78915b",
        books: "#a7895b",
      };
      // A restrained entry strip ties each shop's awning palette to its forecourt.
      ctx.fillStyle = colors[shop];
      ctx.fillRect(b.x - 30, b.y + b.height / 2 + 6, 60, 12);
    }
    if (s.district === "industrial") {
      ctx.strokeStyle = "#d2b968";
      ctx.lineWidth = 4;
      ctx.setLineDash([18, 14]);
      ctx.strokeRect(x + 12, b.y + b.height / 2 + 12, w - 24, 32);
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = s.district === "uptown" ? "#788c60" : "#718082";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 8, y + h - 4);
      ctx.lineTo(x + w - 8, y + h - 4);
      ctx.stroke();
    }
    if (Math.floor(b.x + b.y) % 4 === 0) {
      const gx = x + 14,
        gy = y + h - 16;
      ctx.fillStyle = "#536064";
      ctx.fillRect(gx, gy, 22, 10);
      ctx.fillStyle = "#909b99";
      for (let d = 3; d < 20; d += 4) ctx.fillRect(gx + d, gy + 2, 1, 6);
    }
  }
  ctx.restore();
}
