import { defineConfig } from "vite";
import { resolve } from "node:path";
export default defineConfig(() => {
  const envDir = resolve(import.meta.dirname, "../..");
  return {
    envDir,
    // Ship intentional 3D asset downloads; keep legacy public/ sprites in source only.
    publicDir: "static",
    build: {
      rollupOptions: {
        output: {
          manualChunks: { three: ["three"] },
        },
      },
    },
  };
});
