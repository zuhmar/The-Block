import * as THREE from "three";
const loaded = new Map<string, THREE.Group>();
export async function preloadCraftingModels() {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js"),
    loader = new GLTFLoader();
  await Promise.allSettled(
    [
      "station-workbench",
      "station-furnace",
      "item-sulfur-refined",
      "item-metal-fragments",
      "item-charcoal",
      "item-gunpowder",
    ].map(async (key) =>
      loaded.set(
        key,
        (await loader.loadAsync(`/assets/crafting/${key}.glb`)).scene,
      ),
    ),
  );
}
export const stationModel = (kind: string) =>
  loaded.get("station-" + kind)?.clone(true);
export const craftingMaterialModel = (kind: string) =>
  loaded.get("item-" + kind)?.clone(true);
export const craftingSources = () => [...loaded.keys()];
