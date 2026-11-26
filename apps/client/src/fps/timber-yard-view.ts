import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  TIMBER_YARD,
  timberProps,
  timberColliders,
} from "./timber-yard-layout";
const urls = import.meta.glob("./models/timber-yard/*.glb", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;
const templates = new Map<string, THREE.Group>();
const roofGeometry: THREE.BufferGeometry[] = [];
export async function preloadTimberYard() {
  const loader = new GLTFLoader();
  await Promise.all(
    Object.entries(urls).map(async ([path, url]) => {
      const gltf = await loader.loadAsync(url);
      const key = path.split("/").pop()!.replace(".glb", "");
      if (key === "architecture") {
        gltf.scene.updateMatrixWorld(true);
        const groups = new Map<THREE.Material, THREE.BufferGeometry[]>();
        gltf.scene.traverse((o) => {
          if (!(o instanceof THREE.Mesh) || Array.isArray(o.material)) return;
          if (o.userData.part === "roof")
            roofGeometry.push(o.geometry.clone().applyMatrix4(o.matrixWorld));
          const g = (
            o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()
          ).applyMatrix4(o.matrixWorld);
          for (const attribute of Object.keys(g.attributes))
            if (attribute !== "position" && attribute !== "normal")
              g.deleteAttribute(attribute);
          if (!g.hasAttribute("normal")) g.computeVertexNormals();
          const list = groups.get(o.material) ?? [];
          list.push(g);
          groups.set(o.material, list);
        });
        const merged = new THREE.Group();
        for (const [material, parts] of groups) {
          const geometry = mergeGeometries(parts);
          if (!geometry) throw Error("Timber architecture batching failed");
          merged.add(new THREE.Mesh(geometry, material));
          parts.forEach((g) => g.dispose());
        }
        templates.set(key, merged);
      } else templates.set(key, gltf.scene);
    }),
  );
}
export function createTimberYard() {
  const root = new THREE.Group(),
    proxy = new THREE.Group();
  root.name = "timber-yard";
  const arch = templates.get("architecture");
  if (arch) root.add(arch.clone(true));
  for (const p of timberProps) {
    const template = templates.get(p.asset);
    if (!template) continue;
    const o = template.clone(true);
    o.position.set(p.x, 0, p.z);
    o.rotation.y = p.yaw;
    root.add(o);
  }
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(32, 0.04, 32),
    new THREE.MeshStandardMaterial({ color: 0x92958a, roughness: 0.85 }),
  );
  pad.position.y = -0.025;
  root.add(pad);
  root.position.set(TIMBER_YARD.x, 0, TIMBER_YARD.z);
  const geo = new THREE.BoxGeometry(1, 1, 1),
    mat = new THREE.MeshBasicMaterial();
  for (const c of timberColliders.filter((c) => c.projectile)) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(c.x, c.y + c.height / 2, c.z);
    m.scale.set(c.width, c.height, c.depth);
    m.visible = false;
    proxy.add(m);
  }
  for (const g of roofGeometry) {
    const mesh = new THREE.Mesh(g, mat);
    mesh.position.set(TIMBER_YARD.x, 0, TIMBER_YARD.z);
    mesh.visible = false;
    proxy.add(mesh);
  }
  proxy.updateMatrixWorld(true);
  return { root, proxy, loaded: templates.size, instances: timberProps.length };
}
