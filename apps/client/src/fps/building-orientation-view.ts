import * as THREE from "three";
import { buildingYaw, type Building } from "./building-layout";
/** Parent both visual and shooting geometry; hinges keep their authored local animation. */
export function orientBuildingRoots(
  root: THREE.Group,
  shotRoot: THREE.Group,
  b: Building,
) {
  const visual = new THREE.Group(),
    proxy = new THREE.Group();
  visual.userData = { ...root.userData };
  visual.add(root);
  proxy.add(shotRoot);
  visual.rotation.y = proxy.rotation.y = buildingYaw(b);
  visual.position.set(b.x, 0, b.z);
  proxy.position.copy(visual.position);
  visual.updateMatrixWorld(true);
  proxy.updateMatrixWorld(true);
  return { root: visual, shotRoot: proxy };
}
