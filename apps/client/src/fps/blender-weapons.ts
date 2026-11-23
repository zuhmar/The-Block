import * as THREE from "three";
import type { WeaponKind } from "./weapons";
import { disposeReview } from "./street-review";
export const BLENDER_WEAPON_URLS = {
  lmg: new URL("./models/weapons/lmg.glb", import.meta.url).href,
  rocket: new URL("./models/weapons/rocket.glb", import.meta.url).href,
  grenade: new URL("./models/weapons/grenade.glb", import.meta.url).href,
  c4: new URL("./models/weapons/c4.glb", import.meta.url).href,

  pistol: new URL("./models/weapons/pistol.glb", import.meta.url).href,
  smg: new URL("./models/weapons/smg.glb", import.meta.url).href,
  rifle: new URL("./models/weapons/rifle.glb", import.meta.url).href,
  sniper: new URL("./models/weapons/sniper.glb", import.meta.url).href,
};
/** Keep sockets and animated groups stable while replacing only visual geometry. */
export function hydrateBlenderWeapon(
  kind: WeaponKind,
  root: THREE.Group,
  slide: THREE.Group,
  muzzle: THREE.Object3D,
) {
  if (typeof window === "undefined") return;
  const old: THREE.Mesh[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) old.push(o);
  });
  root.userData.weaponSource = "loading";
  void import("three/addons/loaders/GLTFLoader.js")
    .then(async ({ GLTFLoader }) => {
      const gltf = await new GLTFLoader().loadAsync(BLENDER_WEAPON_URLS[kind]);
      if (root.userData.weaponDisposed) {
        disposeReview(gltf.scene);
        return;
      }
      const socket = gltf.scene.getObjectByName(kind + "-muzzle");
      if (!socket) {
        disposeReview(gltf.scene);
        throw Error("Missing Blender muzzle");
      }
      gltf.scene.updateMatrixWorld(true);
      const position = socket.getWorldPosition(new THREE.Vector3());
      const meshes: THREE.Mesh[] = [];
      gltf.scene.traverse((o) => {
        if (o instanceof THREE.Mesh) meshes.push(o);
      });
      for (const mesh of old) {
        mesh.geometry.dispose();
        mesh.removeFromParent();
      }
      const magazine = new THREE.Group();
      magazine.name = kind + "-magazine-group";
      root.add(magazine);
      for (const mesh of meshes) {
        // Bake the exported hierarchy into coordinates local to the stable gun root.
        mesh.matrixWorld.decompose(mesh.position, mesh.quaternion, mesh.scale);
        if (mesh.userData.weaponPart === "slide") slide.add(mesh);
        else if (mesh.userData.weaponPart === "magazine") magazine.add(mesh);
        else root.add(mesh);
      }
      muzzle.position.copy(position);
      root.userData.weaponSource = "blender";
      root.userData.onWeaponLoaded?.();
    })
    .catch(() => {
      if (!root.userData.weaponDisposed)
        root.userData.weaponSource = "fallback";
    });
}

export const WEAPON_RENDER_URL = new URL(
  "./models/weapons/lineup.png",
  import.meta.url,
).href;
