import * as THREE from "three";
import {
  JAIL_BOXES,
  JAIL_TOWERS,
  JAIL_STAIRS,
  JAIL_OFFSET,
} from "./jail-ground-layout";
import type { BinKind } from "./west-quarter";
const urls = {
  metal: new URL("./models/street/bin-metal.glb", import.meta.url).href,
  wheelie: new URL("./models/street/bin-wheelie.glb", import.meta.url).href,
  litter: new URL("./models/street/bin-litter.glb", import.meta.url).href,
  jail: new URL("./models/street/jail-grounds.glb", import.meta.url).href,
};
const loaded = new Map<string, THREE.Group>();
export async function preloadStreetFurniture() {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const loader = new GLTFLoader();
  await Promise.allSettled(
    Object.entries(urls).map(async ([key, url]) => {
      loaded.set(key, (await loader.loadAsync(url)).scene);
    }),
  );
}
export const binModel = (kind: BinKind) => loaded.get(kind)?.clone(true);
export function jailGroundModel() {
  const root = loaded.get("jail")?.clone(true) ?? new THREE.Group(),
    proxy = new THREE.Group();
  const geo = new THREE.BoxGeometry(1, 1, 1),
    mat = new THREE.MeshStandardMaterial({ color: 0x667c7c, roughness: 0.4 });
  function box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.visible = false;
    proxy.add(mesh);
    if (!loaded.has("jail")) {
      const fallback = mesh.clone();
      fallback.visible = true;
      root.add(fallback);
    }
  }
  for (const b of JAIL_BOXES)
    box(b.x, b.y + b.height / 2, b.z, b.width, b.height, b.depth);
  for (const t of JAIL_TOWERS) {
    box(t.x, t.y - 0.09, t.z, 3, 0.18, 3);
    box(t.x, 6.12, t.z, 3.5, 0.14, 3.5);
  }
  for (const s of JAIL_STAIRS)
    for (let i = 0; i < 20; i++)
      box(
        s.x,
        ((i + 1) / 20) * s.rise - 0.1,
        s.startZ + ((s.direction * (i + 0.5)) / 20) * s.run,
        s.width,
        0.2,
        s.run / 20,
      );
  if (loaded.has("jail")) root.position.set(JAIL_OFFSET.x, 0, JAIL_OFFSET.z);
  return { root, proxy };
}
