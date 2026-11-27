import type {
  Inventory,
  WorldDrop,
} from "../../../apps/client/src/fps/inventory";
import type { Piece, Save } from "../../../apps/client/src/fps/world";
import type { Enemy } from "../../../apps/client/src/fps/enemy";
import type { WorldResource } from "../../../apps/client/src/fps/resource-world";
import type { Projectile } from "../../../apps/client/src/fps/explosives";
import type { Tool } from "../../../apps/client/src/fps/weapons";
export const FPS_VERSION = 1;
export const FPS_STEP = 0.02;
export type FpsPose = {
  x: number;
  z: number;
  y: number;
  vy: number;
  yaw: number;
  pitch: number;
};
export type FpsInput = {
  seq: number;
  x: number;
  z: number;
  run: boolean;
  jump: boolean;
  yaw: number;
  pitch: number;
};
export type OnlinePiece = Piece & { ownerId: string };
export type FpsAction =
  | { type: "inventory"; inventory: Inventory }
  | { type: "equip"; slot: number }
  | { type: "loot"; index: number }
  | {
      type:
        | "pickup"
        | "drop"
        | "use"
        | "remove"
        | "harvest"
        | "buy"
        | "inspect";
      id: string;
    }
  | { type: "upkeep"; days: number }
  | { type: "craft"; kind: "axe" | "pickaxe" }
  | { type: "build"; piece: Omit<Piece, "id"> }
  | {
      type: "storage";
      station: string;
      side: "bag" | "chest";
      index: number;
      quantity: number;
    }
  | {
      type: "production";
      station: string;
      action: "start" | "collect" | "cancel";
      recipe?: string;
    }
  | {
      type: "door";
      kind: "building" | "mart" | "apartment" | "jail" | "player";
      index?: number;
      part?: number;
      id?: string;
    }
  | { type: "fire"; yaw: number; pitch: number }
  | { type: "reload" | "detonate" | "respawn" };
export type FpsPublicPlayer = {
  id: string;
  name: string;
  pose: FpsPose;
  health: number;
  tool: Tool;
  shots: number;
  reloadUntil: number;
  online: boolean;
};
export type FpsNpc = { id: string; enemy: Enemy };
export type FpsProjectile = Projectile & { ownerId: string };
export type FpsDoors = {
  building: boolean[];
  angles: number[];
  jail: boolean;
  jailAngle: number;
  mart: Record<string, { targets: boolean[]; angles: number[] }>;
  apartments: Record<string, { targets: boolean[]; angles: number[] }>;
};
export type FpsWorldPatch = {
  pieceRev: number;
  pieces?: OnlinePiece[];
  removed?: string[];
  fullPieces?: boolean;
  resourceRev: number;
  resources?: WorldResource[];
  fullResources?: boolean;
  drops?: WorldDrop[];
  lootReadyAt?: Record<string, number>;
  doors: FpsDoors;
  projectiles: FpsProjectile[];
};
export type FpsPrivate = {
  rev: number;
  save: Save;
  health: number;
  reloadUntil: number;
  station?: Piece;
};
export type FpsSnapshot = {
  v: 1;
  id: string;
  serverTime: number;
  ack: number;
  pose: FpsPose;
  players: FpsPublicPlayer[];
  npcs: FpsNpc[];
  world: FpsWorldPatch;
  self?: FpsPrivate;
  paused: boolean;
};
export type FpsEvent =
  | {
      type: "shot";
      id: string;
      tool: Tool;
      from: { x: number; y: number; z: number };
      to: { x: number; y: number; z: number };
    }
  | { type: "explosion"; projectile: FpsProjectile }
  | { type: "hit"; target: string; damage: number; killed: boolean }
  | { type: "death"; id: string; name: string };
