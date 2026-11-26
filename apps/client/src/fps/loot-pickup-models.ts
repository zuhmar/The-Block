import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { isLootItem, lootModelUrl, lootItemSpec } from "./loot-item-spec";
const pending = new Map<string, Promise<THREE.Group | undefined>>();
const ready = new Map<string, THREE.Group>();
export function cachedLootModel(kind: string) {
  return ready.get(kind)?.clone(true);
}
export function loadLootModel(kind: string): Promise<THREE.Group | undefined> {
  if (!isLootItem(kind)) return Promise.resolve(undefined);
  if (!pending.has(kind))
    pending.set(
      kind,
      (async () => {
        try {
          const g = await new GLTFLoader().loadAsync(lootModelUrl(kind));
          const textures = new Set<THREE.Texture>();
          g.scene.traverse((o) => {
            if (o instanceof THREE.Mesh)
              for (const m of Array.isArray(o.material)
                ? o.material
                : [o.material])
                if (m instanceof THREE.MeshStandardMaterial && m.map)
                  textures.add(m.map);
          });
          for (const texture of textures) {
            const source = texture.image as ImageBitmap | undefined;
            if (
              source &&
              source.width > 512 &&
              typeof createImageBitmap === "function"
            ) {
              const image = await createImageBitmap(source, {
                resizeWidth: 512,
                resizeHeight: 512,
                resizeQuality: "high",
              });
              texture.image = image;
              texture.needsUpdate = true;
            }
          }
          g.scene.userData.itemSource = "meshy";
          g.scene.userData.lootItem = kind;
          ready.set(kind, g.scene);
          return g.scene;
        } catch (error) {
          console.warn("Unable to load loot pickup", kind, error);
          return undefined;
        }
      })(),
    );
  return pending.get(kind)!;
}
export function fitLootModel(model: THREE.Group, kind: string, held = false) {
  const length = lootItemSpec(kind)?.longest ?? 0.3;
  model.scale.setScalar(
    held ? 0.42 / length : Math.max(0.18, Math.min(0.7, length)) / length,
  );
  return model;
}
export const lootModelStats = () => ({
  requested: pending.size,
  loaded: ready.size,
  kinds: [...ready.keys()],
});
