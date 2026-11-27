import { FPS_CONTENT_VERSION } from "../../../../packages/shared/src/fps-protocol.js";
import { Room, type Client } from "@colyseus/core";
import { z } from "zod";
import { createHash } from "node:crypto";
import { pool } from "../db.js";
import { FpsEngine, newFpsWorld, type FpsWorld } from "./engine.js";
import { fpsActionSchema } from "./schema.js";
import type {
  FpsAction,
  FpsSnapshot,
} from "../../../../packages/shared/src/fps-protocol.js";
const envelope = z.object({
  v: z.literal(1),
  requestId: z.string().uuid(),
  action: fpsActionSchema,
});
type Known = {
  pieceRev: number;
  resourceRev: number;
  dropRev: number;
  cell: string;
  selfRev: number;
  station?: string;
};
export function fpsRoom(bootstrap: string) {
  return class Block3D extends Room {
    maxClients = 20;
    autoDispose = false;
    engine!: FpsEngine;
    online = new Map<string, string>();
    known = new Map<string, Known>();
    rates = new Map<string, { at: number; actions: number; inputs: number }>();
    queue: Promise<unknown> = Promise.resolve();
    paused = false;
    saving = false;
    last = Date.now();
    checkpoint = 0;
    frames = 0;
    async onCreate(options: { bootstrap?: string }) {
      if (options.bootstrap !== bootstrap)
        throw Error("Join the existing city");
      await pool.query(
        "INSERT INTO fps_worlds(id,data) VALUES(1,$1) ON CONFLICT DO NOTHING",
        [JSON.stringify(newFpsWorld())],
      );
      const result = await pool.query("SELECT data FROM fps_worlds WHERE id=1");
      this.engine = new FpsEngine(result.rows[0].data as FpsWorld);
      await this.persist();
      this.onMessage("inputs", (client, raw) => {
        const id = this.online.get(client.sessionId);
        if (!id || this.paused || !this.rate(client, "inputs", 50)) return;
        this.engine.inputs.get(id)?.push(raw);
      });
      this.onMessage("ready", (client) => {
        const known = this.known.get(client.sessionId);
        if (known) {
          known.selfRev = -1;
          known.pieceRev = 0;
          known.resourceRev = 0;
          known.dropRev = -1;
        }
      });
      this.onMessage("stop", (client) => {
        const id = this.online.get(client.sessionId);
        if (id) this.engine.inputs.get(id)?.stop();
      });
      this.onMessage("intent", (client, raw) => {
        const id = this.online.get(client.sessionId);
        if (!id || !this.rate(client, "actions", 45)) return;
        const parsed = envelope.safeParse(raw);
        if (!parsed.success) {
          client.send(
            "notice",
            "Invalid action · refresh if the game was updated",
          );
          return;
        }
        const { action, requestId } = parsed.data;
        void this.serial(async () => {
          if (!this.online.has(client.sessionId)) return;
          if (this.paused) {
            client.send("result", {
              requestId,
              ok: false,
              error: "Saving unavailable · please wait",
            });
            return;
          }
          try {
            const message = this.engine.apply(
              id,
              action as FpsAction,
              requestId,
            );
            const known = this.known.get(client.sessionId)!;
            if (action.type === "inspect") known.station = action.id;
            if (
              action.type !== "inspect" &&
              action.type !== "fire" &&
              action.type !== "reload" &&
              action.type !== "equip"
            )
              await this.persist();
            // Fire/reload checkpoint asynchronously; never put movement behind a database round trip.
            client.send("result", {
              requestId,
              ok: true,
              message,
              self: this.engine.privateState(id, known.station),
            });
          } catch (error) {
            client.send("result", {
              requestId,
              ok: false,
              error: error instanceof Error ? error.message : "Action failed",
              self: this.engine.privateState(
                id,
                this.known.get(client.sessionId)?.station,
              ),
            });
          }
        });
      });
      this.setSimulationInterval(() => {
        const now = Date.now(),
          dt = Math.min(0.1, (now - this.last) / 1000);
        this.last = now;
        if (
          !this.paused &&
          (this.online.size ||
            Object.values(this.engine.world.players).some(
              (p) => p.combatUntil > now,
            ))
        )
          this.engine.step(dt, now);
        if (++this.frames % 2 === 0) this.sync(now);
        if (now > this.checkpoint && !this.saving) {
          this.checkpoint = now + (this.paused ? 5000 : 2000);
          void this.serial(() => this.persist()).catch(() => {});
        }
      }, 50);
    }
    rate(client: Client, type: "actions" | "inputs", max: number) {
      const now = Date.now();
      let r = this.rates.get(client.sessionId);
      if (!r || now - r.at > 1000) {
        r = { at: now, actions: 0, inputs: 0 };
        this.rates.set(client.sessionId, r);
      }
      return ++r[type] <= max;
    }
    serial<T>(fn: () => Promise<T>) {
      const next = this.queue.then(fn);
      this.queue = next.catch(() => {});
      return next;
    }
    async persist() {
      this.saving = true;
      try {
        const data = this.engine.serialize();
        await pool.query(
          "UPDATE fps_worlds SET data=$1,updated_at=now() WHERE id=1",
          [data],
        );
        this.paused = false;
      } catch (error) {
        this.paused = true;
        console.error(
          "3D world checkpoint failed",
          error instanceof Error ? error.message : "database error",
        );
        throw Error("Saving unavailable · world paused until recovery");
      } finally {
        this.saving = false;
      }
    }
    async onAuth(
      _client: Client,
      options: { token?: string; v?: number; contentVersion?: number },
    ) {
      if (
        options.v !== 1 ||
        typeof options.token !== "string" ||
        options.token.length !== 64
      )
        throw Error("Sign in first or refresh the game");
      if (options.contentVersion !== FPS_CONTENT_VERSION)
        throw Error("City updated · refresh this page");
      const token = createHash("sha256").update(options.token).digest("hex");
      const row = (
        await pool.query(
          "SELECT a.id,a.name FROM accounts a JOIN sessions s ON a.id=s.account WHERE s.token=$1 AND s.expires>$2",
          [token, Date.now()],
        )
      ).rows[0];
      if (!row) throw Error("Session expired · sign in again");
      if ([...this.online.values()].includes(row.id))
        throw Error("Account already connected");
      return row as { id: string; name: string };
    }
    async onJoin(
      client: Client,
      _options: unknown,
      auth: { id: string; name: string },
    ) {
      await this.serial(async () => {
        if ([...this.online.values()].includes(auth.id))
          throw Error("Account already connected");
        if (this.paused) throw Error("World saving unavailable");
        this.online.set(client.sessionId, auth.id);
        this.known.set(client.sessionId, {
          pieceRev: 0,
          resourceRev: 0,
          dropRev: -1,
          cell: "",
          selfRev: -1,
        });
        this.engine.addPlayer(auth.id, auth.name);
        try {
          await this.persist();
        } catch (error) {
          this.online.delete(client.sessionId);
          this.known.delete(client.sessionId);
          this.engine.leave(auth.id);
          throw error;
        }
        this.sync(Date.now());
      });
    }
    onLeave(client: Client) {
      const id = this.online.get(client.sessionId);
      this.online.delete(client.sessionId);
      this.known.delete(client.sessionId);
      this.rates.delete(client.sessionId);
      if (id) {
        this.engine.leave(id);
        void this.serial(() => this.persist()).catch(() => {});
      }
    }
    sync(now: number) {
      const players = this.engine.publicPlayers(now);
      for (const client of this.clients) {
        const id = this.online.get(client.sessionId),
          known = this.known.get(client.sessionId);
        if (!id || !known) continue;
        const p = this.engine.world.players[id];
        const self =
          known.selfRev !== p.rev || known.station
            ? this.engine.privateState(id, known.station)
            : undefined;
        const snapshot: FpsSnapshot = {
          v: 1,
          id,
          serverTime: now,
          ack: this.engine.inputs.get(id)?.ack ?? 0,
          pose: p.pose,
          players: players.filter(
            (v) =>
              v.id === id ||
              Math.hypot(v.pose.x - p.pose.x, v.pose.z - p.pose.z) < 130,
          ),
          npcs: this.engine.world.npcs.filter(
            (v) => Math.hypot(v.enemy.x - p.pose.x, v.enemy.z - p.pose.z) < 130,
          ),
          world: this.engine.worldPatch(id, known),
          ...(self ? { self } : {}),
          paused: this.paused,
        };
        client.send("snapshot", snapshot);
        known.selfRev = p.rev;
      }
      for (const event of this.engine.events.splice(0))
        this.broadcast("event", event);
    }
    async onDispose() {
      await this.queue;
      await this.persist();
    }
  };
}
