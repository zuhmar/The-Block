import "dotenv/config";
import pg from "pg";
import { readFile } from "node:fs/promises";
import { emptyWorld } from "./engine.js";
import type { WorldState } from "../../../packages/shared/src/index.js";
export const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://street:local-development-only@127.0.0.1:5432/street",
});
export async function migrate() {
  await pool.query(
    await readFile(
      new URL("../../../prisma/001_init.sql", import.meta.url),
      "utf8",
    ),
  );
  await pool.query(
    "INSERT INTO worlds(id,data) VALUES(1,$1) ON CONFLICT DO NOTHING",
    [JSON.stringify(emptyWorld())],
  );
}
export async function transaction<T>(fn: (world: WorldState) => T): Promise<T> {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const { rows } = await db.query(
      "SELECT data FROM worlds WHERE id=1 FOR UPDATE",
    );
    const w = rows[0].data as WorldState;
    const result = fn(w);
    await db.query("UPDATE worlds SET data=$1 WHERE id=1", [JSON.stringify(w)]);
    await db.query("COMMIT");
    return result;
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    db.release();
  }
}
export async function load(): Promise<WorldState> {
  return (await pool.query("SELECT data FROM worlds WHERE id=1")).rows[0].data;
}
