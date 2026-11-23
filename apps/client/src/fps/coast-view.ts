import * as THREE from "three";
import { COASTLINE, WORLD_SIZE, onIsland } from "./coast";
export function createCoast() {
  const root = new THREE.Group(),
    outline = new THREE.Shape();
  COASTLINE.forEach((p, i) =>
    i ? outline.lineTo(p.x, -p.z) : outline.moveTo(p.x, -p.z),
  );
  outline.closePath();
  const land = new THREE.Mesh(
    new THREE.ShapeGeometry(outline),
    new THREE.MeshStandardMaterial({ color: 0x7f995c, roughness: 0.9 }),
  );
  land.rotation.x = -Math.PI / 2;
  land.position.y = -0.05;
  root.add(land);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_SIZE * 5, WORLD_SIZE * 5),
    new THREE.MeshStandardMaterial({
      color: 0x418caa,
      roughness: 0.32,
      metalness: 0.12,
    }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -0.18;
  root.add(sea);
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
  band(0.2, 4, -0.16, 0x65bbc4);
  const foam = band(0.5, 1.1, -0.135, 0xd6e7d6);
  // Small instanced glints keep the ocean readable without per-wave objects.
  const locations = [];
  for (let x = -300; x <= 300; x += 13)
    for (let z = -300; z <= 300; z += 13)
      if (!onIsland({ x, z }, -2) && Math.sin(x * 13 + z * 7) > 0.2)
        locations.push({ x, z });
  const ripples = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(2.4, 0.08),
      new THREE.MeshBasicMaterial({
        color: 0xa1d7dc,
        transparent: true,
        opacity: 0.24,
      }),
      locations.length,
    ),
    dummy = new THREE.Object3D();
  locations.forEach((p, i) => {
    dummy.position.set(p.x, -0.12, p.z);
    dummy.rotation.set(-Math.PI / 2, 0, Math.sin(i) * 0.2);
    dummy.updateMatrix();
    ripples.setMatrixAt(i, dummy.matrix);
  });
  root.add(ripples);
  return {
    root,
    update(time: number) {
      (ripples.material as THREE.MeshBasicMaterial).opacity =
        0.18 + Math.sin(time * 0.6) * 0.04;
      foam.color.setHex(Math.sin(time * 0.4) > 0 ? 0xd6e7d6 : 0xcde4d8);
    },
  };
}
