import { defineConfig, loadEnv } from "vite";
import { resolve } from "node:path";
export default defineConfig(({ mode }) => {
  const envDir = resolve(import.meta.dirname, "../..");
  const env = loadEnv(mode, envDir, "VITE_");
  if (process.env.VERCEL === "1") {
    const value = process.env.VITE_SERVER_URL || env.VITE_SERVER_URL;
    if (!value)
      throw new Error(
        "Set VITE_SERVER_URL to the HTTPS multiplayer server URL in Vercel before deploying",
      );
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error("VITE_SERVER_URL must be a valid HTTPS URL");
    }
    if (
      url.protocol !== "https:" ||
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    )
      throw new Error(
        "Vercel requires an HTTPS multiplayer server origin without a path or credentials",
      );
  }
  return {
    envDir,
    build: {
      rollupOptions: {
        output: {
          manualChunks: { phaser: ["phaser"], network: ["colyseus.js"] },
        },
      },
    },
  };
});
