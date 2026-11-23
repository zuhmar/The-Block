import * as THREE from "three";
const ray = new THREE.Raycaster();
/** Start outside the impact surface; even thin player walls must block blast damage. */
export function blastOccluded(
  center: THREE.Vector3,
  target: THREE.Vector3,
  cover: THREE.Object3D[],
) {
  const direction = target.clone().sub(center),
    distance = direction.length();
  if (distance < 0.03) return false;
  direction.normalize();
  ray.set(center.clone().addScaledVector(direction, 0.01), direction);
  ray.far = Math.max(0, distance - 0.02);
  return ray.intersectObjects(cover, true).length > 0;
}
