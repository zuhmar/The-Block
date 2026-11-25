import * as THREE from "three";
import { GATHER_TYPES, type GatherKind } from "./resource-state";
import type { WorldResource, ResourceWorld } from "./resource-world";
type Part = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  matrix: THREE.Matrix4;
};
const templates = new Map<string, { root: THREE.Group; parts: Part[] }>();
export async function preloadNatureModels() {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const loader = new GLTFLoader();
  await Promise.allSettled(
    Object.keys(GATHER_TYPES).flatMap((kind) =>
      [0, 1].map(async (lod) => {
        const root = (
          await loader.loadAsync(
            `/assets/meshy-nature-v1/${kind}${lod ? "-lod1" : ""}.glb`,
          )
        ).scene;
        root.updateMatrixWorld(true);
        const parts: Part[] = [];
        root.traverse((o) => {
          if (o instanceof THREE.Mesh)
            parts.push({
              geometry: o.geometry,
              material: o.material as THREE.Material,
              matrix: o.matrixWorld.clone(),
            });
        });
        templates.set(`${kind}:${lod}`, { root, parts });
      }),
    ),
  );
}
export function natureModelSources() {
  return Object.keys(GATHER_TYPES)
    .map(
      (kind) => `${kind}:${templates.has(kind + ":0") ? "meshy" : "fallback"}`,
    )
    .join(",");
}
export function createNatureRenderer(world: ResourceWorld) {
  const root = new THREE.Group(),
    cover = new THREE.Group(),
    dummy = new THREE.Object3D(),
    matrix = new THREE.Matrix4();
  root.name = "gatherable-nature";
  cover.name = "resource-cover";
  const proxyGeometry = new THREE.BoxGeometry(1, 1, 1),
    proxyMaterial = new THREE.MeshBasicMaterial();
  const fallbacks = new Map<GatherKind, Part[]>();
  for (const kind of Object.keys(GATHER_TYPES) as GatherKind[]) {
    const tree = kind.startsWith("tree");
    fallbacks.set(kind, [
      {
        geometry: tree
          ? new THREE.ConeGeometry(1.6, 5, 7)
          : new THREE.IcosahedronGeometry(1, 1),
        material: new THREE.MeshStandardMaterial({
          color: tree
            ? 0x467931
            : kind === "node-sulfur"
              ? 0xd5ba22
              : kind === "node-metal"
                ? 0x9a6545
                : 0x808b8d,
          roughness: 0.5,
        }),
        matrix: new THREE.Matrix4().makeTranslation(0, tree ? 3.5 : 1, 0),
      },
    ]);
  }
  let revision = -1,
    active: WorldResource[] = [];
  const proxies = new Map<string, THREE.Mesh>();
  const buckets = new Map<
    string,
    {
      batches: { mesh: THREE.InstancedMesh; matrix: THREE.Matrix4 }[];
      signature: string;
    }
  >();
  for (const kind of Object.keys(GATHER_TYPES) as GatherKind[])
    for (const lod of [0, 1]) {
      const capacity = Math.max(
          1,
          world.entities.filter((r) => r.kind === kind).length,
        ),
        batches = [];
      for (const part of templates.get(`${kind}:${lod}`)?.parts ??
        templates.get(`${kind}:${1 - lod}`)?.parts ??
        fallbacks.get(kind)!) {
        const mesh = new THREE.InstancedMesh(
          part.geometry,
          part.material,
          capacity,
        );
        mesh.count = 0;
        mesh.visible = false;
        root.add(mesh);
        batches.push({ mesh, matrix: part.matrix });
      }
      buckets.set(`${kind}:${lod}`, { batches, signature: "" });
    }
  const frustum = new THREE.Frustum(),
    projection = new THREE.Matrix4(),
    sphere = new THREE.Sphere();
  const effects: {
    root: THREE.Object3D;
    life: number;
    duration: number;
    tree: boolean;
    scale: number;
  }[] = [];
  function sync() {
    active = world.entities.filter((r) => r.health > 0);
    const ids = new Set(active.map((r) => r.id));
    for (const [id, proxy] of proxies)
      if (!ids.has(id)) {
        proxy.removeFromParent();
        proxies.delete(id);
      }
    for (const r of active) {
      const proxy =
        proxies.get(r.id) ?? new THREE.Mesh(proxyGeometry, proxyMaterial);
      proxy.position.set(r.x, r.height / 2, r.z);
      proxy.scale.set(r.width, r.height, r.depth);
      proxy.visible = false;
      proxy.userData.resourceId = r.id;
      if (proxy.parent !== cover) cover.add(proxy);
      proxies.set(r.id, proxy);
    }
    cover.updateMatrixWorld(true);
    revision = world.revision;
  }
  function update(
    p: { x: number; z: number },
    dt: number,
    camera?: THREE.Camera,
  ) {
    if (revision !== world.revision) sync();
    if (camera) {
      camera.updateMatrixWorld(true);
      projection.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      );
      frustum.setFromProjectionMatrix(projection);
    }
    const visible = new Map<string, WorldResource[]>();
    for (const r of active) {
      const distance = Math.hypot(p.x - r.x, p.z - r.z);
      if (distance > 118) continue;
      sphere.center.set(
        r.x,
        r.kind.startsWith("tree-") ? 3.8 * r.scale : 0.8,
        r.z,
      );
      sphere.radius = r.kind.startsWith("tree-") ? 4.8 * r.scale : 1.7;
      if (camera && !frustum.intersectsSphere(sphere)) continue;
      const key = `${r.kind}:${distance < 28 ? 0 : 1}`;
      if (!visible.has(key)) visible.set(key, []);
      visible.get(key)!.push(r);
    }
    for (const [key, bucket] of buckets) {
      const resources = visible.get(key) ?? [],
        signature = resources
          .map((r) => `${r.id}:${r.generation}:${r.x}:${r.z}`)
          .join("|");
      if (signature === bucket.signature) continue;
      bucket.signature = signature;
      for (const part of bucket.batches) {
        part.mesh.count = resources.length;
        part.mesh.visible = resources.length > 0;
        if (!resources.length) continue;
        resources.forEach((r, i) => {
          dummy.position.set(r.x, 0, r.z);
          dummy.rotation.set(0, r.rotation, 0);
          dummy.scale.setScalar(r.scale);
          dummy.updateMatrix();
          matrix.multiplyMatrices(dummy.matrix, part.matrix);
          part.mesh.setMatrixAt(i, matrix);
        });
        part.mesh.instanceMatrix.needsUpdate = true;
        part.mesh.computeBoundingSphere();
      }
    }
    for (let i = effects.length - 1; i >= 0; i--) {
      const effect = effects[i];
      effect.life -= dt;
      const progress = 1 - effect.life / effect.duration;
      if (effect.tree) {
        effect.root.rotation.z = progress * progress * 1.35;
        effect.root.position.y = -progress * progress * 1.5;
      } else
        effect.root.scale.setScalar(effect.scale * Math.max(0, 1 - progress));
      if (effect.life <= 0) {
        effect.root.removeFromParent();
        effects.splice(i, 1);
      }
    }
  }
  function depleted(r: WorldResource, player: { x: number; z: number }) {
    const template = templates.get(r.kind + ":0");
    if (!template) return;
    const visual = new THREE.Group();
    visual.position.set(r.x, 0, r.z);
    visual.rotation.y = Math.atan2(r.x - player.x, r.z - player.z);
    const model = template.root.clone(true);
    model.rotation.y = r.rotation;
    model.scale.setScalar(r.scale);
    visual.add(model);
    root.parent?.add(visual);
    effects.push({
      root: visual,
      life: r.kind.startsWith("tree") ? 1 : 0.35,
      duration: r.kind.startsWith("tree") ? 1 : 0.35,
      tree: r.kind.startsWith("tree"),
      scale: 1,
    });
  }
  sync();
  return {
    root,
    cover,
    update,
    depleted,
    proxies,
    sources: natureModelSources,
  };
}
