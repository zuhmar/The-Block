import { test, after } from "node:test";
import assert from "node:assert/strict";
import { pool, migrate, transaction, load } from "../apps/server/src/db.js";
import { acquireAuthority } from "../apps/server/src/authority.js";
import { createPlayer, act, emptyWorld } from "../apps/server/src/engine.js";
const look = {
  skin: "#c98c62",
  hair: "#252939",
  top: "#ec8753",
  body: "standard",
  style: "short",
} as const;
// Isolated database: never reset a developer's shared city.
const testDb = "street_test_" + process.pid;
const admin = pool;
let isolated: typeof pool;
test("PostgreSQL concurrent claims serialize, failed actions roll back, raiding survives fresh connection", async () => {
  await admin.query(`CREATE DATABASE ${testDb}`);
  const pg = await import("pg");
  const base =
    process.env.DATABASE_URL ||
    "postgresql://street:local-development-only@127.0.0.1:5432/street";
  const url = new URL(base);
  url.pathname = "/" + testDb;
  isolated = new pg.default.Pool({ connectionString: url.toString() });
  // Route the imported repository through an isolated database for this process.
  const originalConnect = pool.connect.bind(pool),
    originalQuery = pool.query.bind(pool);
  pool.connect = isolated.connect.bind(isolated);
  pool.query = isolated.query.bind(isolated);
  try {
    await migrate();
    await transaction((w) => {
      const a = createPlayer("a", "A", look),
        b = createPlayer("b", "B", look);
      a.x = b.x = 7096;
      a.y = b.y = 1344;
      w.players = { a, b };
      w.bags.bag = {
        id: "bag",
        x: 7096,
        y: 1344,
        cash: 0,
        inventory: { scrap: 1 },
      };
    });
    const results = await Promise.allSettled(
      ["a", "b"].map((id) =>
        transaction((w) =>
          act(w, id, { type: "loot", id: "bag", item: "scrap" }),
        ),
      ),
    );
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    let saved = await load();
    assert.equal(
      Object.values(saved.players).reduce(
        (s, p) => s + (p.inventory.scrap || 0),
        0,
      ),
      1,
    );
    await assert.rejects(
      transaction((w) => {
        w.players.a.cash = 999;
        throw Error("Simulated database action failure");
      }),
    );
    saved = await load();
    assert.equal(saved.players.a.cash, 10);
    await transaction((w) => {
      w.players.a.inventory = { wood: 50 };
      w.players.a.x = 7096;
      w.players.a.y = 1344;
      act(w, "a", { type: "build", kind: "foundation", x: 7104 });
      const f = Object.values(w.structures)[0];
      act(w, "a", {
        type: "build",
        kind: "door",
        x: 7136,
        y: 1280,
        foundation: f.id,
      });
      const d = Object.values(w.structures).find((s) => s.kind === "door")!;
      const b = w.players.b;
      b.x = 7126;
      b.y = 1344;
      b.protected = false;
      b.inventory.bat = 1;
      b.weapon = "bat";
      b.facing = 1;
      for (let i = 0; i < 5; i++)
        act(
          w,
          "b",
          { type: "attack", target: d.id, weapon: "bat" },
          Date.now() + i * 700,
        );
    });
    const fresh = new pg.default.Pool({ connectionString: url.toString() });
    const state = (await fresh.query("SELECT data FROM worlds WHERE id=1"))
      .rows[0].data;
    assert.equal(
      Object.values(state.structures).find((s: any) => s.kind === "door") &&
        (
          Object.values(state.structures).find(
            (s: any) => s.kind === "door",
          ) as any
        ).hp,
      0,
    );
    await fresh.end();
    const legacy = JSON.parse(JSON.stringify(await load()));
    delete legacy.layoutVersion;
    for (const p of Object.values(legacy.players) as any[]) delete p.y;
    for (const s of Object.values(legacy.structures) as any[]) delete s.y;
    await pool.query("UPDATE worlds SET data=$1 WHERE id=1", [
      JSON.stringify(legacy),
    ]);
    await migrate();
    await migrate();
    const backup = (
      await pool.query("SELECT data FROM world_layout_backups WHERE layout=1")
    ).rows;
    assert.equal(backup.length, 1);
    assert.deepEqual(backup[0].data, legacy);
    const migrated = await load();
    assert.equal(migrated.layoutVersion, 2);
    assert.deepEqual(migrated.players.a.inventory, legacy.players.a.inventory);
    assert.equal(
      Object.values(migrated.structures).find((s) => s.kind === "door")!.hp,
      0,
    );

    const oldMap = JSON.parse(JSON.stringify(migrated));
    delete oldMap.mapVersion;
    delete oldMap.mapReservations;
    await pool.query("DELETE FROM world_layout_backups WHERE layout=3");
    await pool.query("UPDATE worlds SET data=$1 WHERE id=1", [
      JSON.stringify(oldMap),
    ]);
    await migrate();
    await migrate();
    const mapBackup = (
      await pool.query("SELECT data FROM world_layout_backups WHERE layout=3")
    ).rows;
    assert.equal(mapBackup.length, 1);
    assert.deepEqual(mapBackup[0].data, oldMap);
    const newMap = await load();
    assert.equal(newMap.mapVersion, 3);
    assert.deepEqual(newMap.players.a.inventory, oldMap.players.a.inventory);
    for (const [id, s] of Object.entries(oldMap.structures) as [
      string,
      any,
    ][]) {
      assert.equal(newMap.structures[id].x, s.x + 4096);
      assert.equal(newMap.structures[id].y, (s.y ?? 1344) + 4096);
      assert.equal(newMap.structures[id].owner, s.owner);
      assert.deepEqual(newMap.structures[id].inventory, s.inventory);
    }

    const predecessor = await pool.connect(),
      successor = await pool.connect(),
      observer = await pool.connect();
    try {
      await acquireAuthority(predecessor);
      const transition = acquireAuthority(successor, 7096);
      await new Promise((resolve) => setTimeout(resolve, 150));
      assert(
        !(await observer.query("SELECT pg_try_advisory_lock(739481) AS locked"))
          .rows[0].locked,
      );
      await predecessor.query("SELECT pg_advisory_unlock(739481)");
      await transition;
      assert(
        !(await observer.query("SELECT pg_try_advisory_lock(739481) AS locked"))
          .rows[0].locked,
      );
      await successor.query("SELECT pg_advisory_unlock(739481)");
    } finally {
      predecessor.release();
      successor.release();
      observer.release();
    }
    assert.deepEqual(Object.keys(emptyWorld().players), []);
  } finally {
    pool.connect = originalConnect;
    pool.query = originalQuery;
    await isolated.end();
    await admin.query(`DROP DATABASE ${testDb}`);
  }
});
after(async () => {
  await pool.end();
});
