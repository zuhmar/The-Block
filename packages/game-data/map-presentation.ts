import {
  neighborhoodPaths,
  neighborhoodPathEnabled,
} from "./neighborhood-paths.js";
import {
  groundFootprint,
  isPublicPlanter,
  gridEnvelope,
} from "../shared/src/map-placement.js";
import {
  MARKET_QUARTER,
  inMarketQuarter,
} from "../shared/src/market-quarter.js";
import {
  BUILDINGS,
  DISTRICTS,
  type MapObject,
  PARKS,
  CIVIC_PLAZA,
} from "../shared/src/official-map.js";
import {
  nearestRoadPoint,
  buildingWalkways,
  mapObjectEnabled,
  mapObjects,
  blockSpaces,
} from "../shared/src/terrain.js";
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
    apron: district === "industrial" ? 36 : district === "downtown" ? 16 : 12,
  };
};
export const streetConnections = buildingWalkways;
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
  const tiles = new Set<string>(),
    protectedLawn = (x: number, y: number) =>
      PARKS.some(
        (r) =>
          Math.hypot(
            (x + 32 - r.x) / (r.width / 2 + 32),
            (y + 32 - r.y) / (r.height / 2 + 32),
          ) < 1,
      );
  for (let y = district.y; y < district.y + district.height; y += 64)
    for (let x = district.x; x < district.x + district.width; x += 64) {
      if (
        !protectedLawn(x, y) &&
        BUILDINGS.some(
          (b) =>
            districtFor(b)?.id === "downtown" &&
            Math.abs(b.x - x - 32) < b.width / 2 + 96 &&
            Math.abs(b.y - y - 32) < b.height / 2 + 80,
        )
      )
        tiles.add(`${x},${y}`);
    }
  // Join the civic plaza and its existing raised planters into the same surface.
  // An exposed curb must not cut through the base of an existing planter.
  const anchors = [
    CIVIC_PLAZA,
    ...mapObjects()
      .filter(
        (o) =>
          districtFor(o)?.id === "downtown" &&
          (isPublicPlanter(o) || o.asset === "map-street-planter"),
      )
      .map((o) => gridEnvelope(groundFootprint(o), 64)),
  ];
  for (const r of anchors)
    for (let y = r.y; y < r.y + r.height; y += 64)
      for (let x = r.x; x < r.x + r.width; x += 64)
        if (!protectedLawn(x, y)) tiles.add(`${x},${y}`);
  // Close only one- or two-cell slivers enclosed by paving. Keep broad lawns open.
  for (let pass = 0; pass < 2; pass++) {
    const infill = new Set<string>();
    for (const key of tiles) {
      const [x, y] = key.split(",").map(Number);
      for (const [dx, dy] of [
        [64, 0],
        [0, 64],
      ])
        for (const gap of [1, 2]) {
          if (!tiles.has(`${x + dx * (gap + 1)},${y + dy * (gap + 1)}`))
            continue;
          for (let i = 1; i <= gap; i++) {
            const px = x + dx * i,
              py = y + dy * i;
            if (!protectedLawn(px, py)) infill.add(`${px},${py}`);
          }
        }
    }
    for (const key of infill) tiles.add(key);
  }
  for (let y = district.y; y < district.y + district.height; y += 64) {
    let start: number | undefined;
    for (let x = district.x; x <= district.x + district.width; x += 64) {
      const occupied = tiles.has(`${x},${y}`);
      if (occupied && start === undefined) start = x;
      if (!occupied && start !== undefined) {
        paving.push({ x: start, y, width: x - start, height: 64 });
        start = undefined;
      }
    }
  }
  return paving;
}
let exposedPavingEdges:
  | { a: { x: number; y: number }; b: { x: number; y: number } }[]
  | undefined;
export function pavingEdges() {
  if (exposedPavingEdges) return exposedPavingEdges;
  const tiles = new Set(
    cityPaving().flatMap((r) =>
      Array.from({ length: r.width / 64 }, (_, i) => `${r.x + i * 64},${r.y}`),
    ),
  );
  exposedPavingEdges = [];
  for (const key of tiles) {
    const [x, y] = key.split(",").map(Number);
    for (const [dx, dy, ax, ay, bx, by] of [
      [0, -64, 0, 0, 64, 0],
      [0, 64, 0, 64, 64, 64],
      [-64, 0, 0, 0, 0, 64],
      [64, 0, 64, 0, 64, 64],
    ])
      if (!tiles.has(`${x + dx},${y + dy}`))
        exposedPavingEdges.push({
          a: { x: x + ax, y: y + ay },
          b: { x: x + bx, y: y + by },
        });
  }
  return exposedPavingEdges;
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
  for (const lane of neighborhoodPaths()) {
    if (!lane.points.some(near) || !neighborhoodPathEnabled(lane)) continue;
    ctx.beginPath();
    lane.points.forEach((p, i) =>
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
    );
    ctx.strokeStyle = lane.material === "dirt" ? "#a5a58b" : "#8f948a";
    ctx.lineWidth = lane.width + 6;
    ctx.stroke();
    ctx.strokeStyle = materials[lane.material];
    ctx.lineWidth = lane.width;
    ctx.stroke();
  }
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
  // Only the exposed outline gets an edge; shared tile borders stay seamless.
  const edges = pavingEdges().filter(
    (e) =>
      e.a.x >= bounds.x - 64 &&
      e.a.x <= bounds.x + bounds.width + 64 &&
      e.a.y >= bounds.y - 64 &&
      e.a.y <= bounds.y + bounds.height + 64,
  );
  for (const [width, color] of [
    [8, "#81877b"],
    [4, "#c7c7b1"],
  ] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "butt";
    ctx.beginPath();
    for (const edge of edges) {
      ctx.moveTo(edge.a.x, edge.a.y);
      ctx.lineTo(edge.b.x, edge.b.y);
    }
    ctx.stroke();
  }
  ctx.lineCap = "round";
  const plaza = CIVIC_PLAZA;
  if (near({ x: plaza.x + plaza.width / 2, y: plaza.y + plaza.height / 2 })) {
    ctx.fillStyle = materials.pavers;
    ctx.beginPath();
    ctx.roundRect(plaza.x, plaza.y, plaza.width, plaza.height, 28);
    ctx.fill();
    ctx.strokeStyle = "#727d7d";
    ctx.lineWidth = 4;
    ctx.stroke();
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
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#9a9d8e";
    if (!surface.buildings.every(inMarketQuarter)) ctx.stroke();
    if (surface.court) {
      const a = surface.points[0],
        b = surface.points[2];
      ctx.fillStyle = materials.pavers;
      ctx.fillRect(a.x + 8, a.y + 8, b.x - a.x - 16, b.y - a.y - 16);
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
    ctx.beginPath();
    ctx.ellipse(
      p.x,
      p.y,
      p.width / 2 + 12,
      p.height / 2 + 12,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = materials.dirt;
    ctx.fill();
    ctx.strokeStyle = "#a6aa8d";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.width / 2, p.height / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = materials.grass;
    ctx.fill();
  }
  for (const route of MARKET_QUARTER.paths) {
    if (!route.points.some(near)) continue;
    ctx.beginPath();
    route.points.forEach((p, i) =>
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
    );
    ctx.strokeStyle = materials.concrete;
    ctx.lineWidth = route.width;
    ctx.stroke();
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
      y = b.y - b.height / 2 - 8,
      w = b.width + pad * 2,
      h = b.height + pad + 20;
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
