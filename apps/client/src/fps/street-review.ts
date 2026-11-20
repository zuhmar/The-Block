import * as THREE from "three";

export const STREET_REVIEW_URL = new URL(
  "./models/street-v2.glb",
  import.meta.url,
).href;
/** Loaded only when the player requests the review model, never during normal gameplay. */
export async function loadStreetReview() {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const gltf = await new GLTFLoader().loadAsync(STREET_REVIEW_URL);
  return {
    root: gltf.scene,
    clips: gltf.animations,
    mixer: new THREE.AnimationMixer(gltf.scene),
  };
}
export function disposeReview(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>(),
    textures = new Set<THREE.Texture>(),
    skeletons = new Set<THREE.Skeleton>(),
    bitmaps = new Set<ImageBitmap>();
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    geometries.add(o.geometry);
    for (const material of Array.isArray(o.material)
      ? o.material
      : [o.material]) {
      materials.add(material);
      for (const value of Object.values(material))
        if (value instanceof THREE.Texture) textures.add(value);
    }
    if (o instanceof THREE.SkinnedMesh) skeletons.add(o.skeleton);
  });
  textures.forEach((t) => {
    const image = t.image as ImageBitmap | undefined;
    if (typeof image?.close === "function") bitmaps.add(image);
    t.dispose();
  });
  bitmaps.forEach((image) => image.close());
  materials.forEach((m) => m.dispose());
  geometries.forEach((g) => g.dispose());
  skeletons.forEach((s) => s.dispose());
}
