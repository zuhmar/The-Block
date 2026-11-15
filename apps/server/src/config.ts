import "dotenv/config";

export function readServerConfig(env: NodeJS.ProcessEnv = process.env) {
  const production = env.NODE_ENV === "production";
  if (production && (!env.DATABASE_URL || !env.CLIENT_ORIGIN)) {
    throw new Error("Production requires DATABASE_URL and CLIENT_ORIGIN");
  }
  const databaseUrl =
    env.DATABASE_URL ||
    "postgresql://street:local-development-only@127.0.0.1:5432/street";
  let database: URL;
  try {
    database = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a PostgreSQL connection URL");
  }
  if (!["postgres:", "postgresql:"].includes(database.protocol)) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection URL");
  }
  let client: URL;
  try {
    client = new URL(env.CLIENT_ORIGIN || "http://localhost:5173");
  } catch {
    throw new Error("CLIENT_ORIGIN must be a frontend origin");
  }
  if (
    !["https:", "http:"].includes(client.protocol) ||
    client.pathname !== "/" ||
    client.search ||
    client.hash ||
    client.username ||
    client.password ||
    (production && client.protocol !== "https:")
  ) {
    throw new Error(
      "CLIENT_ORIGIN must be an exact frontend origin (HTTPS in production)",
    );
  }
  const port = Number(env.PORT || 2567);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer from 1 to 65535");
  }
  return { databaseUrl, clientOrigin: client.origin, port };
}
