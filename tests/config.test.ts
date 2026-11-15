import { test } from "node:test";
import assert from "node:assert/strict";
import { readServerConfig } from "../apps/server/src/config.js";

test("production configuration rejects missing credentials and insecure or malformed origins", () => {
  const env = {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://user:pass@db.internal:5432/street",
    CLIENT_ORIGIN: "https://the-block.example",
  };
  assert.throws(() => readServerConfig({ NODE_ENV: "production" }), /requires/);
  assert.throws(
    () =>
      readServerConfig({ ...env, CLIENT_ORIGIN: "http://the-block.example" }),
    /HTTPS/,
  );
  assert.throws(
    () =>
      readServerConfig({
        ...env,
        CLIENT_ORIGIN: "https://the-block.example/game",
      }),
    /origin/,
  );
  assert.throws(
    () => readServerConfig({ ...env, DATABASE_URL: "https://db.example" }),
    /PostgreSQL/,
  );
  assert.throws(() => readServerConfig({ ...env, PORT: "invalid" }), /PORT/);
  assert.equal(
    readServerConfig({
      ...env,
      CLIENT_ORIGIN: "https://the-block.example/",
      PORT: "8080",
    }).clientOrigin,
    "https://the-block.example",
  );
  assert.equal(readServerConfig({ ...env, PORT: "8080" }).port, 8080);
});

test("local development retains working defaults without cloud credentials", () => {
  const config = readServerConfig({});
  assert.equal(config.port, 2567);
  assert.equal(config.clientOrigin, "http://localhost:5173");
  assert(config.databaseUrl.includes("127.0.0.1:5432"));
});
