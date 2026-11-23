import * as THREE from "three";
import {
  BUILDINGS,
  frontOf,
  fixtures,
  partitions,
  DOOR_WIDTH,
  OPENING_WIDTH,
  WALL,
} from "./building-layout";
import { createBuildingModel } from "./building-models";
const URLS: Record<string, string> = {
  jail: new URL("./models/buildings/jail.glb", import.meta.url).href,
  store: new URL("./models/buildings/store.glb", import.meta.url).href,
  shelter: new URL("./models/buildings/shelter.glb", import.meta.url).href,
  workshop: new URL("./models/buildings/workshop.glb", import.meta.url).href,
  home: new URL("./models/buildings/home.glb", import.meta.url).href,
  warehouse: new URL("./models/meshy-warehouse/warehouse.glb", import.meta.url)
    .href,
};
const proxyGeometry = new THREE.BoxGeometry(1, 1, 1),
  proxyMaterial = new THREE.MeshBasicMaterial();
/** Low-detail shooting geometry matches the existing physical layout, never rendered. */
export function createBuildingShotProxy(index: number) {
  const b = BUILDINGS[index],
    front = frontOf(b),
    root = new THREE.Group(),
    door = new THREE.Group();
  root.name = "building-shot-proxy";
  function box(
    parent: THREE.Group,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    doorIndex?: number,
  ) {
    const m = new THREE.Mesh(proxyGeometry, proxyMaterial);
    m.position.set(x, y, z);
    m.scale.set(w, h, d);
    m.visible = false;
    if (doorIndex !== undefined) m.userData.doorIndex = doorIndex;
    parent.add(m);
    return m;
  }
  for (const x of [-b.width / 2, b.width / 2])
    box(root, x, b.height / 2, 0, WALL, b.height, b.depth);
  box(root, 0, b.height / 2, (-front * b.depth) / 2, b.width, b.height, WALL);
  const sideWidth = (b.width - OPENING_WIDTH) / 2;
  for (const side of [-1, 1])
    box(
      root,
      side * (OPENING_WIDTH / 2 + sideWidth / 2),
      b.height / 2,
      (front * b.depth) / 2,
      sideWidth,
      b.height,
      WALL,
    );
  box(
    root,
    0,
    (b.height + 2.85) / 2,
    (front * b.depth) / 2,
    OPENING_WIDTH,
    b.height - 2.85,
    WALL,
  );
  box(root, 0, 3.25, 0, b.width, 0.1, b.depth);
  box(root, 0, 0.007, 0, b.width, 0.025, b.depth);
  door.position.set(-DOOR_WIDTH / 2, 0, (front * b.depth) / 2);
  root.add(door);
  const doorPanel = box(
    door,
    DOOR_WIDTH / 2,
    1.4,
    0,
    DOOR_WIDTH,
    2.8,
    0.14,
    index,
  );
  for (const f of fixtures(index)) {
    const height = {
      shelf: 1.95,
      rack: 2.65,
      bed: 0.8,
      bench: 1,
      table: 0.95,
      counter: 1.15,
      fridge: 2.3,
      cabinet: 1.9,
      sofa: 1.1,
      kitchen: 1.35,
      pallet: 1,
      workbench: 2.25,
    }[f.kind];
    box(root, f.x, height / 2, f.z, f.width, height, f.depth);
  }
  for (const p of partitions(index))
    box(root, p.x, p.height / 2, p.z, p.width, p.height, p.depth);
  // Match the bedroom partition from the same source as player collision.
  return { root, door, doorPanel };
}
const loaded = new Map<number, THREE.Group>();
export async function preloadBlenderBuildings() {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const loader = new GLTFLoader();
  await Promise.allSettled(
    BUILDINGS.map(async (b, index) => {
      const gltf = await loader.loadAsync(URLS[b.type]);
      loaded.set(index, gltf.scene);
    }),
  );
}
export function loadBlenderBuilding(
  index: number,
  geometry: THREE.BoxGeometry,
  makeSign: (text: string, w: number, h: number) => THREE.Mesh,
) {
  const b = BUILDINGS[index],
    proxy = createBuildingShotProxy(index);
  try {
    const root = loaded.get(index);
    if (!root) throw Error("Building asset unavailable");
    const door = root.getObjectByName(b.type + "-door-hinge");
    if (!door) throw Error("Missing animated building door");
    let doorPanel: THREE.Mesh | undefined;
    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      if (o.userData.part === "interior") o.userData.interiorBuilding = index;
      if (o.userData.part === "door") {
        o.userData.dynamicDoor = true;
        o.userData.doorIndex = index;
        doorPanel ??= o;
      }
    });
    if (!doorPanel) throw Error("Missing building door leaf");
    return {
      root,
      door,
      doorPanel,
      shotRoot: proxy.root,
      shotDoor: proxy.door,
      source: "blender",
    };
  } catch {
    const fallback = createBuildingModel(index, geometry, makeSign);
    return {
      ...fallback,
      shotRoot: proxy.root,
      shotDoor: proxy.door,
      source: "fallback",
    };
  }
}
