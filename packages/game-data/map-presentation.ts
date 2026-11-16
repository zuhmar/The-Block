import {
  BUILDINGS,
  DISTRICTS,
  type MapObject,
} from "../shared/src/official-map.js";
import { nearestRoadPoint, mapObjectEnabled } from "../shared/src/terrain.js";
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
    const points = [
      start,
      { x: start.x, y: start.y + 26 },
      { x: end.x, y: start.y + 26 },
      end,
    ];
    if (
      BUILDINGS.some(
        (o) =>
          o.id !== b.id &&
          points
            .slice(1)
            .some((p, i) =>
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
export function paintCityFrontage(
  ctx: CanvasRenderingContext2D,
  bounds: { x: number; y: number; width: number; height: number },
  materials: {
    concrete: CanvasPattern;
    gravel: CanvasPattern;
    dirt: CanvasPattern;
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
  for (const c of streetConnections()) {
    if (!near(c.building) || !mapObjectEnabled(c.building)) continue;
    ctx.beginPath();
    c.points.forEach((p, i) =>
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
    );
    ctx.strokeStyle = materials.concrete;
    ctx.lineWidth = c.width + 10;
    ctx.stroke();
    ctx.strokeStyle =
      frontageStyle(c.building).district === "the-block"
        ? materials.dirt
        : materials.concrete;
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
      s.material === "gravel" ? materials.gravel : materials.concrete;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, s.district === "uptown" ? 24 : 8);
    ctx.fill();
    if (s.district === "industrial") {
      ctx.strokeStyle = "#d2b968";
      ctx.lineWidth = 4;
      ctx.setLineDash([18, 14]);
      ctx.strokeRect(x + 12, b.y + b.height / 2 + 12, w - 24, 32);
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = s.district === "uptown" ? "#788c60" : "#c7c8b3";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 8, y + h - 4);
      ctx.lineTo(x + w - 8, y + h - 4);
      ctx.stroke();
    }
    if (s.district === "downtown") {
      ctx.strokeStyle = "#929d92";
      ctx.lineWidth = 2;
      for (let n = 1; n < Math.floor(w / 48); n++) {
        ctx.beginPath();
        ctx.moveTo(x + n * 48, b.y + b.height / 2 + 8);
        ctx.lineTo(x + n * 48, y + h - 8);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}
