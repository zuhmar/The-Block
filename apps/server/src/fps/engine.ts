import { streetPolicePatrols } from "../../../client/src/fps/police-layout.js";
import {
  isStreetPolice,
  reportPoliceViolence,
  updatePolice,
  type PolicePerson,
} from "../../../client/src/fps/police.js";
import * as THREE from "three";
import type {
  FpsAction,
  FpsPose,
  FpsPublicPlayer,
  FpsNpc,
  FpsPrivate,
  FpsWorldPatch,
  FpsEvent,
  FpsProjectile,
  OnlinePiece,
} from "../../../../packages/shared/src/fps-protocol.js";
import { initializeFpsMap } from "./map.js";
import { FpsCover } from "./cover.js";
import { FpsInputs } from "./input.js";
import {
  START,
  LOOT,
  BUILDINGS,
  surfaceHeight,
  blocked,
  placementReason,
  pieceCost,
  canRemove,
  dismantleRefund,
  pieceBase,
  advancePlayerDoor,
  setResourceCollisionProvider,
} from "../../../client/src/fps/world.js";
import {
  createHousingPlots,
  housingPlacementReason,
} from "../../../client/src/fps/housing.js";
import {
  newSurvival,
  purchasePlot,
  payUpkeep,
  settleUpkeep,
  inPlot,
  type SurvivalState,
} from "../../../client/src/fps/survival-state.js";
import {
  emptyInventory,
  readInventory,
  addItem,
  takeItem,
  countItem,
  roomFor,
  selectedItem,
  itemTool,
  isGun,
  dropStack,
  pickupDrop,
  cleanHotbar,
  type Inventory,
  type WorldDrop,
} from "../../../client/src/fps/inventory.js";
import { useLootItem } from "../../../client/src/fps/use-loot-item.js";
import { dropCarriedOnDeath } from "../../../client/src/fps/full-loot.js";
import {
  scavengeRewards,
  LOOT_COOLDOWN_MS,
  handcraft,
} from "../../../client/src/fps/survival-loot.js";
import {
  ResourceWorld,
  type WorldResource,
} from "../../../client/src/fps/resource-world.js";
import {
  GATHER_TYPES,
  type HarvestSave,
} from "../../../client/src/fps/resource-state.js";
import {
  STATIONS,
  isStationKind,
  ingredientEntries,
  missingIngredients,
  startProduction,
  collectProduction,
  cancelProduction,
  advanceProduction,
} from "../../../client/src/fps/crafting.js";
import {
  emptyStorage,
  transferStorage,
} from "../../../client/src/fps/storage.js";
import { storageSize } from "../../../client/src/fps/storage-spec.js";
import {
  maxStructureHealth,
  structureHealth,
} from "../../../client/src/fps/structure-health.js";
import { damageStructuresWithC4 } from "../../../client/src/fps/structure-damage.js";
import { ammoFor } from "../../../client/src/fps/ammo.js";
import {
  WEAPONS,
  explosiveKind,
  type WeaponKind,
} from "../../../client/src/fps/weapons.js";
import { MELEE } from "../../../client/src/fps/weapon-state.js";
import {
  advanceProjectile,
  blastDamage,
  type V3,
} from "../../../client/src/fps/explosives.js";
import {
  newEnemy,
  updateEnemy,
  damageEnemy,
  ENEMY_TYPES,
  type Enemy,
} from "../../../client/src/fps/enemy.js";
import { COMPOUND_PATROLS } from "../../../client/src/fps/military-compound.js";
import { labEncounters } from "../../../client/src/fps/lab-enemies.js";
import {
  doorAngles,
  doorTargets,
  doorPosition,
  toggleDoor,
  animateDoors,
  buildingWorld,
} from "../../../client/src/fps/building-layout.js";
import {
  isMart,
  martState,
  martPlan,
  martDoorPoint,
} from "../../../client/src/fps/block-mart-layout.js";
import {
  isCityApartments,
  apartmentDoors,
  apartmentDoorState,
} from "../../../client/src/fps/city-apartments-layout.js";
import {
  jailGate,
  jailGateNearby,
  animateJailGate,
} from "../../../client/src/fps/jail-ground-layout.js";

export type OnlinePlayer = {
  id: string;
  name: string;
  pose: FpsPose;
  health: number;
  inventory: Inventory;
  survival: SurvivalState;
  rev: number;
  nextShotAt: number;
  harvestAt: number;
  shots: number;
  reload?: { id: string; until: number };
  combatUntil: number;
  receipts: string[];
};
export type FpsWorld = {
  version: 1;
  updatedAt: number;
  players: Record<string, OnlinePlayer>;
  pieces: OnlinePiece[];
  drops: WorldDrop[];
  resources?: HarvestSave;
  lootReadyAt: Record<string, number>;
  projectiles: FpsProjectile[];
  nextProjectile: number;
  doors?: FpsWorldPatch["doors"];
  npcs: FpsNpc[];
};
export const newFpsWorld = (): FpsWorld => ({
  version: 1,
  updatedAt: Date.now(),
  players: {},
  pieces: [],
  drops: [],
  lootReadyAt: {},
  projectiles: [],
  nextProjectile: 0,
  npcs: [],
});
const distance = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.hypot(a.x - b.x, a.z - b.z);
function fail(condition: unknown, message: string): asserts condition {
  if (!condition) throw Error(message);
}
export class FpsEngine {
  world: FpsWorld;
  resources: ResourceWorld;
  cover: FpsCover;
  inputs = new Map<string, FpsInputs>();
  online = new Set<string>();
  events: FpsEvent[] = [];
  pieceRev = 1;
  resourceRev = 1;
  dropRev = 1;
  private piecesJournal = new Map<
    string,
    { rev: number; piece: OnlinePiece | null }
  >();
  private resourceJournal = new Map<
    string,
    { rev: number; resource: WorldResource }
  >();
  private journalFloor = 0;
  private pieceHashes = new Map<string, string>();
  private resourceHashes = new Map<string, string>();
  private upkeepAt = 0;
  private coverDirty = true;
  constructor(saved: FpsWorld = newFpsWorld()) {
    initializeFpsMap();
    this.world = saved;
    fail(saved.version === 1, "Unsupported online world version");
    this.resources = new ResourceWorld(
      () => this.world.pieces,
      saved.resources,
      Date.now(),
    );
    setResourceCollisionProvider((p, feet, build, radius) =>
      this.resources.blocked(p, feet, build, radius),
    );
    this.cover = new FpsCover();
    if (!saved.npcs.length)
      saved.npcs = [
        ...(["lookout", "police", "swat"] as const).map((kind) => ({
          id: kind + "-town",
          enemy: newEnemy(kind, saved.pieces),
        })),
        ...COMPOUND_PATROLS.map((p) => ({
          id: p.id,
          enemy: newEnemy("swat", saved.pieces, p),
        })),
        ...labEncounters().map((p) => ({
          id: p.id,
          enemy: newEnemy(p.kind, saved.pieces, p.patrol),
        })),
      ];
    // Add patrols without resetting existing encounters, player progress or structures.
    const police = streetPolicePatrols();
    if (police.length) {
      saved.npcs = saved.npcs.filter((n) => n.id !== "police-town");
      for (const patrol of police)
        if (!saved.npcs.some((n) => n.id === patrol.id))
          saved.npcs.push({
            id: patrol.id,
            enemy: newEnemy("police", saved.pieces, patrol),
          });
    }
    const elapsed = Math.max(0, (Date.now() - saved.updatedAt) / 1000);
    advanceProduction(saved.pieces, elapsed);
    this.restoreDoors();
    this.settle(Date.now());
    this.markWorld();
    this.cover.update(saved.pieces, this.resources.entities, true);
    this.coverDirty = false;
  }
  addPlayer(id: string, name: string) {
    let p = this.world.players[id];
    if (!p) {
      const inventory = emptyInventory();
      inventory.ammoVersion = 1;
      const survival = newSurvival();
      survival.mapVersion = 2;
      survival.plots = createHousingPlots([]);
      p = this.world.players[id] = {
        id,
        name,
        pose: { ...START, y: 0, vy: 0, yaw: Math.PI, pitch: -0.03 },
        health: 100,
        inventory,
        survival,
        rev: 1,
        nextShotAt: 0,
        harvestAt: 0,
        shots: 0,
        combatUntil: 0,
        receipts: [],
      };
    }
    p.name = name;
    this.online.add(id);
    this.inputs.set(id, new FpsInputs());
    p.reload = undefined;
    this.touch(p);
    return p;
  }
  leave(id: string) {
    this.online.delete(id);
    this.inputs.get(id)?.stop();
    this.inputs.delete(id);
  }
  isPresent(p: OnlinePlayer, now: number) {
    return this.online.has(p.id) || p.combatUntil > now;
  }
  isSafe(p: { x: number; z: number }) {
    return distance(p, START) < 8;
  }
  touch(p: OnlinePlayer) {
    p.rev++;
    p.inventory.ammoVersion = 1;
    cleanHotbar(p.inventory);
  }
  private near(
    p: OnlinePlayer,
    target: { x: number; z: number; y?: number },
    reach = 3.5,
    ignorePiece?: string,
  ) {
    return (
      distance(p.pose, target) <= reach &&
      Math.abs(p.pose.y - (target.y ?? 0)) < 2 &&
      this.cover.visible(
        { x: p.pose.x, y: p.pose.y + 1.65, z: p.pose.z },
        { x: target.x, y: (target.y ?? 0) + 0.6, z: target.z },
        ignorePiece,
        false,
      )
    );
  }
  private station(p: OnlinePlayer, id: string) {
    const piece = this.world.pieces.find((p) => p.id === id);
    fail(piece, "Station unavailable");
    fail(
      this.near(
        p,
        { ...piece, y: pieceBase(piece, this.world.pieces) },
        3.8,
        id,
      ),
      "Move closer to the station",
    );
    return piece;
  }
  private inventoryEdit(p: OnlinePlayer, raw: Inventory) {
    const inv = readInventory({ ...raw, drops: [] });
    fail(inv, "Invalid inventory");
    fail(
      JSON.stringify(inv.reserve) === JSON.stringify(p.inventory.reserve),
      "Reserve contents cannot be moved remotely",
    );
    const total = (i: Inventory) => {
      const t: Record<string, number> = {};
      for (const s of i.slots) if (s) t[s.kind] = (t[s.kind] ?? 0) + s.quantity;
      return Object.entries(t).sort();
    };
    fail(
      JSON.stringify(total(inv)) === JSON.stringify(total(p.inventory)),
      "Items must come from the server",
    );
    const originals = new Map(
      p.inventory.slots.filter(Boolean).map((s) => [s!.id, s!]),
    );
    const blockedIds = new Set([
      ...this.world.pieces.flatMap((p) =>
        (p.contents ?? []).filter(Boolean).map((s) => s!.id),
      ),
      ...this.world.drops.map((d) => d.id),
      ...Object.values(this.world.players)
        .filter((a) => a.id !== p.id)
        .flatMap((a) => a.inventory.slots.filter(Boolean).map((s) => s!.id)),
    ]);
    for (const item of inv.slots) {
      if (!item) continue;
      fail(!blockedIds.has(item.id), "Item identity collision");
      if (isGun(item.kind)) {
        const old = originals.get(item.id);
        fail(
          old && old.kind === item.kind && old.magazine === item.magazine,
          "Weapon state is server-controlled",
        );
      }
    }
    p.inventory = inv;
    p.inventory.ammoVersion = 1;
    if (p.reload && selectedItem(inv)?.id !== p.reload.id) p.reload = undefined;
    this.touch(p);
  }
  apply(id: string, action: FpsAction, requestId: string, now = Date.now()) {
    const p = this.world.players[id];
    fail(p, "Sign in first");
    if (p.receipts.includes(requestId)) return "Already applied";
    fail(p.health > 0 || action.type === "respawn", "You must respawn first");
    if (this.coverDirty) {
      this.cover.update(this.world.pieces, this.resources.entities, true);
      this.coverDirty = false;
    }
    let message = "";
    const inv = () => p.inventory;
    switch (action.type) {
      case "inventory":
        this.inventoryEdit(p, action.inventory);
        break;
      case "equip":
        inv().active = action.slot;
        p.reload = undefined;
        this.touch(p);
        break;
      case "loot": {
        const l = LOOT[action.index];
        fail(l, "Container unavailable");
        fail(
          this.near(p, { ...l, y: l.y ?? 0 }, 3.4),
          "Move closer to the container",
        );
        fail(
          (this.world.lootReadyAt[action.index] ?? 0) <= now,
          "Container restocking · return later",
        );
        const result = scavengeRewards(
          inv(),
          action.index,
          l.reward ?? 20 + l.tier * 25,
          l,
          Math.floor(now / LOOT_COOLDOWN_MS),
        );
        fail(result, "Inventory full");
        p.inventory = result.inventory;
        p.survival.cash = Math.min(1e6, p.survival.cash + result.cash);
        this.world.lootReadyAt[action.index] = now + LOOT_COOLDOWN_MS;
        this.touch(p);
        message = `${l.name} · supplies and $${result.cash}`;
        break;
      }
      case "pickup": {
        const d = this.world.drops.find((d) => d.id === action.id);
        fail(d && this.near(p, d, 2.8), "Move closer to the dropped item");
        if (d.kind === "cash") {
          fail(p.survival.cash + d.quantity <= 1e6, "Cash limit reached");
          p.survival.cash += d.quantity;
          this.world.drops = this.world.drops.filter((v) => v.id !== d.id);
        } else {
          const temp = { ...inv(), drops: [d] };
          fail(pickupDrop(temp, d.id), "Inventory full");
          p.inventory = { ...temp, drops: [] };
          this.world.drops = this.world.drops.filter((v) => v.id !== d.id);
          if (temp.drops[0]) this.world.drops.push(temp.drops[0]);
        }
        this.touch(p);
        this.dropRev++;
        message = "Item picked up";
        break;
      }
      case "drop": {
        fail(
          this.world.drops.length < 1200,
          "Too many dropped items in the world",
        );
        const point = {
          x: p.pose.x - Math.sin(p.pose.yaw) * 1.2,
          z: p.pose.z - Math.cos(p.pose.yaw) * 1.2,
          y: p.pose.y,
        };
        if (blocked(point, this.world.pieces, p.pose.y)) {
          point.x = p.pose.x;
          point.z = p.pose.z;
        }
        const temp = { ...inv(), drops: [] };
        fail(dropStack(temp, action.id, point), "Item unavailable");
        p.inventory = { ...temp, drops: [] };
        this.world.drops.push(...temp.drops);
        p.reload = undefined;
        this.touch(p);
        this.dropRev++;
        break;
      }
      case "use": {
        const result = useLootItem(inv(), action.id, p.health);
        fail(result, "Cannot use this item now");
        p.inventory = result.inventory;
        p.health = result.health;
        this.touch(p);
        message = "Health restored";
        break;
      }
      case "craft": {
        const next = handcraft(inv(), action.kind);
        fail(next, "Need materials and a free inventory slot");
        p.inventory = next;
        this.touch(p);
        message = "Tool crafted";
        break;
      }
      case "buy": {
        const plot = createHousingPlots([]).find((a) => a.id === action.id);
        fail(
          plot &&
            distance(p.pose, { x: plot.x, z: plot.z + plot.depth / 2 + 1 }) < 4,
          "Visit the plot sign first",
        );
        fail(
          !Object.values(this.world.players).some(
            (a) =>
              a.survival.lease?.plotId === action.id ||
              a.survival.abandoned.some((b) => b.plotId === action.id),
          ),
          "Plot already owned",
        );
        p.survival.plots = createHousingPlots([]);
        const error = purchasePlot(p.survival, action.id, now);
        fail(!error, error);
        this.reservePlots(now);
        this.touch(p);
        for (const other of Object.values(this.world.players))
          if (other.id !== id) this.touch(other);
        message = "Plot purchased · one day of upkeep included";
        break;
      }
      case "upkeep": {
        const plot = p.survival.plots.find(
          (a) => a.id === p.survival.lease?.plotId,
        );
        fail(
          plot &&
            distance(p.pose, { x: plot.x, z: plot.z + plot.depth / 2 + 1 }) < 4,
          "Visit your plot sign first",
        );
        const error = payUpkeep(p.survival, action.days, now);
        fail(!error, error);
        this.touch(p);
        message = "Upkeep paid";
        break;
      }
      case "build": {
        const piece = {
          ...action.piece,
          id: crypto.randomUUID(),
          ownerId: id,
          health: maxStructureHealth(action.piece),
        } as OnlinePiece;
        const reason =
          housingPlacementReason(p.survival, piece, this.world.pieces, now) ||
          placementReason(
            piece,
            p.pose,
            this.world.pieces,
            countItem(inv(), "wood"),
            Infinity,
          );
        fail(!reason, reason);
        fail(
          this.world.pieces.length < 1200,
          "World building capacity reached",
        );
        if (isStationKind(piece.kind))
          fail(
            !missingIngredients(inv(), STATIONS[piece.kind].extras),
            "Need station materials",
          );
        fail(takeItem(inv(), "wood", pieceCost(piece)), "Not enough wood");
        if (isStationKind(piece.kind))
          for (const [k, n] of ingredientEntries(STATIONS[piece.kind].extras))
            takeItem(inv(), k, n);
        this.world.pieces.push(piece);
        this.touch(p);
        message = "Structure placed";
        break;
      }
      case "remove": {
        const piece = this.world.pieces.find((a) => a.id === action.id);
        fail(
          piece && piece.ownerId === id,
          "Only the owner can dismantle this piece",
        );
        fail(distance(p.pose, piece) <= 8, "Move closer");
        fail(
          canRemove(piece, this.world.pieces),
          "Remove supported pieces first",
        );
        fail(
          !piece.job && !(piece.contents ?? []).some(Boolean),
          "Empty the station or chest first",
        );
        const next = structuredClone(inv());
        fail(
          addItem(next, "wood", dismantleRefund(piece)) ===
            dismantleRefund(piece),
          "Make inventory room for the refund",
        );
        if (isStationKind(piece.kind))
          for (const [k, n] of ingredientEntries(STATIONS[piece.kind].extras)) {
            const amount = Math.floor(
              (n * structureHealth(piece)) / maxStructureHealth(piece),
            );
            fail(
              addItem(next, k, amount) === amount,
              "Make inventory room for station materials",
            );
          }
        p.inventory = next;
        this.world.pieces = this.world.pieces.filter((a) => a.id !== piece.id);
        this.touch(p);
        message = "Structure dismantled";
        break;
      }
      case "storage": {
        const piece = this.station(p, action.station);
        fail(piece.kind === "storage", "Not a storage chest");
        piece.contents ??= emptyStorage(storageSize(piece));
        const moved =
          action.side === "bag"
            ? transferStorage(
                inv().slots,
                piece.contents,
                action.index,
                action.quantity,
              )
            : transferStorage(
                piece.contents,
                inv().slots,
                action.index,
                action.quantity,
              );
        fail(moved, "No items fit in the destination");
        this.touch(p);
        break;
      }
      case "production": {
        const piece = this.station(p, action.station);
        const error =
          action.action === "start"
            ? startProduction(piece, inv(), action.recipe ?? "")
            : action.action === "collect"
              ? collectProduction(piece, inv())
              : cancelProduction(piece, inv());
        fail(!error, error);
        this.touch(p);
        message =
          action.action === "start" ? "Production started" : "Station updated";
        break;
      }
      case "inspect":
        this.station(p, action.id);
        return "";
      case "harvest": {
        const r = this.resources.entities.find((r) => r.id === action.id),
          held = selectedItem(inv());
        fail(
          r && r.health > 0 && this.near(p, r, 3.2),
          "Move closer to the resource",
        );
        fail(
          held &&
            (r.kind.startsWith("tree")
              ? held.kind === "axe"
              : held.kind === "pickaxe"),
          r.kind.startsWith("tree") ? "Equip an axe" : "Equip a pickaxe",
        );
        const spec = GATHER_TYPES[r.kind];
        fail(
          now - p.harvestAt >= spec.duration * 850,
          "Finish your gathering swing",
        );
        fail(roomFor(inv(), spec.resource) >= spec.yield, "Inventory full");
        const result = this.resources.hit(r.id, now);
        fail(result, "Resource unavailable");
        addItem(inv(), result.resource, result.amount);
        p.harvestAt = now;
        this.touch(p);
        message = `+${result.amount} ${result.resource}`;
        break;
      }
      case "door":
        this.toggleDoor(p, action);
        break;
      case "reload":
        this.reload(p, now);
        break;
      case "fire":
        this.fire(p, action.yaw, action.pitch, now);
        break;
      case "detonate":
        for (const projectile of [...this.world.projectiles])
          if (projectile.kind === "c4" && projectile.ownerId === id)
            this.explode(projectile, now);
        break;
      case "respawn":
        fail(p.health <= 0, "You are still alive");
        p.health = 100;
        p.survival.dead = false;
        p.pose = { ...START, y: 0, vy: 0, yaw: Math.PI, pitch: -0.03 };
        p.reload = undefined;
        this.inputs.get(id)?.stop();
        this.touch(p);
        break;
    }
    if (!["fire", "reload", "equip"].includes(action.type)) {
      p.receipts.push(requestId);
      if (p.receipts.length > 256) p.receipts.shift();
    }
    this.markWorld();
    return message;
  }
  private toggleDoor(p: OnlinePlayer, a: Extract<FpsAction, { type: "door" }>) {
    if (a.kind === "player") {
      const piece = this.world.pieces.find(
        (v) => v.id === a.id && v.kind === "door",
      );
      fail(
        piece && piece.ownerId === p.id,
        "This door belongs to another player",
      );
      fail(
        this.near(
          p,
          { ...piece, y: pieceBase(piece, this.world.pieces) },
          3.2,
          piece.id,
        ),
        "Move closer to the door",
      );
      piece.open = !piece.open;
      this.coverDirty = true;
      return;
    }
    if (a.kind === "jail") {
      fail(
        jailGateNearby(p.pose, p.pose.y),
        "Move closer to the compound gates",
      );
      jailGate.open = !jailGate.open;
      return;
    }
    const index = a.index ?? -1,
      b = BUILDINGS[index];
    fail(b, "Door unavailable");
    if (a.kind === "building") {
      const target = doorPosition(index);
      fail(
        distance(p.pose, target) < 3.2 &&
          Math.abs(p.pose.y - (target.y ?? 0)) < 1.5,
        "Move closer to the door",
      );
      toggleDoor(index);
      return;
    }
    const part = a.part ?? -1;
    if (a.kind === "apartment") {
      fail(isCityApartments(b) && apartmentDoors[part], "Door unavailable");
      const d = apartmentDoors[part],
        target = buildingWorld(b, { x: d.x, y: d.y, z: d.z });
      fail(
        distance(p.pose, target) < 3 && Math.abs(p.pose.y - d.y) < 1.5,
        "Move closer to the apartment door",
      );
      const state = apartmentDoorState(index);
      state.targets[part] = !state.targets[part];
      return;
    }
    fail(isMart(b) && martPlan.doors[part] && part > 0, "Door unavailable");
    const point = martDoorPoint(part, martState(index).angles[part]);
    fail(
      distance(p.pose, buildingWorld(b, point)) < 3,
      "Move closer to the door",
    );
    const state = martState(index);
    state.targets[part] = !state.targets[part];
  }
  private reload(p: OnlinePlayer, now: number) {
    const item = selectedItem(p.inventory);
    fail(item && isGun(item.kind), "Equip a firearm first");
    const kind = item.kind as WeaponKind;
    fail(!p.reload, "Already reloading");
    fail((item.magazine ?? 0) < WEAPONS[kind].magazineSize, "Magazine full");
    const ammo = ammoFor(kind);
    fail(ammo && countItem(p.inventory, ammo) > 0, "No carried ammunition");
    p.reload = { id: item.id, until: now + WEAPONS[kind].reloadSeconds * 1000 };
    this.touch(p);
  }
  private direction(yaw: number, pitch: number) {
    return new THREE.Vector3(
      -Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch),
    );
  }
  private policeSight = (
    a: { x: number; z: number; y?: number },
    b: { x: number; z: number; y?: number },
  ) => this.cover.visible({ ...a, y: a.y ?? 0 }, { ...b, y: b.y ?? 0 });
  private reportViolence(
    p: OnlinePlayer,
    point: { x: number; z: number; y?: number },
    kind: "gunfire" | "assault" | "explosion",
    now: number,
    victim?: Enemy,
  ) {
    reportPoliceViolence(
      this.world.npcs.map((n) => n.enemy),
      {
        id: p.id,
        position: p.pose,
        alive: p.health > 0,
        safe: this.isSafe(p.pose),
      },
      point,
      kind,
      this.policeSight,
      now,
      victim,
    );
  }
  private fire(p: OnlinePlayer, yaw: number, pitch: number, now: number) {
    fail(!this.isSafe(p.pose), "Jail release area · weapons are disabled");
    const held = selectedItem(p.inventory),
      tool = held ? itemTool(held.kind) : "hands";
    fail(
      !held || isGun(held.kind) || ["grenade", "c4"].includes(held.kind),
      "This item cannot fire",
    );
    fail(!p.reload, "Reloading");
    fail(now + 25 >= p.nextShotAt, "Weapon cooling down");
    const interval =
      tool === "hands" ? MELEE.interval * 1000 : WEAPONS[tool].interval;
    const origin = new THREE.Vector3(p.pose.x, p.pose.y + 1.65, p.pose.z),
      direction = this.direction(yaw, pitch);
    const explosive = tool !== "hands" && explosiveKind(tool);
    const c4Hit =
      tool === "c4" ? this.cover.trace(origin, direction, 3) : undefined;
    if (explosive) {
      fail(
        this.world.projectiles.filter((v) => v.ownerId === p.id).length < 8,
        "Limit · eight active explosives",
      );
      if (tool === "c4")
        fail(c4Hit, "Aim at a wall or ground within three metres");
    }
    if (tool !== "hands") {
      if (tool === "grenade" || tool === "c4")
        fail(takeItem(p.inventory, tool, 1), "No charges carried");
      else {
        fail(held && (held.magazine ?? 0) > 0, "Empty magazine");
        if (tool === "rocket")
          fail(takeItem(p.inventory, "rockets", 1), "No rockets carried");
        held.magazine!--;
      }
    }
    p.nextShotAt = Math.max(p.nextShotAt, now - 25) + interval;
    p.shots++;
    p.combatUntil = now + 30000;
    if (tool !== "hands" && tool !== "c4")
      this.reportViolence(p, p.pose, "gunfire", now);
    p.pose.yaw = yaw;
    p.pose.pitch = pitch;
    if (tool !== "hands" && explosiveKind(tool)) {
      fail(
        this.world.projectiles.filter((v) => v.ownerId === p.id).length < 8,
        "Limit · eight active explosives",
      );
      const kind = tool as "grenade" | "rocket" | "c4";
      const hit = c4Hit;
      if (kind === "c4")
        fail(hit, "Aim at a wall or ground within three metres");
      const position = hit
          ? hit.point.clone().addScaledVector(direction, -0.09)
          : origin.clone().addScaledVector(direction, 0.35),
        velocity = direction
          .clone()
          .multiplyScalar(kind === "rocket" ? 32 : 11);
      if (kind === "grenade") velocity.y += 3.2;
      this.world.projectiles.push({
        id: ++this.world.nextProjectile,
        ownerId: p.id,
        kind,
        position: { x: position.x, y: position.y, z: position.z },
        velocity:
          kind === "c4"
            ? { x: 0, y: 0, z: 0 }
            : { x: velocity.x, y: velocity.y, z: velocity.z },
        fuse:
          kind === "rocket"
            ? WEAPONS.rocket.range / 32
            : kind === "grenade"
              ? 3
              : 0,
        settled: kind === "c4",
        ...(hit?.pieceId ? { attachedPieceId: hit.pieceId } : {}),
      });
    } else {
      const range = tool === "hands" ? MELEE.range : WEAPONS[tool].range,
        damage = tool === "hands" ? MELEE.damage : WEAPONS[tool].damage;
      const wall = this.cover.trace(origin, direction, range);
      let closest = wall?.distance ?? range,
        target: OnlinePlayer | undefined,
        npc: Enemy | undefined;
      const ray = new THREE.Ray(origin, direction);
      for (const other of Object.values(this.world.players)) {
        if (
          other.id === p.id ||
          other.health <= 0 ||
          !this.isPresent(other, now) ||
          this.isSafe(other.pose)
        )
          continue;
        const h = ray.intersectBox(
          new THREE.Box3(
            new THREE.Vector3(
              other.pose.x - 0.3,
              other.pose.y,
              other.pose.z - 0.3,
            ),
            new THREE.Vector3(
              other.pose.x + 0.3,
              other.pose.y + 1.85,
              other.pose.z + 0.3,
            ),
          ),
          new THREE.Vector3(),
        );
        if (h && origin.distanceTo(h) < closest) {
          closest = origin.distanceTo(h);
          target = other;
          npc = undefined;
        }
      }
      for (const unit of this.world.npcs) {
        const e = unit.enemy;
        if (e.health <= 0) continue;
        const y = surfaceHeight(e, this.world.pieces, 1);
        const h = ray.intersectBox(
          new THREE.Box3(
            new THREE.Vector3(e.x - 0.3, y, e.z - 0.3),
            new THREE.Vector3(e.x + 0.3, y + 1.8, e.z + 0.3),
          ),
          new THREE.Vector3(),
        );
        if (h && origin.distanceTo(h) < closest) {
          closest = origin.distanceTo(h);
          npc = e;
          target = undefined;
        }
      }
      if (target) {
        if (tool === "hands") this.reportViolence(p, p.pose, "assault", now);
        this.damage(target, damage, now);
        this.events.push({
          type: "hit",
          target: p.id,
          damage,
          killed: target.health <= 0,
        });
      } else if (npc) {
        damageEnemy(npc, damage);
        this.reportViolence(p, p.pose, "assault", now, npc);
        this.events.push({
          type: "hit",
          target: p.id,
          damage,
          killed: npc.health <= 0,
        });
      }
      const end = ray.at(closest, new THREE.Vector3());
      this.events.push({
        type: "shot",
        id: p.id,
        tool,
        from: { x: origin.x, y: origin.y, z: origin.z },
        to: { x: end.x, y: end.y, z: end.z },
      });
    }
    this.touch(p);
  }
  private damage(p: OnlinePlayer, amount: number, now: number) {
    if (p.health <= 0 || this.isSafe(p.pose)) return;
    p.health = Math.max(0, p.health - amount);
    p.combatUntil = now + 30000;
    this.touch(p);
    if (p.health === 0) {
      p.reload = undefined;
      this.inputs.get(p.id)?.stop();
      dropCarriedOnDeath(p.inventory, p.survival, p.pose);
      this.world.drops.push(...p.inventory.drops);
      p.inventory.drops = [];
      this.dropRev++;
      this.events.push({ type: "death", id: p.id, name: p.name });
    }
  }
  private explode(projectile: FpsProjectile, now: number) {
    if (this.coverDirty) {
      this.cover.update(this.world.pieces, this.resources.entities, true);
      this.coverDirty = false;
    }
    const center = projectile.position;
    const owner = this.world.players[projectile.ownerId];
    if (owner) this.reportViolence(owner, center, "explosion", now);
    this.world.projectiles = this.world.projectiles.filter(
      (p) => p.id !== projectile.id,
    );
    for (const p of Object.values(this.world.players)) {
      if (!this.isPresent(p, now) || p.health <= 0) continue;
      const target = { x: p.pose.x, y: p.pose.y + 1, z: p.pose.z },
        amount = blastDamage(
          projectile.kind,
          Math.hypot(
            center.x - target.x,
            center.y - target.y,
            center.z - target.z,
          ),
        );
      if (amount && this.cover.visible(center, target))
        this.damage(p, amount, now);
    }
    for (const unit of this.world.npcs) {
      const e = unit.enemy,
        target = {
          x: e.x,
          y: surfaceHeight(e, this.world.pieces, 1) + 1,
          z: e.z,
        },
        amount = blastDamage(
          projectile.kind,
          Math.hypot(
            center.x - target.x,
            center.y - target.y,
            center.z - target.z,
          ),
        );
      if (e.health > 0 && amount && this.cover.visible(center, target))
        damageEnemy(e, amount);
    }
    if (projectile.kind === "c4") {
      const damage = damageStructuresWithC4(
        this.world.pieces,
        center,
        projectile.attachedPieceId,
        (piece, target) => this.cover.visible(center, target, piece.id, true),
      );
      for (const id of damage.destroyed) {
        const piece = this.world.pieces.find((v) => v.id === id);
        for (const stack of piece?.contents ?? [])
          if (stack)
            this.world.drops.push({
              ...stack,
              x: piece!.x,
              y: pieceBase(piece!, this.world.pieces),
              z: piece!.z,
            });
      }
      this.world.pieces = damage.pieces as OnlinePiece[];
      if (damage.destroyed.length) this.dropRev++;
    }
    this.events.push({ type: "explosion", projectile });
    this.markWorld();
  }
  private reservePlots(now: number) {
    const occupied = Object.values(this.world.players).flatMap((p) => [
        ...(p.survival.lease ? [p.survival.lease.plotId] : []),
        ...p.survival.abandoned.map((a) => a.plotId),
      ]),
      plots = createHousingPlots([]).filter((p) => occupied.includes(p.id));
    this.resources.reserveLand(
      (p, r) => !plots.some((plot) => inPlot(p, plot, -r)),
      now,
    );
  }
  private settle(now: number) {
    for (const p of Object.values(this.world.players)) {
      const result = settleUpkeep(p.survival, now);
      if (result.forfeited || result.cleared.length) {
        for (const id of result.cleared) {
          const plot = p.survival.plots.find((a) => a.id === id);
          if (plot)
            this.world.pieces = this.world.pieces.filter(
              (a) => !inPlot(a, plot),
            );
        }
        for (const other of Object.values(this.world.players))
          this.touch(other);
      }
    }
    this.reservePlots(now);
  }
  private restoreDoors() {
    const d = this.world.doors;
    if (!d) return;
    doorTargets.forEach((_, i) => {
      doorTargets[i] = d.building[i] ?? false;
      doorAngles[i] = d.angles[i] ?? 0;
    });
    jailGate.open = d.jail;
    jailGate.angle = d.jailAngle;
    for (const [id, state] of Object.entries(d.mart))
      Object.assign(martState(Number(id)), state);
    for (const [id, state] of Object.entries(d.apartments))
      Object.assign(apartmentDoorState(Number(id)), state);
  }
  doors(): FpsWorldPatch["doors"] {
    const mart: Record<string, { targets: boolean[]; angles: number[] }> = {},
      apartments: typeof mart = {};
    for (const [i, b] of BUILDINGS.entries()) {
      if (isMart(b)) mart[i] = structuredClone(martState(i));
      if (isCityApartments(b))
        apartments[i] = structuredClone(apartmentDoorState(i));
    }
    return {
      building: [...doorTargets],
      angles: [...doorAngles],
      jail: jailGate.open,
      jailAngle: jailGate.angle,
      mart,
      apartments,
    };
  }
  step(dt: number, now = Date.now()) {
    const active = Object.values(this.world.players).filter(
      (p) => this.isPresent(p, now) && p.health > 0,
    );
    for (const p of active) {
      const inputs = this.inputs.get(p.id);
      if (inputs)
        p.pose = inputs.step(p.pose, this.world.pieces, dt, p.health > 0);
      if (p.reload && now >= p.reload.until) {
        const held = selectedItem(p.inventory);
        if (held && held.id === p.reload.id && isGun(held.kind)) {
          const kind = held.kind as WeaponKind,
            ammo = ammoFor(kind);
          const n = Math.min(
            WEAPONS[kind].magazineSize - (held.magazine ?? 0),
            ammo ? countItem(p.inventory, ammo) : 0,
          );
          held.magazine = (held.magazine ?? 0) + n;
          if (ammo && ammo !== "rockets") takeItem(p.inventory, ammo, n);
        }
        p.reload = undefined;
        this.touch(p);
      }
    }
    const occupants = active.map((p) => ({ ...p.pose }));
    animateDoors(dt, occupants);
    animateJailGate(dt, occupants);
    for (const piece of this.world.pieces)
      if (piece.kind === "door") {
        const old = piece.doorAngle;
        advancePlayerDoor(piece, dt, occupants, this.world.pieces);
        if (old !== piece.doorAngle) this.coverDirty = true;
      }
    for (const [i, b] of BUILDINGS.entries())
      for (const state of [
        isMart(b) ? martState(i) : undefined,
        isCityApartments(b) ? apartmentDoorState(i) : undefined,
      ])
        if (state)
          for (let j = 1; j < state.angles.length; j++) {
            const target = state.targets[j] ? -Math.PI / 2 : 0;
            state.angles[j] = THREE.MathUtils.damp(
              state.angles[j],
              target,
              8,
              dt,
            );
          }
    this.cover.update(
      this.world.pieces,
      this.resources.entities,
      this.coverDirty,
    );
    this.coverDirty = false;
    const policePeople: PolicePerson[] = active.map((p) => ({
      id: p.id,
      position: p.pose,
      alive: p.health > 0,
      safe: this.isSafe(p.pose),
    }));
    for (const unit of this.world.npcs) {
      const e = unit.enemy;
      const policeShot = isStreetPolice(e)
        ? updatePolice(
            e,
            policePeople,
            this.world.pieces,
            dt,
            this.policeSight,
            now,
          )
        : undefined;
      const nearest = isStreetPolice(e)
        ? active.find((p) => p.id === policeShot?.suspectId)
        : active
            .filter((p) => !this.isSafe(p.pose))
            .sort((a, b) => distance(a.pose, e) - distance(b.pose, e))[0];
      const target = nearest?.pose ?? { ...START, y: 0 },
        from = {
          x: e.x,
          y: surfaceHeight(e, this.world.pieces, 1) + 1.4,
          z: e.z,
        },
        to = { x: target.x, y: target.y + 1.1, z: target.z };
      const visible =
        !!nearest && distance(e, target) < 24 && this.cover.visible(from, to);
      const shot = isStreetPolice(e)
        ? policeShot?.point
        : updateEnemy(e, target, this.world.pieces, dt, visible);
      if (shot && nearest) {
        e.target = { ...shot, y: target.y };
        const aim = { x: shot.x, y: target.y + 1.1, z: shot.z };
        this.events.push({
          type: "shot",
          id: this.world.npcs.find((n) => n.enemy === e)!.id,
          tool:
            e.patrol?.combat?.damage === 24
              ? "lmg"
              : e.kind === "swat"
                ? "rifle"
                : "pistol",
          from,
          to: aim,
        });
        this.npcShots.push({
          from: { ...from },
          position: { ...from },
          direction: new THREE.Vector3(
            aim.x - from.x,
            aim.y - from.y,
            aim.z - from.z,
          ).normalize(),
          life: 2,
          damage: e.patrol?.combat?.damage ?? ENEMY_TYPES[e.kind].damage,
          ...(policeShot ? { suspectId: policeShot.suspectId } : {}),
        });
      }
    }
    for (const shot of [...this.npcShots]) {
      shot.life -= dt;
      const end = {
          x: shot.position.x + shot.direction.x * 18 * dt,
          y: shot.position.y + shot.direction.y * 18 * dt,
          z: shot.position.z + shot.direction.z * 18 * dt,
        },
        segment = new THREE.Vector3(
          end.x - shot.position.x,
          end.y - shot.position.y,
          end.z - shot.position.z,
        ),
        range = segment.length(),
        blocked = this.cover.trace(shot.position, segment.normalize(), range);
      let hit = false;
      if (!blocked) {
        const ray = new THREE.Ray(
          new THREE.Vector3(shot.position.x, shot.position.y, shot.position.z),
          shot.direction,
        );
        for (const p of active) {
          if (this.isSafe(p.pose)) continue;
          const point = ray.intersectBox(
            new THREE.Box3(
              new THREE.Vector3(p.pose.x - 0.3, p.pose.y, p.pose.z - 0.3),
              new THREE.Vector3(p.pose.x + 0.3, p.pose.y + 1.8, p.pose.z + 0.3),
            ),
            new THREE.Vector3(),
          );
          if (point && point.distanceTo(ray.origin) <= range) {
            if (!shot.suspectId || shot.suspectId === p.id)
              this.damage(p, shot.damage, now);
            hit = true;
            break;
          }
        }
      }
      shot.position = end;
      if (blocked || hit || shot.life <= 0)
        this.npcShots.splice(this.npcShots.indexOf(shot), 1);
    }
    for (const projectile of [...this.world.projectiles])
      if (
        advanceProjectile(projectile, dt, (a, b) => {
          const delta = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z),
            length = delta.length();
          if (!length) return;
          const hit = this.cover.trace(a, delta.normalize(), length);
          return hit ? { point: hit.point, normal: hit.normal } : undefined;
        })
      )
        this.explode(projectile, now);
    const completed = advanceProduction(this.world.pieces, dt);
    if (completed.length) this.markWorld();
    this.resources.tick(now, active[0]?.pose);
    if (now >= this.upkeepAt) {
      this.upkeepAt = now + 1000;
      this.settle(now);
      this.markWorld();
    }
    this.world.updatedAt = now;
  }
  private npcShots: {
    from: V3;
    position: V3;
    direction: THREE.Vector3;
    life: number;
    damage: number;
    suspectId?: string;
  }[] = [];
  markWorld() {
    const ids = new Set(this.world.pieces.map((p) => p.id));
    for (const id of this.pieceHashes.keys())
      if (!ids.has(id)) {
        this.pieceHashes.delete(id);
        this.piecesJournal.set(id, { rev: ++this.pieceRev, piece: null });
        this.coverDirty = true;
      }
    for (const p of this.world.pieces) {
      const copy = { ...p };
      delete copy.doorAngle;
      const hash = JSON.stringify(copy);
      if (this.pieceHashes.get(p.id) !== hash) {
        this.pieceHashes.set(p.id, hash);
        this.piecesJournal.set(p.id, {
          rev: ++this.pieceRev,
          piece: structuredClone(p),
        });
        this.coverDirty = true;
      }
    }
    if (this.piecesJournal.size > 5000) {
      this.journalFloor = this.pieceRev - 2500;
      for (const [id, entry] of this.piecesJournal)
        if (entry.rev < this.journalFloor) this.piecesJournal.delete(id);
    }
    for (const r of this.resources.entities) {
      const hash = JSON.stringify([
        r.x,
        r.z,
        r.health,
        r.respawnAt,
        r.generation,
      ]);
      if (this.resourceHashes.get(r.id) !== hash) {
        this.resourceHashes.set(r.id, hash);
        this.resourceJournal.set(r.id, {
          rev: ++this.resourceRev,
          resource: { ...r, lastHitAt: 0 },
        });
        this.coverDirty = true;
      }
    }
  }
  private publicPiece(piece: OnlinePiece) {
    const result = { ...piece };
    delete result.contents;
    return result;
  }
  worldPatch(
    id: string,
    known: {
      pieceRev: number;
      resourceRev: number;
      dropRev: number;
      cell: string;
    },
  ) {
    const p = this.world.players[id],
      cell = `${Math.floor(p.pose.x / 20)},${Math.floor(p.pose.z / 20)}`;
    const fullPieces =
        known.pieceRev === 0 || known.pieceRev < this.journalFloor,
      fullResources = known.resourceRev === 0;
    const patches = [...this.piecesJournal.entries()].filter(
        ([, v]) => v.rev > known.pieceRev,
      ),
      resources = fullResources
        ? this.resources.entities
        : [...this.resourceJournal.values()]
            .filter((v) => v.rev > known.resourceRev)
            .map((v) => v.resource);
    const pieces = fullPieces
      ? this.world.pieces.map((p) => this.publicPiece(p))
      : patches
          .filter(([, v]) => v.piece)
          .map(([, v]) => this.publicPiece(v.piece!));
    const patch: FpsWorldPatch = {
      pieceRev: this.pieceRev,
      resourceRev: this.resourceRev,
      ...(fullPieces || pieces.length || patches.length
        ? {
            pieces,
            removed: patches.filter(([, v]) => !v.piece).map(([id]) => id),
            fullPieces,
          }
        : {}),
      ...(fullResources || resources.length
        ? {
            resources: resources.map((r) => ({ ...r, lastHitAt: 0 })),
            fullResources,
          }
        : {}),
      ...(known.dropRev !== this.dropRev || cell !== known.cell
        ? {
            drops: this.world.drops
              .filter((d) => distance(d, p.pose) < 70)
              .slice(0, 200),
          }
        : {}),
      lootReadyAt: this.world.lootReadyAt,
      doors: this.doors(),
      projectiles: this.world.projectiles.filter(
        (v) => distance(v.position, p.pose) < 130,
      ),
    };
    known.pieceRev = this.pieceRev;
    known.resourceRev = this.resourceRev;
    known.dropRev = this.dropRev;
    known.cell = cell;
    return patch;
  }
  privateState(id: string, stationId?: string): FpsPrivate {
    const p = this.world.players[id],
      taken = new Set(
        Object.values(this.world.players)
          .filter((v) => v.id !== id)
          .flatMap((v) => [
            ...(v.survival.lease ? [v.survival.lease.plotId] : []),
            ...v.survival.abandoned.map((a) => a.plotId),
          ]),
      );
    const survival = structuredClone(p.survival);
    survival.plots = createHousingPlots([]).filter(
      (plot) => !taken.has(plot.id),
    );
    survival.lootReadyAt = { ...this.world.lootReadyAt };
    const inventory = structuredClone(p.inventory);
    inventory.drops = [];
    const station = stationId
      ? this.world.pieces.find((v) => v.id === stationId)
      : undefined;
    return {
      rev: p.rev,
      health: p.health,
      reloadUntil: p.reload?.until ?? 0,
      save: {
        version: 1,
        wood: countItem(inventory, "wood"),
        resources: {
          rock: countItem(inventory, "rock"),
          sulfur: countItem(inventory, "sulfur"),
          metal: countItem(inventory, "metal"),
        },
        inventory,
        survival,
        pieces: [],
        opened: [],
      },
      ...(station &&
      this.near(
        p,
        { ...station, y: pieceBase(station, this.world.pieces) },
        3.8,
        station.id,
      )
        ? { station: structuredClone(station) }
        : {}),
    };
  }
  publicPlayers(now: number): FpsPublicPlayer[] {
    return Object.values(this.world.players)
      .filter((p) => this.isPresent(p, now))
      .map((p) => ({
        id: p.id,
        name: p.name,
        pose: { ...p.pose },
        health: p.health,
        tool: selectedItem(p.inventory)
          ? itemTool(selectedItem(p.inventory)!.kind)
          : "hands",
        shots: p.shots,
        reloadUntil: p.reload?.until ?? 0,
        online: this.online.has(p.id),
      }));
  }
  serialize(now = Date.now()) {
    this.world.updatedAt = now;
    this.world.resources = this.resources.snapshot();
    this.world.doors = this.doors();
    return JSON.stringify(this.world);
  }
}
