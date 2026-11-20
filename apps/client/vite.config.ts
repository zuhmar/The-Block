import { defineConfig } from "vite";
import { resolve } from "node:path";
export default defineConfig(() => {
  const envDir = resolve(import.meta.dirname, "../..");
  return {
    envDir,
    // The 3D prototype creates its own geometry; keep legacy sprites in source only.
    publicDir: false as const,
    build: {
      rollupOptions: {
        output: {
          manualChunks: { three: ["three"] },
        },
      },
    },
  };
});
