import { paintCityFrontage } from "../../../packages/game-data/map-presentation";
import { WORLD } from "../../../packages/shared/src/index";
import {
  PARKING_LOTS,
  INDUSTRIAL_YARDS,
} from "../../../packages/shared/src/official-map";
import {
  COAST,
  RIVER,
  STREAM,
  LAKES,
  ROADS,
  groundKind,
  mountainBlend,
  onBridge,
  roadJunctions,
  mapReservations,
} from "../../../packages/shared/src/terrain";
const junctions = roadJunctions();
export const TERRAIN_TEXTURES = [
  "map-tile-water",
  "map-tile-grass",
  "map-tile-gravel",
  "map-paving-slab",
  "map-paving-pavers",
  "map-paving-service",
  "map-tile-asphalt",
  "map-tile-dirt",
  "td-floor",
] as const;
// The same painter runs in a worker and on browsers without OffscreenCanvas.
export class TerrainPainter {
  private gravelBrush?: HTMLCanvasElement;
  private tonedSurfaces = new Map<string, HTMLCanvasElement>();
  constructor(
    private pixelRatio: number,
    private source: (
      name: string,
    ) => CanvasImageSource & { width: number; height: number },
    private canvas: () => HTMLCanvasElement,
  ) {}
  paint(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const pattern = (name: string) => {
      const source = this.source(name);
      const wash =
        name === "map-paving-slab"
          ? "rgba(181,183,176,0.22)"
          : name === "map-tile-grass"
            ? "rgba(113,128,76,0.24)"
            : undefined;
      if (wash && !this.tonedSurfaces.has(name)) {
        const surface = this.canvas();
        surface.width = source.width;
        surface.height = source.height;
        const painter = surface.getContext("2d")!;
        painter.drawImage(source, 0, 0);
        painter.fillStyle = wash;
        painter.fillRect(0, 0, surface.width, surface.height);
        this.tonedSurfaces.set(name, surface);
      }
      const fill = ctx.createPattern(
        this.tonedSurfaces.get(name) || source,
        "repeat",
      )!;
      if (name.startsWith("map-paving-"))
        fill.setTransform(new DOMMatrix().scale(128 / source.width));
      return fill;
    };
    const path = (
      points: readonly { x: number; y: number }[],
      closed = false,
    ) => {
      ctx.beginPath();
      points.forEach((p, i) =>
        i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
      );
      if (closed) ctx.closePath();
    };
    const stroke = (
      points: readonly { x: number; y: number }[],
      width: number,
      color: string | CanvasPattern,
      closed = false,
    ) => {
      ctx.beginPath();
      let pen = false,
        any = false;
      const padding = width + 48;
      for (let i = 0; i < points.length - (closed ? 0 : 1); i++) {
        const a = points[i],
          b = points[(i + 1) % points.length];
        if (
          Math.max(a.x, b.x) < x - padding ||
          Math.min(a.x, b.x) > x + 1024 + padding ||
          Math.max(a.y, b.y) < y - padding ||
          Math.min(a.y, b.y) > y + 1024 + padding
        ) {
          pen = false;
          continue;
        }
        if (!pen) ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        pen = true;
        any = true;
      }
      if (!any) return;
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();
    };
    ctx.save();
    ctx.translate(-x, -y);
    const water = pattern("map-tile-water"),
      grass = pattern("map-tile-grass"),
      gravel = pattern("map-tile-gravel"),
      concrete = pattern("map-paving-slab"),
      pavers = pattern("map-paving-pavers"),
      service = pattern("map-paving-service"),
      asphalt = pattern("map-tile-asphalt"),
      dirt = pattern("map-tile-dirt");
    if (!this.gravelBrush) {
      const brush = this.canvas();
      brush.width = brush.height = 96 * this.pixelRatio;
      const painter = brush.getContext("2d")!;
      painter.scale(this.pixelRatio, this.pixelRatio);
      painter.fillStyle = painter.createPattern(
        this.source("map-tile-gravel"),
        "repeat",
      )!;
      painter.fillRect(0, 0, 96, 96);
      const fade = painter.createRadialGradient(48, 48, 4, 48, 48, 48);
      fade.addColorStop(0, "#000");
      fade.addColorStop(0.45, "#0009");
      fade.addColorStop(1, "#0000");
      painter.globalCompositeOperation = "destination-in";
      painter.fillStyle = fade;
      painter.fillRect(0, 0, 96, 96);
      this.gravelBrush = brush;
    }
    ctx.fillStyle = water;
    ctx.fillRect(x, y, 1024, 1024);
    ctx.globalAlpha = 0.16;
    stroke(COAST, 180, "#89b8ad", true);
    ctx.globalAlpha = 0.22;
    stroke(COAST, 94, "#b1cdb5", true);
    ctx.globalAlpha = 1;
    ctx.save();
    path(COAST, true);
    ctx.clip();
    ctx.fillStyle = grass;
    ctx.fillRect(x, y, 1024, 1024);
    for (let ty = -1; ty <= 16; ty++)
      for (let tx = -1; tx <= 16; tx++) {
        const p = { x: x + tx * 64 + 32, y: y + ty * 64 + 32 },
          k = groundKind(p);
        if (k === "mountain" || k === "rocky") {
          ctx.globalAlpha = k === "mountain" ? mountainBlend(p) * 0.6 : 0.14;
          const radius = k === "mountain" ? 48 : 40;
          const dx = Math.sin(p.x * 0.013 + p.y * 0.021) * 12,
            dy = Math.cos(p.x * 0.017 - p.y * 0.019) * 12;
          ctx.drawImage(
            this.gravelBrush!,
            p.x + dx - radius,
            p.y + dy - radius,
            radius * 2,
            radius * 2,
          );
        }
      }
    ctx.globalAlpha = 1;
    paintCityFrontage(
      ctx,
      { x, y, width: 1024, height: 1024 },
      { concrete, gravel, dirt, grass, pavers, service },
    );
    stroke(COAST, 46, "#b9bb8a", true);
    stroke(COAST, 10, "#a5d0be", true);
    for (const lake of LAKES) {
      path(lake, true);
      ctx.fillStyle = water;
      ctx.fill();
      ctx.lineWidth = 22;
      ctx.strokeStyle = "#b9bb8a";
      ctx.stroke();
    }
    for (const [river, w] of [
      [RIVER, 448],
      [STREAM, 84],
    ] as const) {
      stroke(river, w + 34, "#b2b28b");
      stroke(river, w, water);
    }
    ctx.restore();
    for (const r of mapReservations()) {
      ctx.fillStyle = grass;
      ctx.fillRect(r.x, r.y, r.width, r.height);
    }
    for (const lot of [...PARKING_LOTS, ...INDUSTRIAL_YARDS]) {
      ctx.fillStyle = INDUSTRIAL_YARDS.includes(lot) ? gravel : concrete;
      ctx.beginPath();
      ctx.roundRect(
        lot.x - lot.width / 2,
        lot.y - lot.height / 2,
        lot.width,
        lot.height,
        32,
      );
      ctx.fill();
    }
    for (const lot of PARKING_LOTS) {
      ctx.strokeStyle = "#eee9cc";
      ctx.lineWidth = 4;
      for (let i = 0; i <= 4; i++) {
        const px = lot.x - 288 + i * 144;
        ctx.beginPath();
        ctx.moveTo(px, lot.y - 75);
        ctx.lineTo(px, lot.y + 130);
        ctx.stroke();
      }
    }
    for (const road of ROADS) {
      const trail = road.width < 100;
      stroke(
        road.points,
        road.width + (trail ? 18 : 62),
        trail ? "#8e926c" : "#626e70",
      );
      if (!trail) stroke(road.points, road.width + 54, concrete);
    }
    // Paint all road beds after all shoulders so sidewalks cannot cut across junctions.
    for (const road of ROADS)
      stroke(road.points, road.width, road.width < 100 ? dirt : asphalt);
    for (const road of ROADS) {
      const trail = road.width < 100;
      if (!trail) {
        ctx.setLineDash([32, 96]);
        stroke(road.points, 3, "#e1d6a4");
        ctx.setLineDash([]);
      }
      if (!trail)
        for (let i = 12; i < road.points.length; i += 28) {
          const p = road.points[i],
            a = road.points[i - 1];
          if (
            p.x < x - 200 ||
            p.x > x + 1224 ||
            p.y < y - 200 ||
            p.y > y + 1224 ||
            onBridge(p)
          )
            continue;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(Math.atan2(p.y - a.y, p.x - a.x));
          const gy = road.width / 2 + 6;
          ctx.fillStyle = "#4f5a5c";
          ctx.fillRect(-12, gy, 24, 12);
          ctx.strokeStyle = "#9aa19a";
          ctx.lineWidth = 2;
          ctx.strokeRect(-12, gy, 24, 12);
          ctx.fillStyle = "#89918c";
          for (let d = -8; d <= 8; d += 4) ctx.fillRect(d, gy + 2, 1, 8);
          ctx.restore();
        }
      for (let i = 1; i < road.points.length; i++) {
        const p = road.points[i];
        if (
          p.x < x - 200 ||
          p.x > x + 1224 ||
          p.y < y - 200 ||
          p.y > y + 1224 ||
          !onBridge(p)
        )
          continue;
        const a = road.points[i - 1],
          angle = Math.atan2(p.y - a.y, p.x - a.x),
          dx = Math.cos(angle + Math.PI / 2) * (road.width / 2 - 6),
          dy = Math.sin(angle + Math.PI / 2) * (road.width / 2 - 6);
        ctx.beginPath();
        ctx.moveTo(p.x - dx, p.y - dy);
        ctx.lineTo(p.x + dx, p.y + dy);
        ctx.lineWidth = 12;
        ctx.strokeStyle = "#baa077";
        ctx.stroke();
      }
    }
    for (const j of junctions) {
      if (j.x < x - 200 || j.x > x + 1224 || j.y < y - 200 || j.y > y + 1224)
        continue;
      ctx.fillStyle = asphalt;
      ctx.beginPath();
      ctx.arc(j.x, j.y, 52, 0, Math.PI * 2);
      ctx.fill();
      for (const angle of [
        j.angleA,
        j.angleA + Math.PI,
        j.angleB,
        j.angleB + Math.PI,
      ])
        for (let d = 110; d < 172; d += 14) {
          const px = j.x + Math.cos(angle) * d,
            py = j.y + Math.sin(angle) * d,
            dx = -Math.sin(angle) * 42,
            dy = Math.cos(angle) * 42;
          ctx.beginPath();
          ctx.moveTo(px - dx, py - dy);
          ctx.lineTo(px + dx, py + dy);
          ctx.lineWidth = 7;
          ctx.strokeStyle = "#e2e0ca";
          ctx.stroke();
        }
    }
    const s = WORLD.safeRect;
    ctx.fillStyle = pattern("td-floor");
    ctx.fillRect(s.x, s.y, s.width, s.height);
    ctx.restore();
  }
}
