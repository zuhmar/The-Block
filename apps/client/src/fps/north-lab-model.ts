import * as THREE from "three";
import { NORTH_LAB, northYardBoxes } from "./north-lab-layout";
let loaded: THREE.Group | undefined;
export async function preloadNorthLab() {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  loaded = (await new GLTFLoader().loadAsync("/assets/north-lab/yard.glb"))
    .scene;
}
export function northLabModel() {
  const root = loaded?.clone(true) ?? new THREE.Group(),
    proxy = new THREE.Group();
  root.position.set(NORTH_LAB.x, 0, NORTH_LAB.z);
  root.visible = NORTH_LAB.enabled;
  proxy.position.copy(root.position);
  const geometry = new THREE.BoxGeometry(1, 1, 1),
    material = new THREE.MeshBasicMaterial({ color: 0x6c847f });
  for (const b of northYardBoxes()) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(b.x - NORTH_LAB.x, b.height / 2, b.z - NORTH_LAB.z);
    m.scale.set(b.width, b.height, b.depth);
    m.visible = false;
    proxy.add(m);
    if (!loaded) {
      const box = m.clone();
      box.visible = true;
      root.add(box);
    }
  }
  proxy.updateMatrixWorld(true);
  return { root, proxy, source: loaded ? "blender" : "fallback" };
}
