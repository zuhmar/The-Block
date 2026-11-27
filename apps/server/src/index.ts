import { FPS_CONTENT_VERSION } from "../../../packages/shared/src/fps-protocol.js";
import { fpsRoom } from "./fps/room.js";
import { MovementInputs } from "./movement-inputs.js";
import { WorldQueue } from "./world-queue.js";
import { Server, Room, matchMaker, type Client } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { z } from "zod";
import { pool, migrate, transaction, load } from "./db.js";
import { readServerConfig } from "./config.js";
import { acquireAuthority } from "./authority.js";
import { commitAction, createPlayer, move, tick, visible } from "./engine.js";
import {
  appearanceSchema,
  envelopeSchema,
  VERSION,
  BUILD_BUDGET,
  type WorldState,
} from "../../../packages/shared/src/index.js";
import { LOOT_CRATES } from "../../../packages/game-data/loot-crates.js";
const config = readServerConfig();
const bootstrap = randomUUID();
let roomId = "";
let fpsRoomId = "";
const app = express();
let authorityReady = false;
app.disable("x-powered-by");
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: "8kb" }));
// Liveness permits Railway to drain the previous instance; readiness remains
// gated by the database lock and both authoritative rooms.
app.get("/live", (_req, res) => res.json({ ok: true }));
app.use((req, res, next) => {
  if (!authorityReady && req.path !== "/health") {
    res.status(503).json({ error: "City starting · reconnect shortly" });
    return;
  }
  next();
});
const attempts = new Map<string, { n: number; until: number }>();
const authSchema = z.object({
  name: z
    .string()
    .trim()
    .regex(/^[a-zA-Z][a-zA-Z0-9_]{2,19}$/),
  password: z.string().min(10).max(128),
  register: z.boolean(),
  appearance: appearanceSchema.optional(),
});
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
app.post(["/auth", "/fps/auth"], async (req, res) => {
  const ip = req.ip || "local";
  let limiter = attempts.get(ip);
  if (!limiter || limiter.until < Date.now()) {
    limiter = { n: 0, until: Date.now() + 60000 };
    attempts.set(ip, limiter);
  }
  if (++limiter.n > 60) {
    res.status(429).json({ error: "Try again in a minute" });
    return;
  }
  try {
    const data = authSchema.parse(req.body);
    const name = data.name.toLowerCase();
    let account = (
      await pool.query("SELECT * FROM accounts WHERE name=$1", [name])
    ).rows[0];
    if (data.register) {
      if (account) throw Error("Name unavailable");
      const salt = randomBytes(16).toString("hex");
      account = {
        id: randomUUID(),
        name,
        password:
          salt + ":" + scryptSync(data.password, salt, 64).toString("hex"),
      };
      await pool.query("INSERT INTO accounts VALUES($1,$2,$3)", [
        account.id,
        name,
        account.password,
      ]);
    }
    if (!account) throw Error("Invalid credentials");
    const [salt, hash] = account.password.split(":");
    if (
      !timingSafeEqual(
        Buffer.from(hash, "hex"),
        scryptSync(data.password, salt, 64),
      )
    )
      throw Error("Invalid credentials");
    if (req.path === "/auth")
      await transaction((w) => {
        if (!w.players[account.id])
          w.players[account.id] = createPlayer(
            account.id,
            data.name,
            data.appearance || {
              skin: "#c98c62",
              hair: "#252939",
              top: "#ec8753",
              body: "standard",
              style: "short",
            },
          );
      });
    const token = randomBytes(32).toString("hex");
    await pool.query(
      "INSERT INTO sessions VALUES($1,$2,$3) ON CONFLICT(account) DO UPDATE SET token=$1,expires=$3",
      [digest(token), account.id, Date.now() + 7 * 86400000],
    );
    res.json({ token });
  } catch (e) {
    res.status(400).json({
      error:
        e instanceof z.ZodError
          ? "Check name and password (10+ characters)"
          : e instanceof Error
            ? e.message
            : "Authentication failed",
    });
  }
});
app.get("/fps/world", (_req, res) => {
  if (!fpsRoomId) {
    res.status(503).json({ error: "City starting" });
    return;
  }
  res.json({
    roomId: fpsRoomId,
    v: 1,
    contentVersion: FPS_CONTENT_VERSION,
    map: "compact-city",
    maxPlayers: 20,
  });
});
app.get("/world", (_req, res) => {
  if (!roomId) {
    res.status(503).json({ error: "City starting" });
    return;
  }
  res.json({
    roomId,
    version: VERSION,
    layout: "top-down",
    construction: "floor-grid-v2",
    roofs: false,
    practiceWoodGrant: 1,
    buildBudget: BUILD_BUDGET,
    lootCrateTiers: LOOT_CRATES.length,
    wildlife: "stray-dogs-v1",
    terrain: "official-world-v3",
    map: {
      width: 16384,
      height: 16384,
      tileSize: 64,
      tiles: 256,
      chunkTiles: 16,
      districts: 5,
      sceneryRevision: 7,
    },
    openGroundBuilding: true,
    visiblePistolShots: true,
  });
});
app.get("/health", async (_req, res) => {
  if (!roomId || !fpsRoomId) {
    res.status(503).json({ ok: false, error: "City starting" });
    return;
  }
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, district: "The Block", protocol: VERSION, fps: 1 });
  } catch {
    res.status(503).json({ ok: false });
  }
});
export class Block extends Room {
  maxClients = 20;
  autoDispose = false;
  online = new Map<string, string>();
  inputs = new Map<string, MovementInputs>();
  movementAcks = new Map<string, number>();
  seq = new Map<string, number>();
  rates = new Map<string, { n: number; time: number }>();
  queue = new WorldQueue((e) => {
    console.error(
      "World operation failed",
      e instanceof Error ? e.message : String(e),
    );
    this.broadcast("notice", "Database unavailable; action was not committed.");
  });
  stateCache!: WorldState;
  lastTick = Date.now();
  async onCreate(options: { bootstrap?: string }) {
    if (options.bootstrap !== bootstrap)
      throw Error("Use the existing city instance");
    this.stateCache = await load();
    this.onMessage("intent", (client, raw) => {
      const rate = this.rates.get(client.sessionId) || {
        n: 0,
        time: Date.now(),
      };
      if (Date.now() - rate.time > 1000) {
        rate.n = 0;
        rate.time = Date.now();
      }
      this.rates.set(client.sessionId, rate);
      if (++rate.n > 45) {
        client.send("notice", "Too many actions");
        return;
      }
      if (raw?.v !== VERSION) {
        client.send("notice", "The city has been updated. Refresh this page.");
        return;
      }
      const parsed = envelopeSchema.safeParse(raw);
      if (!parsed.success) {
        client.send("notice", "Invalid message");
        return;
      }
      const { seq, action, requestId, at } = parsed.data;
      if (Math.abs(Date.now() - at) > 30000) {
        client.send("notice", "Stale message");
        return;
      }
      if (seq <= (this.seq.get(client.sessionId) || 0)) return;
      this.seq.set(client.sessionId, seq);
      const id = this.online.get(client.sessionId);
      if (!id) return;
      if (action.type === "move") {
        let inputs = this.inputs.get(id);
        if (!inputs) {
          inputs = new MovementInputs();
          this.inputs.set(id, inputs);
        }
        inputs.push({
          ...action,
          time: Date.now(),
          seq,
          sessionId: client.sessionId,
        });
        return;
      }
      if (action.type === "chat") {
        this.broadcast("chat", {
          name: this.stateCache.players[id].name,
          text: action.text,
        });
        return;
      }
      this.enqueue(async () => {
        try {
          let message = "";
          this.stateCache = await transaction((w) => {
            message = commitAction(w, id, requestId, at, action);
            return w;
          });
          client.send("notice", message);
          this.sync();
        } catch (e) {
          client.send(
            "notice",
            e instanceof Error ? e.message : "Action failed",
          );
        }
      });
    });
    this.setSimulationInterval(() => {
      void this.queue.tick(() => this.step());
    }, 100);
  }
  enqueue(fn: () => Promise<void>) {
    return this.queue.run(fn);
  }
  async onAuth(_client: Client, options: { token?: string }) {
    if (!options.token) throw Error("Sign in first");
    const row = (
      await pool.query(
        "SELECT account FROM sessions WHERE token=$1 AND expires>$2",
        [digest(options.token), Date.now()],
      )
    ).rows[0];
    if (!row) throw Error("Session expired");
    if ([...this.online.values()].includes(row.account))
      throw Error("Account already connected");
    return row.account;
  }
  async onJoin(client: Client, _options: unknown, auth: string) {
    if ([...this.online.values()].includes(auth))
      throw Error("Account already connected");
    this.online.set(client.sessionId, auth);
    this.seq.set(client.sessionId, 0);
    client.send("welcome", {
      id: auth,
      serverTime: Date.now(),
      version: VERSION,
    });
    await this.enqueue(async () => {
      this.stateCache = await load();
      this.sync();
    });
  }
  onLeave(client: Client) {
    const id = this.online.get(client.sessionId);
    this.online.delete(client.sessionId);
    this.seq.delete(client.sessionId);
    this.rates.delete(client.sessionId);
    if (id) {
      this.inputs.delete(id);
      this.movementAcks.delete(client.sessionId);
    }
  }
  async step() {
    const now = Date.now(),
      dt = Math.min(0.25, (now - this.lastTick) / 1000);
    this.lastTick = now;
    if (
      !this.online.size &&
      !Object.values(this.stateCache.players).some((p) => p.combatUntil > now)
    )
      return;
    const applied: {
      inputs: MovementInputs;
      plan: ReturnType<MovementInputs["plan"]>;
    }[] = [];
    this.stateCache = await transaction((w) => {
      for (const [id, inputs] of this.inputs) {
        const p = w.players[id];
        if (!p) continue;
        const plan = inputs.plan(now, dt);
        for (const { input, dt: duration } of plan.segments)
          move(
            w,
            p,
            input.dir,
            input.sprint,
            input.crouch,
            duration,
            input.dirY,
          );
        applied.push({ inputs, plan });
      }
      tick(w, dt, new Set(this.online.values()), now);
      return w;
    });
    for (const { inputs, plan } of applied) {
      inputs.commit(plan);
      if (plan.last && this.online.has(plan.last.sessionId))
        this.movementAcks.set(plan.last.sessionId, plan.last.seq);
    }
    this.sync();
  }
  sync() {
    const online = new Set([
      ...this.online.values(),
      ...Object.values(this.stateCache.players)
        .filter((p) => p.combatUntil > Date.now())
        .map((p) => p.id),
    ]);
    for (const client of this.clients) {
      const id = this.online.get(client.sessionId);
      if (id && this.stateCache.players[id])
        client.send("snapshot", {
          ...visible(this.stateCache, id, online),
          moveAck: this.movementAcks.get(client.sessionId) || 0,
        });
    }
  }
}
const http = createServer(app);
const game = new Server({
  transport: new WebSocketTransport({ server: http, maxPayload: 65536 }),
});
game.define("block", Block).filterBy([]);
game.define("block3d", fpsRoom(bootstrap)).filterBy([]);
await game.listen(config.port);
// A dedicated PostgreSQL advisory lock forbids a second authority for this city.
const authority = await pool.connect();
await acquireAuthority(
  authority,
  process.env.RAILWAY_DEPLOYMENT_ID ? 90000 : 0,
);
await migrate();

authority.on("error", () => {
  console.error(
    "World authority connection lost; stopping to prevent competing writers",
  );
  process.exit(1);
});
roomId = (await matchMaker.createRoom("block", { bootstrap })).roomId;
fpsRoomId = (await matchMaker.createRoom("block3d", { bootstrap })).roomId;
authorityReady = true;
console.log(`Street Survival authority · listening on port ${config.port}`);
