import { test, after } from "node:test";
import assert from "node:assert/strict";
import { pool, migrate, transaction, load } from "../apps/server/src/db.js";
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
      a.x = b.x = 3000;
      w.players = { a, b };
      w.bags.bag = { id: "bag", x: 3000, cash: 0, inventory: { scrap: 1 } };
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
      w.players.a.x = 3000;
      act(w, "a", { type: "build", kind: "foundation", x: 3008 });
      const f = Object.values(w.structures)[0];
      act(w, "a", { type: "build", kind: "door", x: 3072, foundation: f.id });
      const d = Object.values(w.structures).find((s) => s.kind === "door")!;
      const b = w.players.b;
      b.x = 3040;
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
