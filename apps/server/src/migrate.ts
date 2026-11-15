import { migrate, pool } from "./db.js";
await migrate();
await pool.end();
console.log("PostgreSQL schema and empty district ready.");
