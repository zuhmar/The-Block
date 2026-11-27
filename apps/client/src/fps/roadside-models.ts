import * as THREE from "three";
const urls: Record<string, string> = {
  bench: new URL("./models/roadside/bench.glb", import.meta.url).href,
  dumpster: new URL("./models/roadside/dumpster.glb", import.meta.url).href,
  "fire-hydrant": new URL("./models/roadside/fire-hydrant.glb", import.meta.url)
    .href,
  "litter-basket": new URL(
    "./models/roadside/litter-basket.glb",
    import.meta.url,
  ).href,
  streetlamp: new URL("./models/roadside/streetlamp.glb", import.meta.url).href,
  "tier-1-small": new URL("./models/roadside/tier-1-small.glb", import.meta.url)
    .href,
  "tier-2-supply": new URL(
    "./models/roadside/tier-2-supply.glb",
    import.meta.url,
  ).href,
  "tier-3-reinforced": new URL(
    "./models/roadside/tier-3-reinforced.glb",
    import.meta.url,
  ).href,
  "tier-4-long": new URL("./models/roadside/tier-4-long.glb", import.meta.url)
    .href,
  "tier-5-heavy": new URL("./models/roadside/tier-5-heavy.glb", import.meta.url)
    .href,
  "trash-can-metal": new URL(
    "./models/roadside/trash-can-metal.glb",
    import.meta.url,
  ).href,
  "wheelie-bin": new URL("./models/roadside/wheelie-bin.glb", import.meta.url)
    .href,
};
const loaded = new Map<string, THREE.Group>();
let pending: Promise<void> | undefined;
export function fitRoadside(
  model: THREE.Group,
  width: number,
  height: number,
  depth: number,
) {
  const bounds = new THREE.Box3().setFromObject(model),
    size = bounds.getSize(new THREE.Vector3());
  const scale = Math.min(width / size.x, height / size.y, depth / size.z);
  model.scale.multiplyScalar(scale);
  model.position.set(
    (-(bounds.min.x + bounds.max.x) * scale) / 2,
    -bounds.min.y * scale,
    (-(bounds.min.z + bounds.max.z) * scale) / 2,
  );
  return model;
}
export function roadsideModel(name: string) {
  return loaded.get(name)?.clone(true);
}
export function roadsideSources() {
  return [...loaded.keys()].sort();
}
export function preloadRoadsideModels() {
  return (pending ??= (async () => {
    const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
    await Promise.allSettled(
      Object.entries(urls).map(async ([path, url]) => {
        const scene = (await new GLTFLoader().loadAsync(url)).scene;
        const textures = new Set<THREE.Texture>();
        scene.traverse((o) => {
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
            texture.image = await createImageBitmap(source, {
              resizeWidth: 512,
              resizeHeight: 512,
              resizeQuality: "high",
            });
            texture.needsUpdate = true;
          }
        }
        scene.userData.source = "meshy-roadside";
        if (path === "streetlamp") {
          const foot = new THREE.Box3();
          const point = new THREE.Vector3();
          scene.updateMatrixWorld(true);
          scene.traverse((o) => {
            if (o instanceof THREE.Mesh) {
              const pos = o.geometry.getAttribute("position");
              for (let i = 0; i < pos.count; i++) {
                point.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
                if (point.y < 0.12) foot.expandByPoint(point);
              }
            }
          });
          if (!foot.isEmpty()) {
            const center = foot.getCenter(new THREE.Vector3());
            scene.position.x -= center.x;
            scene.position.z -= center.z;
          }
        }
        loaded.set(path, scene);
      }),
    );
  })());
}
/** One GPU batch per shared primitive, rather than one draw call per street prop. */
export function roadsideInstances(root: THREE.Group, models: THREE.Group[]) {
  const batches = new Map<
    THREE.BufferGeometry,
    { material: THREE.Material | THREE.Material[]; matrices: THREE.Matrix4[] }
  >();
  for (const model of models) {
    model.updateMatrixWorld(true);
    model.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const batch = batches.get(o.geometry) ?? {
          material: o.material,
          matrices: [] as THREE.Matrix4[],
        };
        batch.matrices.push(o.matrixWorld.clone());
        batches.set(o.geometry, batch);
      }
    });
  }
  for (const [geometry, batch] of batches) {
    const mesh = new THREE.InstancedMesh(
      geometry,
      batch.material,
      batch.matrices.length,
    );
    batch.matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.computeBoundingSphere();
    root.add(mesh);
  }
  return batches.size;
}
