import { ammoModel } from "./ammo-models";
import { isBulletAmmo } from "./ammo";
import * as THREE from "three";
import { isResource, type ItemKind, type WorldDrop } from "./inventory";
import { createPlayerViewRig } from "./meshy-player";
const models = new Map<string, THREE.Group>();
export async function preloadInventoryArt() {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const loader = new GLTFLoader();
  await Promise.allSettled(
    ["wood", "rock", "sulfur", "metal"].map(async (k) =>
      models.set(
        k,
        (await loader.loadAsync(`/assets/resource-items/item-${k}.glb`)).scene,
      ),
    ),
  );
}
function resourceModel(kind: ItemKind) {
  return models.get(kind)?.clone(true) ?? ammoModel(kind);
}
export function createDroppedItems() {
  const root = new THREE.Group(),
    visuals = new Map<string, THREE.Group>(),
    geometry = new THREE.BoxGeometry(1, 1, 1),
    bag = new THREE.MeshStandardMaterial({ color: 0x354943, roughness: 0.65 }),
    strap = new THREE.MeshStandardMaterial({ color: 0xcaa16b, roughness: 0.5 });
  function sync(drops: WorldDrop[]) {
    const ids = new Set(drops.map((d) => d.id));
    for (const [id, v] of visuals)
      if (!ids.has(id)) {
        v.removeFromParent();
        visuals.delete(id);
      }
    for (const d of drops) {
      let v = visuals.get(d.id);
      if (!v) {
        v = new THREE.Group();
        const art = resourceModel(d.kind);
        if (art) {
          art.scale.setScalar(0.65);
          v.add(art);
        } else {
          const m = new THREE.Mesh(geometry, bag);
          m.scale.set(0.4, 0.28, 0.32);
          m.position.y = 0.14;
          v.add(m);
          const belt = new THREE.Mesh(geometry, strap);
          belt.scale.set(0.06, 0.29, 0.33);
          belt.position.y = 0.14;
          v.add(belt);
        }
        root.add(v);
        visuals.set(d.id, v);
      }
      v.position.set(d.x, d.y + 0.01, d.z);
    }
  }
  return {
    root,
    sync,
    update(p: { x: number; z: number }) {
      for (const v of visuals.values())
        v.visible = Math.hypot(v.position.x - p.x, v.position.z - p.z) < 60;
    },
  };
}
export function createHeldResource() {
  const rig = createPlayerViewRig("pistol"),
    holder = new THREE.Group();
  holder.position.copy(rig.gun.root.position);
  holder.quaternion.copy(rig.gun.root.quaternion);
  rig.gun.root.parent!.add(holder);
  const resources = new Map<string, THREE.Group>();
  for (const k of [
    "wood",
    "rock",
    "sulfur",
    "metal",
    "pistol-ammo",
    "smg-ammo",
    "rifle-ammo",
    "sniper-ammo",
    "lmg-ammo",
    "rockets",
  ] as ItemKind[]) {
    const m = resourceModel(k);
    if (m) {
      m.position.y = -0.07;
      holder.add(m);
      resources.set(k, m);
    }
  }
  rig.root.visible = false;
  return {
    root: rig.root,
    setAspect(aspect: number) {
      rig.setAspect(aspect);
      rig.root.position.set(
        aspect < 0.8 ? -0.08 : 0,
        -0.24,
        aspect < 0.8 ? -0.6 : -0.45,
      );
      holder.scale.setScalar(aspect < 0.8 ? 0.25 : 0.32);
    },
    animate(kind: ItemKind, time: number, moving: boolean, dt: number) {
      rig.equip(true);
      rig.animate(time, moving, 0, { dt, shotSerial: 0 });
      rig.gun.root.visible = false;
      for (const [k, m] of resources) m.visible = k === kind;
      rig.root.userData.itemSource =
        resources.has(kind) &&
        (isResource(kind) || isBulletAmmo(kind) || kind === "rockets")
          ? "blender"
          : "none";
    },
  };
}
