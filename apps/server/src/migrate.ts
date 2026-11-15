import { migrate, pool } from "./db.js";
import { acquireAuthority } from "./authority.js";
const authority = await pool.connect();
try {
  await acquireAuthority(authority);
  await migrate();
  console.log("PostgreSQL schema and district migration ready.");
} finally {
  authority.release();
  await pool.end();
}
