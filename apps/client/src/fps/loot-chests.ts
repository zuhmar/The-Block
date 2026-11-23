import * as THREE from "three";

const URLS = [
  new URL("./models/loot-chests/tier-1-small.glb", import.meta.url).href,
  new URL("./models/loot-chests/tier-2-supply.glb", import.meta.url).href,
  new URL("./models/loot-chests/tier-3-reinforced.glb", import.meta.url).href,
  new URL("./models/loot-chests/tier-4-long.glb", import.meta.url).href,
  new URL("./models/loot-chests/tier-5-heavy.glb", import.meta.url).href,
];
const loaded = new Map<number, THREE.Group>();
export async function preloadLootChests() {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const loader = new GLTFLoader();
  await Promise.allSettled(
    URLS.map(async (url, index) => {
      const gltf = await loader.loadAsync(url);
      loaded.set(index + 1, gltf.scene);
    }),
  );
}
export function lootChestModel(tier: number) {
  return loaded.get(tier)?.clone(true);
}
export function lootChestSources() {
  return URLS.map(
    (_, i) => `${i + 1}:${loaded.has(i + 1) ? "meshy" : "fallback"}`,
  ).join(",");
}
