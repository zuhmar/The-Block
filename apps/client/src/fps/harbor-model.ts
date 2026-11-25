import { COMPACT } from "./compact-plan";
import * as THREE from "three";
import { HARBOR_BOXES, DECKS } from "./harbor-layout";
let model: THREE.Group | undefined;
export async function preloadHarbor() {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  model = (await new GLTFLoader().loadAsync("/assets/harbor/south-harbor.glb"))
    .scene;
}
export function harborModel() {
  const root = model?.clone(true) ?? new THREE.Group(),
    proxy = new THREE.Group();
  root.name = "south-harbor";
  if (model && COMPACT.active) root.position.z = -60;
  const geometry = new THREE.BoxGeometry(1, 1, 1),
    material = new THREE.MeshStandardMaterial({
      color: 0x627d88,
      roughness: 0.4,
    });
  for (const b of [
    ...HARBOR_BOXES,
    ...DECKS.map((b) => ({ ...b, y: -0.18, height: 0.36 })),
  ]) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(b.x, b.y + b.height / 2, b.z);
    m.scale.set(b.width, b.height, b.depth);
    m.visible = false;
    proxy.add(m);
    if (!model) {
      const visible = m.clone();
      visible.visible = true;
      root.add(visible);
    }
  }
  proxy.updateMatrixWorld(true);
  return { root, proxy, source: model ? "blender" : "fallback" };
}
