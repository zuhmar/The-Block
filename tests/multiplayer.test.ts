import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { Client, type Room } from "colyseus.js";
import pg from "pg";
const base =
  process.env.DATABASE_URL ||
  "postgresql://street:local-development-only@127.0.0.1:5432/street";
const wait = (n: number) => new Promise((r) => setTimeout(r, n));
const until = async (fn: () => boolean | Promise<boolean>, timeout = 10000) => {
  const start = Date.now();
  while (!(await fn())) {
    if (Date.now() - start > timeout)
      throw Error("Timed out waiting for condition");
    await wait(50);
  }
};
test("real WebSocket clients: authentication, movement, replay, chat, reconnect and process restart", async () => {
  const admin = new pg.Pool({ connectionString: base });
  const dbname = "street_ws_" + process.pid;
  await admin.query(`CREATE DATABASE ${dbname}`);
  const url = new URL(base);
  url.pathname = "/" + dbname;
  const db = new pg.Pool({ connectionString: url.toString() });
  let server: ChildProcess | undefined;
  const rooms: Room[] = [];
  let logs = "";
  const endpoint = "http://127.0.0.1:2568";
  async function start() {
    server = spawn(
      process.execPath,
      ["--import", "tsx", "apps/server/src/index.ts"],
      {
        cwd: process.cwd(),
        env: { ...process.env, PORT: "2568", DATABASE_URL: url.toString() },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    server.stdout?.on("data", (b) => (logs += b));
    server.stderr?.on("data", (b) => (logs += b));
    await until(async () => {
      try {
        return (await fetch(endpoint + "/world")).ok;
      } catch {
        return false;
      }
    });
  }
  async function stop() {
    if (server?.exitCode === null) {
      server.kill("SIGTERM");
      await new Promise((r) => server!.once("exit", r));
    }
  }
  async function token(name: string, register: boolean) {
    const res = await fetch(endpoint + "/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        password: "a-long-test-password",
        register,
      }),
    });
    const data = await res.json();
    assert(res.ok, JSON.stringify(data));
    return data.token;
  }
  const snapshots = new Map<Room, any>();
  async function connect(t: string) {
    const { roomId } = await (await fetch(endpoint + "/world")).json();
    const r = await new Client(endpoint.replace("http", "ws")).joinById(
      roomId,
      { token: t },
    );
    rooms.push(r);
    r.onMessage("welcome", () => {});
    r.onMessage("notice", () => {});
    r.onMessage("chat", () => {});
    r.onMessage("snapshot", (s) => snapshots.set(r, s));
    await until(() => snapshots.has(r));
    return r;
  }
  try {
    await start();
    const t1 = await token("walkerone", true),
      t2 = await token("walkertwo", true);
    const a = await connect(t1),
      b = await connect(t2);
    await until(
      () =>
        snapshots.get(a).players.length === 2 &&
        snapshots.get(b).players.length === 2,
    );
    const aid = snapshots.get(a).self.id,
      x = snapshots.get(a).self.x;
    let seq = 1;
    for (let i = 0; i < 5; i++) {
      a.send("intent", {
        v: 1,
        requestId: crypto.randomUUID(),
        at: Date.now(),
        seq: seq++,
        action: { type: "move", dir: 1, sprint: false, crouch: false },
      });
      await wait(100);
    }
    a.send("intent", {
      v: 1,
      requestId: crypto.randomUUID(),
      at: Date.now(),
      seq: seq++,
      action: { type: "move", dir: 0, sprint: false, crouch: false },
    });
    await until(
      () => snapshots.get(b).players.find((p: any) => p.id === aid).x > x + 30,
    );
    const moved = snapshots.get(a).self.x;
    assert(moved < x + 130, "Server constrains movement");
    a.send("intent", {
      v: 1,
      requestId: crypto.randomUUID(),
      at: Date.now(),
      seq: 1,
      action: { type: "move", dir: -1, sprint: true, crouch: false },
    });
    await wait(250);
    assert(
      Math.abs(snapshots.get(a).self.x - moved) < 20,
      "Replayed sequence rejected",
    );
    let said = "";
    b.onMessage("chat", (c) => (said = c.text));
    a.send("intent", {
      v: 1,
      requestId: crypto.randomUUID(),
      at: Date.now(),
      seq: seq++,
      action: { type: "chat", text: "Real clients share a city" },
    });
    await until(() => said === "Real clients share a city");
    await a.leave();
    await wait(150);
    const rejoined = await connect(t1);
    assert.equal(snapshots.get(rejoined).self.id, aid);
    assert(Math.abs(snapshots.get(rejoined).self.x - moved) < 20);
    for (const r of rooms) if (r.connection.isOpen) await r.leave();
    await stop();
    await start();
    const again = await connect(await token("walkerone", false));
    assert.equal(snapshots.get(again).self.id, aid);
    assert(Math.abs(snapshots.get(again).self.x - moved) < 20);
    const stored = (await db.query("SELECT password FROM accounts LIMIT 1"))
      .rows[0].password;
    assert(!stored.includes("a-long-test-password"));
    assert(stored.includes(":"));
    assert(logs.includes("Street Survival authority"));
    // The owner goes offline. Seed a known base fixture, then raid through real messages.
    await again.leave();
    await stop();
    const persisted = (await db.query("SELECT data FROM worlds WHERE id=1"))
      .rows[0].data;
    const owner = persisted.players[aid],
      raider = Object.values(persisted.players).find(
        (p: any) => p.id !== aid,
      ) as any;
    owner.inventory = { wood: 20 };
    raider.x = 3050;
    raider.lane = "parcel";
    raider.parcel = "offline-foundation";
    raider.protected = false;
    raider.facing = 1;
    raider.weapon = "bat";
    raider.inventory = { bat: 1 };
    raider.energy = 100;
    raider.attackAt = 0;
    persisted.structures = {
      "offline-foundation": {
        id: "offline-foundation",
        kind: "foundation",
        x: 3008,
        owner: aid,
        foundation: "offline-foundation",
        hp: 9999,
        open: false,
        inventory: {},
        cash: 0,
      },
      "offline-door": {
        id: "offline-door",
        kind: "door",
        x: 3072,
        owner: aid,
        foundation: "offline-foundation",
        hp: 80,
        open: false,
        inventory: {},
        cash: 0,
      },
      "offline-crate": {
        id: "offline-crate",
        kind: "storage",
        x: 3136,
        owner: aid,
        foundation: "offline-foundation",
        hp: 60,
        open: false,
        inventory: { scrap: 1 },
        cash: 0,
      },
    };
    await db.query("UPDATE worlds SET data=$1 WHERE id=1", [
      JSON.stringify(persisted),
    ]);
    await start();
    const attacker = await connect(t2);
    let raidSeq = 1;
    for (let i = 0; i < 5; i++) {
      attacker.send("intent", {
        v: 1,
        requestId: crypto.randomUUID(),
        at: Date.now(),
        seq: raidSeq++,
        action: { type: "attack", weapon: "bat", target: "offline-door" },
      });
      await wait(700);
    }
    await until(
      () =>
        snapshots
          .get(attacker)
          .structures.find((s: any) => s.id === "offline-door").hp === 0,
    );
    assert(
      !snapshots.get(attacker).players.some((p: any) => p.id === aid),
      "Owner remains offline",
    );
    attacker.send("intent", {
      v: 1,
      requestId: crypto.randomUUID(),
      at: Date.now(),
      seq: raidSeq++,
      action: { type: "loot", id: "offline-crate", item: "scrap" },
    });
    await until(() => snapshots.get(attacker).self.inventory.scrap === 1);
    await attacker.leave();
    await stop();
    await start();
    const afterRaid = await connect(t2);
    assert.equal(
      snapshots
        .get(afterRaid)
        .structures.find((s: any) => s.id === "offline-door").hp,
      0,
    );
    assert.equal(
      snapshots
        .get(afterRaid)
        .structures.find((s: any) => s.id === "offline-foundation").hp,
      9999,
    );
    assert.equal(snapshots.get(afterRaid).self.inventory.scrap, 1);
    assert(
      !snapshots
        .get(afterRaid)
        .structures.find((s: any) => s.id === "offline-crate").inventory.scrap,
    );
  } finally {
    for (const r of rooms)
      try {
        if (r.connection.isOpen) await r.leave();
      } catch {
        /* Disconnected rooms require no cleanup. */
      }
    await stop();
    await db.end();
    await admin.query(`DROP DATABASE ${dbname}`);
    await admin.end();
  }
});
