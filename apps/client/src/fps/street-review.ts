import * as THREE from "three";

export const IMAGE_MODEL_URLS = {
  meshy: new URL("./models/meshy-shadow/animated.glb", import.meta.url).href,
  lookout: new URL("./models/meshy-lookout/animated.glb", import.meta.url).href,
  police: new URL("./models/meshy-police/animated.glb", import.meta.url).href,
  swat: new URL("./models/meshy-swat/animated.glb", import.meta.url).href,
  base: new URL("./models/image-rebuild/base.glb", import.meta.url).href,
  street: new URL("./models/image-rebuild/street.glb", import.meta.url).href,
  reinforced: new URL("./models/image-rebuild/reinforced.glb", import.meta.url)
    .href,
  armored: new URL("./models/image-rebuild/armored.glb", import.meta.url).href,
};
export type ImageModelKind = keyof typeof IMAGE_MODEL_URLS;
export const IMAGE_REFERENCE_URL = new URL(
  "./models/image-rebuild/reference.png",
  import.meta.url,
).href;
export const NPC_REFERENCE_URL = new URL(
  "./models/npc-image-rebuild/reference.png",
  import.meta.url,
).href;
/** Loaded on demand for model review or a nearby live NPC. */
export async function loadStreetReview(kind: ImageModelKind = "street") {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const gltf = await new GLTFLoader().loadAsync(IMAGE_MODEL_URLS[kind]);
  if (["meshy", "lookout", "police", "swat"].includes(kind)) {
    const bounds = new THREE.Box3().setFromObject(gltf.scene);
    const height = bounds.max.y - bounds.min.y;
    if (height > 0) {
      const scale = 2 / height;
      gltf.scene.scale.multiplyScalar(scale);
      gltf.scene.position.y -= bounds.min.y * scale;
    }
  }
  return {
    kind,
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
