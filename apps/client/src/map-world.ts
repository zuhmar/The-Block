import {
  buildingVisual,
  propVisual,
  sceneryVisual,
  usesSceneryVisual,
} from "../../../packages/game-data/map-visuals";
import { TerrainPainter, TERRAIN_TEXTURES } from "./terrain-painter";
import Phaser from "phaser";
import {
  CHUNK_SIZE,
  visibleChunkKeys,
  LEGACY_BUILDINGS,
} from "../../../packages/shared/src/official-map";
import {
  terrainChunkObjects,
  mapObjectEnabled,
  mapReservations,
  setMapReservations,
} from "../../../packages/shared/src/terrain";
type TerrainTile = { bitmap: ImageBitmap; x: number; y: number; size: number };
type PreparedTerrain = {
  key: string;
  tiles: TerrainTile[];
  objects: Phaser.GameObjects.GameObject[];
  textures: string[];
  bitmaps: ImageBitmap[];
};
// Only static presentation is streamed. Actors, controls and housing stay in City.
export class MapWorld {
  private chunks = new Map<
    string,
    {
      objects: Phaser.GameObjects.GameObject[];
      texture: string;
      textures: string[];
      bitmaps: ImageBitmap[];
    }
  >();
  private reservationKey = "";
  private pixelRatio: number;
  private painter?: TerrainPainter;
  private worker?: Worker;
  private pending?: string;
  private prepared?: PreparedTerrain;
  private generation = 0;
  private wanted = new Set<string>();
  constructor(
    private scene: Phaser.Scene,
    ratio = 1,
  ) {
    this.pixelRatio = Math.ceil(ratio);
    if (
      typeof Worker !== "undefined" &&
      typeof OffscreenCanvas !== "undefined"
    ) {
      try {
        this.worker = new Worker(
          new URL("./terrain-worker.ts", import.meta.url),
          { type: "module" },
        );
        this.worker.onmessage = ({ data }) => {
          if (
            data.generation !== this.generation ||
            data.key !== this.pending
          ) {
            for (const tile of data.tiles || []) tile.bitmap.close();
            return;
          }
          if (data.error) {
            this.stopWorker();
            return;
          }
          if (!this.wanted.has(data.key)) {
            for (const tile of data.tiles) tile.bitmap.close();
            this.pending = undefined;
            return;
          }
          const view = this.scene.cameras.main.worldView,
            [cx, cy] = data.key.split(",").map(Number),
            x = view.centerX - cx * CHUNK_SIZE,
            y = view.centerY - cy * CHUNK_SIZE;
          data.tiles.sort(
            (a: TerrainTile, b: TerrainTile) =>
              Math.hypot(a.x + a.size / 2 - x, a.y + a.size / 2 - y) -
              Math.hypot(b.x + b.size / 2 - x, b.y + b.size / 2 - y),
          );
          this.prepared = {
            key: data.key,
            tiles: data.tiles,
            objects: [],
            textures: [],
            bitmaps: [],
          };
        };
        this.worker.onerror = () => this.stopWorker();
        const assets = scene.cache.json.get("manifest").assets;
        this.worker.postMessage({
          type: "init",
          files: Object.fromEntries(
            TERRAIN_TEXTURES.map((key) => [key, "/assets/" + assets[key].file]),
          ),
        });
      } catch {
        this.stopWorker();
      }
    }
  }
  private stopWorker() {
    this.worker?.terminate();
    this.worker = undefined;
    this.discardPrepared();
    this.pending = undefined;
  }
  private discardPrepared() {
    const p = this.prepared;
    if (!p) return;
    for (const object of p.objects) object.destroy();
    for (const texture of p.textures) this.scene.textures.remove(texture);
    for (const bitmap of p.bitmaps) bitmap.close();
    for (const tile of p.tiles) tile.bitmap.close();
    this.prepared = undefined;
  }
  private uploadPrepared() {
    const p = this.prepared;
    if (!p) return;
    if (!this.wanted.has(p.key)) {
      this.discardPrepared();
      this.pending = undefined;
      return;
    }
    const started = performance.now();
    // A bounded upload replaces the former 16 MB upload in a single frame.
    for (let count = 0; count < 2 && p.tiles.length; count++) {
      const tile = p.tiles.shift()!,
        texture = "map-chunk-" + p.key + "-" + p.textures.length,
        [cx, cy] = p.key.split(",").map(Number);
      this.scene.textures.addImage(
        texture,
        tile.bitmap as unknown as HTMLImageElement,
      );
      p.objects.push(
        this.scene.add
          .image(
            cx * CHUNK_SIZE + tile.x - 1,
            cy * CHUNK_SIZE + tile.y - 1,
            texture,
          )
          .setOrigin(0, 0)
          .setDisplaySize(tile.size + 2, tile.size + 2)
          .setDepth(-10000),
      );
      p.textures.push(texture);
      p.bitmaps.push(tile.bitmap);
      if (performance.now() - started >= 4) break;
    }
    if (!p.tiles.length) {
      this.install(p.key, p.textures[0], p);
      this.prepared = undefined;
      this.pending = undefined;
    }
  }
  private invalidate() {
    this.discardPrepared();
    this.generation++;
    this.pending = undefined;
    this.painter = undefined;
    for (const key of this.chunks.keys()) this.unload(key);
  }
  setPixelRatio(ratio: number) {
    const next = Math.ceil(ratio);
    if (next === this.pixelRatio) return;
    this.pixelRatio = next;
    this.invalidate();
  }
  setReservations(
    rects: { x: number; y: number; width: number; height: number }[],
  ) {
    const key = JSON.stringify(rects);
    if (key === this.reservationKey) return;
    this.reservationKey = key;
    setMapReservations(rects);
    this.invalidate();
  }
  update(view: Phaser.Geom.Rectangle) {
    const wanted = new Set(visibleChunkKeys(view, this.pixelRatio > 1 ? 0 : 1));
    this.wanted = wanted;
    for (const key of this.chunks.keys())
      if (!wanted.has(key)) this.unload(key);
    this.uploadPrepared();
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
    if (!this.pending) for (const key of pending.slice(0, 1)) this.load(key);
  }
  destroy() {
    this.stopWorker();
    for (const key of this.chunks.keys()) this.unload(key);
  }
  private unload(key: string) {
    const c = this.chunks.get(key);
    if (!c) return;
    for (const o of c.objects) o.destroy();
    for (const texture of c.textures) this.scene.textures.remove(texture);
    for (const bitmap of c.bitmaps) bitmap.close();
    this.chunks.delete(key);
  }
  private load(key: string) {
    const scene = this.scene,
      [cx, cy] = key.split(",").map(Number),
      x = cx * 1024,
      y = cy * 1024,
      texture = "map-chunk-" + key;
    if (this.worker) {
      this.pending = key;
      this.worker.postMessage({
        type: "paint",
        key,
        x,
        y,
        ratio: this.pixelRatio,
        generation: this.generation,
        reservations: mapReservations(),
      });
      return;
    }
    this.painter ||= new TerrainPainter(
      this.pixelRatio,
      (name) =>
        this.scene.textures.get(name).getSourceImage() as HTMLImageElement,
      () => document.createElement("canvas"),
    );
    const canvas = scene.textures.createCanvas(
      texture,
      (CHUNK_SIZE + 2) * this.pixelRatio,
      (CHUNK_SIZE + 2) * this.pixelRatio,
    )!;
    const ctx = canvas.getContext();
    ctx.save();
    ctx.scale(this.pixelRatio, this.pixelRatio);
    ctx.translate(1, 1);
    this.painter.paint(ctx, x, y);
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
    this.install(key, texture);
  }
  private install(key: string, texture: string, terrain?: PreparedTerrain) {
    const scene = this.scene,
      [cx, cy] = key.split(",").map(Number),
      x = cx * CHUNK_SIZE,
      y = cy * CHUNK_SIZE;
    const objects: Phaser.GameObjects.GameObject[] = terrain?.objects || [
      scene.add
        .image(x - 1, y - 1, texture)
        .setOrigin(0, 0)
        .setDisplaySize(CHUNK_SIZE + 2, CHUNK_SIZE + 2)
        .setDepth(-10000),
    ];
    for (const raw of terrainChunkObjects(key)) {
      const o = propVisual(raw);
      if (!o || !mapObjectEnabled(raw)) continue;
      if (o.kind === "building") {
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
      if (usesSceneryVisual(o)) {
        const frame = scene.cache.json.get("manifest").assets[o.asset],
          v = sceneryVisual(o, frame);
        objects.push(
          scene.add
            .image(v.x, v.y, o.asset)
            .setOrigin(v.originX, v.originY)
            .setDisplaySize(v.width, v.height)
            .setAngle(o.rotation || 0)
            .setDepth(
              o.kind === "decoration" &&
                o.asset.startsWith("map-nature-") &&
                !o.solid
                ? -9000
                : o.y + (o.kind === "tree" ? 12 : o.height / 2),
            ),
        );
        continue;
      }
      const tree = o.kind === "tree",
        mountain = o.kind === "mountain",
        w = tree ? 128 : o.width,
        h = tree ? 158 : mountain ? o.height + 100 : o.height,
        oy = tree ? -60 : mountain ? -50 : 0;
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
    this.chunks.set(key, {
      objects,
      texture,
      textures: terrain?.textures || [texture],
      bitmaps: terrain?.bitmaps || [],
    });
  }
}
