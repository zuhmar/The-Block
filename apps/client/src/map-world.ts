import { inMarketQuarter } from "../../../packages/shared/src/market-quarter";
import {
  buildingVisual,
  propVisual,
} from "../../../packages/game-data/map-visuals";
import { paintCityFrontage } from "../../../packages/game-data/map-presentation";
import Phaser from "phaser";
import { WORLD } from "../../../packages/shared/src/index";
import {
  CHUNK_SIZE,
  visibleChunkKeys,
  LEGACY_BUILDINGS,
  PARKING_LOTS,
  INDUSTRIAL_YARDS,
} from "../../../packages/shared/src/official-map";
import {
  COAST,
  RIVER,
  STREAM,
  LAKES,
  ROADS,
  terrainChunkObjects,
  groundKind,
  mountainBlend,
  onBridge,
  roadJunctions,
  mapObjectEnabled,
  mapReservations,
  setMapReservations,
} from "../../../packages/shared/src/terrain";
const junctions = roadJunctions();
// Only static presentation is streamed. Actors, controls and housing stay in City.
export class MapWorld {
  private chunks = new Map<
    string,
    { objects: Phaser.GameObjects.GameObject[]; texture: string }
  >();
  private reservationKey = "";
  private pixelRatio: number;
  private gravelBrush?: HTMLCanvasElement;
  constructor(
    private scene: Phaser.Scene,
    ratio = 1,
  ) {
    this.pixelRatio = Math.ceil(ratio);
  }
  setPixelRatio(ratio: number) {
    const next = Math.ceil(ratio);
    if (next === this.pixelRatio) return;
    this.pixelRatio = next;
    this.gravelBrush = undefined;
    for (const key of this.chunks.keys()) this.unload(key);
  }
  setReservations(
    rects: { x: number; y: number; width: number; height: number }[],
  ) {
    const key = JSON.stringify(rects);
    if (key === this.reservationKey) return;
    this.reservationKey = key;
    setMapReservations(rects);
    for (const key of this.chunks.keys()) this.unload(key);
  }
  update(view: Phaser.Geom.Rectangle) {
    const wanted = new Set(visibleChunkKeys(view, this.pixelRatio > 1 ? 0 : 1));
    for (const key of this.chunks.keys())
      if (!wanted.has(key)) this.unload(key);
    const cx = (view.x + view.width / 2) / 1024,
      cy = (view.y + view.height / 2) / 1024;
    const pending = [...wanted]
      .filter((k) => !this.chunks.has(k))
      .sort((a, b) => {
        const [ax, ay] = a.split(",").map(Number),
          [bx, by] = b.split(",").map(Number);
        return (
          Math.hypot(ax + 0.5 - cx, ay + 0.5 - cy) -
          Math.hypot(bx + 0.5 - cx, by + 0.5 - cy)
        );
      });
    for (const key of pending.slice(0, 2)) this.load(key);
  }
  destroy() {
    for (const key of this.chunks.keys()) this.unload(key);
  }
  private unload(key: string) {
    const c = this.chunks.get(key);
    if (!c) return;
    for (const o of c.objects) o.destroy();
    this.scene.textures.remove(c.texture);
    this.chunks.delete(key);
  }
  private load(key: string) {
    const scene = this.scene,
      [cx, cy] = key.split(",").map(Number),
      x = cx * 1024,
      y = cy * 1024,
      texture = "map-chunk-" + key;
    const canvas = scene.textures.createCanvas(
      texture,
      (CHUNK_SIZE + 2) * this.pixelRatio,
      (CHUNK_SIZE + 2) * this.pixelRatio,
    )!;
    const ctx = canvas.getContext();
    ctx.save();
    ctx.scale(this.pixelRatio, this.pixelRatio);
    ctx.translate(1, 1);
    this.paint(ctx, x, y);
    ctx.restore();
    const source = canvas.getSourceImage() as HTMLCanvasElement;
    const p = this.pixelRatio,
      size = CHUNK_SIZE * p,
      full = (CHUNK_SIZE + 2) * p;
    ctx.drawImage(source, p, p, size, p, p, 0, size, p);
    ctx.drawImage(source, p, size, size, p, p, size + p, size, p);
    ctx.drawImage(source, p, 0, p, full, 0, 0, p, full);
    ctx.drawImage(source, size, 0, p, full, size + p, 0, p, full);
    canvas.refresh();
    const objects: Phaser.GameObjects.GameObject[] = [
      scene.add
        .image(x - 1, y - 1, texture)
        .setOrigin(0, 0)
        .setDisplaySize(CHUNK_SIZE + 2, CHUNK_SIZE + 2)
        .setDepth(-10000),
    ];
    for (const raw of terrainChunkObjects(key)) {
      const o = propVisual(raw);
      if (!o || !mapObjectEnabled(raw)) continue;
      if (
        o.kind === "building" &&
        inMarketQuarter(o) &&
        !o.id.startsWith("legacy")
      ) {
        const frame = scene.cache.json.get("manifest").assets[o.asset],
          v = buildingVisual(o, frame);
        objects.push(
          scene.add
            .image(v.x, v.y, o.asset)
            .setOrigin(v.originX, v.originY)
            .setDisplaySize(v.width, v.height)
            .setDepth(o.y + o.height / 2),
        );
        continue;
      }
      const tree = o.kind === "tree",
        mountain = o.kind === "mountain",
        w = tree ? 128 : o.width,
        h = tree
          ? 158
          : mountain
            ? o.height + 100
            : o.height + (o.kind === "building" ? 60 : 0),
        oy = tree ? -60 : mountain ? -50 : o.kind === "building" ? -30 : 0;
      objects.push(
        scene.add
          .image(o.x, o.y + oy, o.asset)
          .setDisplaySize(o.rotation ? h : w, o.rotation ? w : h)
          .setAngle(o.rotation || 0)
          .setDepth(
            o.kind === "decoration" &&
              o.asset.startsWith("map-nature-") &&
              !o.solid
              ? -9000
              : o.y + (tree ? 12 : o.height / 2),
          ),
      );
    }
    for (const r of LEGACY_BUILDINGS.slice(0, 5))
      if (r.x >= x && r.x < x + 1024 && r.y >= y && r.y < y + 1024)
        objects.push(
          scene.add
            .tileSprite(
              r.x + r.width / 2,
              r.y + r.height / 2,
              r.width,
              r.height,
              "map-tile-concrete",
            )
            .setDepth(r.y + r.height),
        );
    this.chunks.set(key, { objects, texture });
  }
  private paint(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const pattern = (name: string) => {
      const source = this.scene.textures
        .get(name)
        .getSourceImage() as HTMLImageElement;
      const fill = ctx.createPattern(source, "repeat")!;
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
      const brush = document.createElement("canvas");
      brush.width = brush.height = 96 * this.pixelRatio;
      const painter = brush.getContext("2d")!;
      painter.scale(this.pixelRatio, this.pixelRatio);
      painter.fillStyle = painter.createPattern(
        this.scene.textures
          .get("map-tile-gravel")
          .getSourceImage() as HTMLImageElement,
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
      if (!this.gravelBrush) {
        const brush = document.createElement("canvas");
        brush.width = brush.height = 96 * this.pixelRatio;
        const painter = brush.getContext("2d")!;
        painter.scale(this.pixelRatio, this.pixelRatio);
        painter.fillStyle = painter.createPattern(
          this.scene.textures
            .get("map-tile-gravel")
            .getSourceImage() as HTMLImageElement,
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
