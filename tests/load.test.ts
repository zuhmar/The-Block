import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, createHash, scryptSync } from "node:crypto";
import { writeFile } from "node:fs/promises";
import pg from "pg";
import { Client, type Room } from "colyseus.js";
import { createPlayer, emptyWorld } from "../apps/server/src/engine.js";
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
test("20 real network clients share a single city with bounded snapshot gaps", async () => {
  const base =
    process.env.DATABASE_URL ||
    "postgresql://street:local-development-only@127.0.0.1:5432/street";
  const admin = new pg.Pool({ connectionString: base });
  const name = "street_load_" + process.pid;
  await admin.query(`CREATE DATABASE ${name}`);
  const url = new URL(base);
  url.pathname = "/" + name;
  const db = new pg.Pool({ connectionString: url.toString() });
  const rooms: Room[] = [];
  const gaps: number[] = [];
  const frames = new Map<number, number>();
  const last = new Map<number, number>();
  const views = new Map<number, any>();
  let logs = "";
  const server = spawn(
    process.execPath,
    ["--import", "tsx", "apps/server/src/index.ts"],
    {
      env: { ...process.env, PORT: "2569", DATABASE_URL: url.toString() },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout?.on("data", (b) => (logs += b));
  server.stderr?.on("data", (b) => (logs += b));
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try {
        const res = await fetch("http://127.0.0.1:2569/world");
        const data = await res.json();
        if (data.roomId) {
          ready = true;
          break;
        }
      } catch {
        /* Server is starting. */
      }
      await pause(50);
    }
    assert(ready, logs);
    const w = emptyWorld(),
      tokens: string[] = [];
    const look = {
      skin: "#c98c62",
      hair: "#252939",
      top: "#ec8753",
      body: "standard",
      style: "short",
    } as const;
    const hash =
      "test-salt:" +
      scryptSync("test-only-password", "test-salt", 64).toString("hex");
    for (let i = 0; i < 21; i++) {
      const id = "load-" + i;
      const token = randomBytes(32).toString("hex");
      tokens.push(token);
      await db.query("INSERT INTO accounts VALUES($1,$2,$3)", [
        id,
        "loaduser" + i,
        hash,
      ]);
      await db.query("INSERT INTO sessions VALUES($1,$2,$3)", [
        createHash("sha256").update(token).digest("hex"),
        id,
        Date.now() + 60000,
      ]);
      w.players[id] = createPlayer(id, "Load " + i, look);
    }
    // Seed before any players connect; the authority reloads on join.
    await db.query("UPDATE worlds SET data=$1 WHERE id=1", [JSON.stringify(w)]);
    const { roomId } = await (
      await fetch("http://127.0.0.1:2569/world")
    ).json();
    for (let i = 0; i < 20; i++) {
      const r = await new Client("ws://127.0.0.1:2569").joinById(roomId, {
        token: tokens[i],
      });
      rooms.push(r);
      r.onMessage("welcome", () => {});
      r.onMessage("notice", () => {});
      r.onMessage("chat", () => {});
      r.onMessage("snapshot", (s) => {
        const now = performance.now();
        if (last.has(i)) gaps.push(now - last.get(i)!);
        last.set(i, now);
        frames.set(i, (frames.get(i) || 0) + 1);
        views.set(i, s);
      });
    }
    await assert.rejects(
      new Client("ws://127.0.0.1:2569").joinById(roomId, { token: tokens[20] }),
    );
    const started = performance.now();
    for (let step = 0; step < 25; step++) {
      for (const r of rooms)
        r.send("intent", {
          v: 2,
          requestId: crypto.randomUUID(),
          at: Date.now(),
          seq: step + 1,
          action: {
            type: "move",
            dir: step < 10 ? 1 : step < 20 ? -1 : 0,
            sprint: false,
            crouch: false,
          },
        });
      await pause(200);
    }
    const elapsed = performance.now() - started;
    assert.equal(views.size, 20);
    for (const s of views.values()) assert.equal(s.players.length, 20);
    assert([...frames.values()].every((n) => n >= 30));
    gaps.sort((a, b) => a - b);
    const p95 = gaps[Math.floor(gaps.length * 0.95)];
    assert(p95 < 500, `p95 snapshot interval ${p95}ms`);
    const report = {
      testedAt: new Date().toISOString(),
      clients: 20,
      durationMs: Math.round(elapsed),
      snapshots: [...frames.values()].reduce((a, b) => a + b, 0),
      p95SnapshotGapMs: Math.round(p95),
      maxSnapshotGapMs: Math.round(gaps.at(-1)!),
      scope:
        "5-second local network smoke test; no browser rendering or sustained production capacity claim",
    };
    await writeFile(
      "docs/load-smoke.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log("Load smoke:", JSON.stringify(report));
  } finally {
    for (const r of rooms)
      try {
        await r.leave();
      } catch {
        /* Already closed. */
      }
    server.kill("SIGTERM");
    await new Promise((r) => server.once("exit", r));
    await db.end();
    await admin.query(`DROP DATABASE ${name}`);
    await admin.end();
  }
});
