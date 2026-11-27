import { readServerConfig } from "./config.js";
import pg from "pg";
import { readFile } from "node:fs/promises";
import { emptyWorld, upgradeWorld } from "./engine.js";
import type { WorldState } from "../../../packages/shared/src/index.js";
export const pool = new pg.Pool({
  connectionString: readServerConfig().databaseUrl,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
});
export async function migrate() {
  await pool.query(
    await readFile(
      new URL("../../../prisma/002_fps.sql", import.meta.url),
      "utf8",
    ),
  );
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
  await pool.query(
    "INSERT INTO world_layout_backups(layout,data) SELECT 1,data FROM worlds WHERE id=1 AND COALESCE((data->>'layoutVersion')::integer,1)<2 ON CONFLICT(layout) DO NOTHING",
  );
  const mapBackup = await pool.query(
    "INSERT INTO world_layout_backups(layout,data) SELECT 3,data FROM worlds WHERE id=1 AND COALESCE((data->>'mapVersion')::integer,0)<3 ON CONFLICT(layout) DO NOTHING RETURNING layout",
  );
  if (mapBackup.rowCount)
    console.log(
      "Saved original world as layout backup 3 before official-map migration.",
    );
  const sceneryBackup = await pool.query(
    "INSERT INTO world_layout_backups(layout,data) SELECT 10,data FROM worlds WHERE id=1 AND COALESCE((data->>'sceneryVersion')::integer,0)<7 ON CONFLICT(layout) DO NOTHING RETURNING layout",
  );
  if (sceneryBackup.rowCount)
    console.log(
      "Saved world backup 10 before grid scenery placement revision.",
    );
  await transaction((w) => upgradeWorld(w));
}
export async function transaction<T>(fn: (world: WorldState) => T): Promise<T> {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const { rows } = await db.query(
      "SELECT data FROM worlds WHERE id=1 FOR UPDATE",
    );
    const w = upgradeWorld(rows[0].data as WorldState);
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
  return upgradeWorld(
    (await pool.query("SELECT data FROM worlds WHERE id=1")).rows[0].data,
  );
}
