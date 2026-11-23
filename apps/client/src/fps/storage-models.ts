import * as THREE from "three";
import { storageSize, type StorageSize } from "./storage-spec";
const loaded = new Map<StorageSize, THREE.Group>();
export async function preloadStorageModels() {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const loader = new GLTFLoader();
  await Promise.allSettled(
    (["small", "large"] as const).map(async (size) => {
      loaded.set(
        size,
        (await loader.loadAsync(`/assets/player-storage/chest-${size}.glb`))
          .scene,
      );
    }),
  );
}
export const storageModel = (piece: { storageSize?: unknown }) =>
  loaded.get(storageSize(piece))?.clone(true);
