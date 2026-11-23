import {
  BUILDINGS,
  LOOT,
  MAP_SIZE,
  START,
  TREES,
  blockedTerrain,
  inTown,
  roadDistance,
  pieceBox,
  type Piece,
  type Point,
} from "./world";
import {
  GATHER_TYPES,
  type HarvestSave,
  type SavedResource,
} from "./resource-state";
export type WorldResource = SavedResource & {
  scale: number;
  rotation: number;
  width: number;
  depth: number;
  height: number;
  canopy: number;
  lastHitAt: number;
};
export const RESOURCE_NODE_COUNT = 75;
const nodeKinds = ["node-rock", "node-sulfur", "node-metal"] as const;
export class ResourceWorld {
  entities: WorldResource[] = [];
  revision = 0;
  private cells = new Map<string, WorldResource[]>();
  private nextTick = 0;
  constructor(
    private pieces: () => Piece[],
    saved?: HarvestSave,
    now = Date.now(),
    private random: () => number = Math.random,
  ) {
    for (const [i, t] of TREES.entries()) {
      const kind = (["tree-broadleaf", "tree-pine", "tree-birch"] as const)[
          i % 3
        ],
        scale = t.scale * 0.85,
        canopy =
          (kind === "tree-broadleaf" ? 3.4 : kind === "tree-pine" ? 2.4 : 2.8) *
          scale,
        id = `tree:${t.x.toFixed(3)}:${t.z.toFixed(3)}`;
      if (
        !this.staticSite(t, canopy) ||
        this.entities.some((r) => Math.hypot(r.x - t.x, r.z - t.z) < 4)
      )
        continue;
      const old = saved?.trees[id],
        blocked = !this.baseClear(t, canopy),
        health = blocked ? 0 : (old?.health ?? 100);
      this.entities.push({
        id,
        kind,
        x: t.x,
        z: t.z,
        health,
        respawnAt: blocked ? now + 10000 : (old?.respawnAt ?? 0),
        generation: 0,
        scale,
        rotation: i * 2.39996,
        width: 0.8 * scale,
        depth: 0.8 * scale,
        height: 2.8 * scale,
        canopy,
        lastHitAt: -Infinity,
      });
    }
    for (let i = 0; i < RESOURCE_NODE_COUNT; i++) {
      const kind = nodeKinds[i % 3],
        id = `node-${i}`,
        old = saved?.nodes.find((n) => n.id === id && n.kind === kind),
        r: WorldResource = {
          id,
          kind,
          x: old?.x ?? 0,
          z: old?.z ?? 0,
          health: old?.health ?? 0,
          respawnAt: old?.respawnAt ?? now,
          generation: old?.generation ?? 0,
          scale: 0.8,
          rotation: i * 2.4 + (old?.generation ?? 0) * 2.399,
          width: 2.08,
          depth: 1.62,
          height: 1.55,
          canopy: 1.4,
          lastHitAt: -Infinity,
        };
      if (old && r.health > 0 && !this.nodeSite(r, r.id)) {
        r.health = 0;
        r.respawnAt = now + 10000;
      }
      if (!old) {
        const point = this.pickNode(
          r,
          undefined,
          i < 3 ? { x: -42 - i * 5, z: 38 + i * 4 } : undefined,
        );
        if (point) {
          Object.assign(r, point);
          r.health = GATHER_TYPES[kind].health;
          r.respawnAt = 0;
        }
      }
      this.entities.push(r);
    }
    this.reindex();
    this.tick(now, START);
  }
  private staticSite(p: Point, radius: number) {
    if (blockedTerrain(p, radius + 1) || roadDistance(p) < 4.8 + radius)
      return false;
    for (const dx of [-radius, 0, radius])
      for (const dz of [-radius, 0, radius])
        if (inTown({ x: p.x + dx, z: p.z + dz })) return false;
    return (
      !BUILDINGS.some(
        (b) =>
          Math.abs(p.x - b.x) < b.width / 2 + radius + 1 &&
          Math.abs(p.z - b.z) < b.depth / 2 + radius + 1,
      ) &&
      !LOOT.some(
        (b) =>
          Math.abs(p.x - b.x) < b.width / 2 + radius &&
          Math.abs(p.z - b.z) < b.depth / 2 + radius,
      )
    );
  }
  private baseClear(p: Point, radius: number) {
    return this.pieces().every((piece) => {
      const b = pieceBox(piece);
      return (
        Math.abs(p.x - b.x) > b.width / 2 + radius + 1 ||
        Math.abs(p.z - b.z) > b.depth / 2 + radius + 1
      );
    });
  }
  private nodeSite(p: Point, id: string) {
    return (
      this.staticSite(p, 1.5) &&
      this.baseClear(p, 2) &&
      this.entities.every(
        (r) =>
          r.id === id ||
          r.health === 0 ||
          Math.hypot(r.x - p.x, r.z - p.z) > r.canopy + 2,
      )
    );
  }
  private pickNode(r: WorldResource, player?: Point, near?: Point) {
    for (let attempt = 0; attempt < 700; attempt++) {
      const p =
        near && attempt < 150
          ? {
              x: near.x + (this.random() - 0.5) * 18,
              z: near.z + (this.random() - 0.5) * 18,
            }
          : {
              x: (this.random() - 0.5) * (MAP_SIZE - 20),
              z: (this.random() - 0.5) * (MAP_SIZE - 20),
            };
      if (r.generation > 0 && Math.hypot(p.x - r.x, p.z - r.z) < 10) continue;
      if (player && Math.hypot(p.x - player.x, p.z - player.z) < 8) continue;
      if (this.nodeSite(p, r.id)) return p;
    }
    return undefined;
  }
  tick(now: number, player?: Point) {
    if (now < this.nextTick) return false;
    this.nextTick = now + 1000;
    let changed = false;
    for (const r of this.entities) {
      if (r.health > 0 || r.respawnAt > now) continue;
      if (r.kind.startsWith("tree-")) {
        if (
          !this.baseClear(r, r.canopy) ||
          this.entities.some(
            (other) =>
              other.health > 0 &&
              other.kind.startsWith("node-") &&
              Math.hypot(other.x - r.x, other.z - r.z) < r.canopy + 2,
          ) ||
          (player && Math.hypot(r.x - player.x, r.z - player.z) < 2)
        ) {
          r.respawnAt = now + 10000;
          continue;
        }
      } else {
        const point = this.pickNode(r, player);
        if (!point) {
          r.respawnAt = now + 10000;
          continue;
        }
        Object.assign(r, point);
        r.rotation = Number(r.id.slice(5)) * 2.4 + r.generation * 2.399;
      }
      r.health = GATHER_TYPES[r.kind].health;
      r.respawnAt = 0;
      changed = true;
    }
    if (changed) {
      this.revision++;
      this.reindex();
    }
    return changed;
  }
  hit(id: string, now: number) {
    const r = this.entities.find((r) => r.id === id);
    if (
      !r ||
      r.health <= 0 ||
      now - r.lastHitAt < GATHER_TYPES[r.kind].duration * 850
    )
      return undefined;
    const config = GATHER_TYPES[r.kind];
    r.lastHitAt = now;
    r.health = Math.max(0, r.health - config.damage);
    const depleted = r.health === 0;
    if (depleted) {
      r.respawnAt = now + config.respawnMs;
      r.generation++;
      this.revision++;
      this.reindex();
    }
    return {
      entity: r,
      resource: config.resource,
      amount: config.yield,
      depleted,
    };
  }
  reset(now = Date.now()) {
    const fresh = new ResourceWorld(this.pieces, undefined, now, this.random);
    this.entities = fresh.entities;
    this.nextTick = now + 1000;
    this.revision++;
    this.reindex();
  }
  get(id: string) {
    return this.entities.find((r) => r.id === id);
  }
  private reindex() {
    this.cells.clear();
    for (const r of this.entities)
      if (r.health > 0) {
        const key = `${Math.floor(r.x / 16)},${Math.floor(r.z / 16)}`;
        if (!this.cells.has(key)) this.cells.set(key, []);
        this.cells.get(key)!.push(r);
      }
  }
  near(p: Point, radius = 8) {
    const result: WorldResource[] = [];
    for (
      let x = Math.floor((p.x - radius) / 16);
      x <= Math.floor((p.x + radius) / 16);
      x++
    )
      for (
        let z = Math.floor((p.z - radius) / 16);
        z <= Math.floor((p.z + radius) / 16);
        z++
      )
        result.push(...(this.cells.get(`${x},${z}`) ?? []));
    return result;
  }
  blocked(p: Point, feet = 0, build = false, radius = 0.32) {
    return this.near(p, 6).some(
      (r) =>
        feet < r.height &&
        Math.abs(p.x - r.x) < (build ? r.canopy : r.width / 2) + radius &&
        Math.abs(p.z - r.z) < (build ? r.canopy : r.depth / 2) + radius,
    );
  }
  snapshot(): HarvestSave {
    return {
      version: 1,
      trees: Object.fromEntries(
        this.entities
          .filter(
            (r) =>
              r.kind.startsWith("tree-") &&
              (r.health !== 100 || r.respawnAt > 0),
          )
          .map((r) => [r.id, { health: r.health, respawnAt: r.respawnAt }]),
      ),
      nodes: this.entities
        .filter((r) => r.kind.startsWith("node-"))
        .map(({ id, kind, x, z, health, respawnAt, generation }) => ({
          id,
          kind,
          x,
          z,
          health,
          respawnAt,
          generation,
        })),
    };
  }
}
