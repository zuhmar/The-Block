import * as THREE from "three";
import {
  martPlan,
  martGlass,
  martState,
  martFixtureBounds,
} from "./block-mart-layout";
const urls = [
  new URL("./models/block-mart/meshy/block-mart.glb", import.meta.url).href,
  new URL("./models/block-mart/meshy/block-mart-lod.glb", import.meta.url).href,
];
const templates: THREE.Group[] = [];
export async function preloadBlockMart() {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  await Promise.allSettled(
    urls.map(async (url, i) => {
      templates[i] = (await new GLTFLoader().loadAsync(url)).scene;
    }),
  );
}
export function createMartProxy(index: number) {
  const root = new THREE.Group(),
    hinges: THREE.Group[] = [],
    panels: THREE.Mesh[] = [];
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  function box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    parent: THREE.Object3D = root,
  ) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.visible = false;
    parent.add(mesh);
    return mesh;
  }
  for (const wall of [...martPlan.walls, ...martGlass]) {
    const dx = wall.b[0] - wall.a[0],
      dz = wall.b[1] - wall.a[1];
    const mesh = box(
      (wall.a[0] + wall.b[0]) / 2,
      (wall.bottom + wall.top) / 2,
      (wall.a[1] + wall.b[1]) / 2,
      Math.hypot(dx, dz),
      wall.top - wall.bottom,
      wall.thickness,
    );
    mesh.rotation.y = Math.atan2(-dz, dx);
  }
  for (const bounds of martFixtureBounds) {
    const { min, max } = bounds;
    box(
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2,
      max[0] - min[0],
      max[1] - min[1],
      max[2] - min[2],
    );
  }
  for (const y of [0.012, 4.14]) {
    const shape = new THREE.Shape(
      martPlan.floor.map(([x, z]) => new THREE.Vector2(x, -z)),
    );
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = y;
    mesh.visible = false;
    root.add(mesh);
  }
  martPlan.doors.forEach((d, id) => {
    const frame = new THREE.Group();
    frame.position.set(d.center[0], 0, d.center[1]);
    frame.rotation.y = Math.atan2(-d.tangent[1], d.tangent[0]);
    root.add(frame);
    const hinge = new THREE.Group();
    hinge.position.x = -(d.width / 2 - 0.1);
    frame.add(hinge);
    hinges.push(hinge);
    const panel = box(
      (d.width - 0.2) / 2,
      d.height / 2,
      0,
      d.width - 0.2,
      d.height,
      0.14,
      hinge,
    );
    panel.userData.doorIndex = index;
    panel.userData.martDoorId = id;
    panels.push(panel);
  });
  return { root, door: hinges[0], doorPanel: panels[0], hinges };
}
export function createBlockMart(index: number) {
  const root = new THREE.Group(),
    proxy = createMartProxy(index),
    views = templates.map((t) => t?.clone(true));
  if (!views[0]) {
    root.userData.propSet = "fallback";
    const fallback = createMartProxy(index);
    fallback.root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.visible = true;
        o.material = new THREE.MeshStandardMaterial({
          color: 0x408c89,
          roughness: 0.4,
        });
      }
    });
    root.add(fallback.root);
    const update = (angle: number) => {
      const angles = [angle, ...martState(index).angles.slice(1)];
      for (const h of [fallback.hinges, proxy.hinges])
        h.forEach((v, id) => {
          v.rotation.y = angles[id];
        });
      root.updateMatrixWorld(true);
      proxy.root.updateMatrixWorld(true);
    };
    return {
      root,
      door: fallback.door,
      doorPanel: fallback.doorPanel,
      shotRoot: proxy.root,
      shotDoor: proxy.door,
      source: "fallback",
      mart: { update },
    };
  }
  const hinges: THREE.Object3D[][] = [];
  for (const view of views) {
    if (!view) continue;
    const doors = martPlan.doors.map((d) => {
      const h = view.getObjectByName(d.hingeName);
      if (!h) throw Error(`Missing ${d.hingeName}`);
      h.traverse((o) => {
        o.userData.dynamicDoor = true;
        o.userData.doorIndex = index;
      });
      return h;
    });
    hinges.push(doors);
    view.traverse((o) => {
      if (o.userData.propSet) root.userData.propSet = o.userData.propSet;
      if (
        o instanceof THREE.Mesh &&
        ["interior", "product-detail", "label-detail"].includes(o.userData.part)
      )
        o.userData.interiorBuilding = index;
    });
    root.add(view);
  }
  const update = (angle: number, distance: number) => {
    const angles = [angle, ...martState(index).angles.slice(1)];
    hinges.forEach((h) =>
      h.forEach((v, id) => {
        v.rotation.y = angles[id];
      }),
    );
    proxy.hinges.forEach((h, id) => {
      h.rotation.y = angles[id];
    });
    if (views[1]) {
      views[0].visible = distance < 45;
      views[1].visible = distance >= 45;
    }
    root.updateMatrixWorld(true);
    proxy.root.updateMatrixWorld(true);
  };
  update(0, 0);
  return {
    root,
    door: hinges[0][0],
    doorPanel: proxy.doorPanel,
    shotRoot: proxy.root,
    shotDoor: proxy.door,
    source: "blender",
    mart: { update },
  };
}
