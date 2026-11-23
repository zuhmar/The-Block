import * as THREE from "three";
import { type PieceKind } from "./world";
const URLS = {
  floor: new URL("./models/build-wood/floor.glb", import.meta.url).href,
  wall: new URL("./models/build-wood/wall.glb", import.meta.url).href,
  foundation: new URL("./models/build-wood/foundation.glb", import.meta.url)
    .href,
  doorway: new URL("./models/build-wood/doorway.glb", import.meta.url).href,
  door: new URL("./models/build-wood/door.glb", import.meta.url).href,
};
const loaded = new Map<string, THREE.Group>();
export async function preloadWoodBuildings() {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const loader = new GLTFLoader();
  await Promise.allSettled(
    Object.entries(URLS).map(async ([kind, url]) => {
      const gltf = await loader.loadAsync(url);
      loaded.set(kind, gltf.scene);
    }),
  );
}
export function woodBuildingModel(kind: PieceKind) {
  return loaded.get(kind)?.clone(true);
}
export function woodBuildingSources() {
  return Object.keys(URLS)
    .map((kind) => kind + ":" + (loaded.has(kind) ? "meshy" : "fallback"))
    .join(",");
}
