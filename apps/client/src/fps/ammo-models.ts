import * as THREE from "three";
import { ammoModelKind } from "./ammo";
const models = new Map<string, THREE.Group>();
export async function preloadAmmoModels() {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const loader = new GLTFLoader();
  await Promise.allSettled(
    [
      ...["pistol", "smg", "rifle", "sniper", "lmg", "rockets"].map(
        (k) => `ammo-${k}`,
      ),
      ...["pistol", "smg", "rifle", "sniper", "lmg"].map(
        (k) => `projectile-${k}`,
      ),
    ].map(async (key) =>
      models.set(
        key,
        (await loader.loadAsync(`/assets/ammo/${key}.glb`)).scene,
      ),
    ),
  );
}
export function ammoModel(kind: string) {
  const key = ammoModelKind(kind);
  return key ? models.get(`ammo-${key}`)?.clone(true) : undefined;
}
/** A visible flying bullet, with its casing left behind. Shared cached GLB geometry/material. */
export function bulletModel(kind: string) {
  const root = models.get(`projectile-${kind}`)?.clone(true);
  if (root) root.scale.setScalar(0.6);
  return root;
}
export function rocketModel() {
  const source = models.get("ammo-rockets")?.clone(true);
  if (!source) return;
  const root = new THREE.Group();
  source.position.y = -0.435;
  root.add(source);
  root.scale.setScalar(0.8);
  root.userData.ammoSource = "blender";
  return root;
}
export const ammoSources = () => [...models.keys()];
