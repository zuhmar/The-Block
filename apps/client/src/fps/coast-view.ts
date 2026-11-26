import { createWater } from "./water-view";
import type { WaterPoint } from "./water-geometry";
import { COMPACT, jailOutline } from "./compact-plan";
import * as THREE from "three";
import { COASTLINE } from "./coast";
export function createCoast() {
  const root = new THREE.Group(),
    outline = new THREE.Shape();
  COASTLINE.forEach((p, i) =>
    i ? outline.lineTo(p.x, -p.z) : outline.moveTo(p.x, -p.z),
  );
  outline.closePath();
  const land = new THREE.Mesh(
    new THREE.ShapeGeometry(outline),
    new THREE.MeshStandardMaterial({
      color: COMPACT.active ? 0xb2b4a4 : 0x7f995c,
      roughness: 0.9,
    }),
  );
  land.rotation.x = -Math.PI / 2;
  land.position.y = -0.05;
  const terrain = new THREE.Group();
  terrain.add(land);
  root.add(terrain);
  if (COMPACT.active) {
    const outline = new THREE.Shape();
    jailOutline().forEach((p, i) =>
      i ? outline.lineTo(p.x, -p.z) : outline.moveTo(p.x, -p.z),
    );
    outline.closePath();
    const island = new THREE.Mesh(
      new THREE.ShapeGeometry(outline),
      new THREE.MeshStandardMaterial({ color: 0xb7b59f, roughness: 0.9 }),
    );
    island.rotation.x = -Math.PI / 2;
    island.position.y = -0.05;
    terrain.add(island);
  }

  function band(inner: number, outer: number, y: number, color: number) {
    const vertices: number[] = [],
      indices: number[] = [];
    COASTLINE.forEach((p, i) => {
      const len = Math.hypot(p.x, p.z);
      for (const offset of [inner, outer])
        vertices.push(
          p.x + (p.x / len) * offset,
          y,
          p.z + (p.z / len) * offset,
        );
      const next = ((i + 1) % COASTLINE.length) * 2,
        n = i * 2;
      indices.push(n, next, n + 1, n + 1, next, next + 1);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({
      color,
      side: THREE.DoubleSide,
      roughness: 0.8,
    });
    root.add(new THREE.Mesh(g, material));
    return material;
  }
  band(-4, 0, -0.035, 0xc8b77e);
  const water = createWater(
    COMPACT.active ? [COASTLINE, jailOutline()] : [COASTLINE],
  );
  root.add(water.root);
  return {
    root,
    surface: terrain,
    waterMaterial: water.material,
    splash: water.splash,
    splashRay: water.splashRay,
    waterStats: water.stats,
    update(time: number, player?: WaterPoint) {
      water.update(time, player);
    },
  };
}
