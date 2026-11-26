import * as THREE from "three";
import { BUILDINGS } from "./building-layout";
export const ROW_DETAIL_DISTANCE = 45,
  ROW_RENDER_DISTANCE = 145;
type Row = { index: number; root: THREE.Group; state: number };
/** Share distant prefab meshes across street rows; retain complete interactive rooms nearby. */
export function createCityRowRender(models: { root: THREE.Group }[]) {
  const root = new THREE.Group();
  root.name = "distant-city-rows";
  const rows: Row[] = models.flatMap((m, index) =>
    BUILDINGS[index].name.startsWith("STREET ROW ")
      ? [{ index, root: m.root, state: -1 }]
      : [],
  );
  type Slot = { row: Row; source: THREE.Mesh };
  const groups = new Map<
    string,
    {
      geometry: THREE.BufferGeometry;
      material: THREE.Material | THREE.Material[];
      slots: Slot[];
    }
  >();
  for (const row of rows) {
    row.root.updateMatrixWorld(true);
    let lod: THREE.LOD | undefined;
    row.root.traverse((o) => {
      if (o instanceof THREE.LOD) lod ??= o;
    });
    const template = lod?.levels[1]?.object ?? row.root;
    template.traverse((o) => {
      if (
        !(o instanceof THREE.Mesh) ||
        o.userData.interiorBuilding !== undefined
      )
        return;
      const key =
        o.geometry.uuid +
        ":" +
        (Array.isArray(o.material)
          ? o.material.map((m) => m.uuid).join(",")
          : o.material.uuid);
      const group = groups.get(key) ?? {
        geometry: o.geometry,
        material: o.material,
        slots: [] as Slot[],
      };
      group.slots.push({ row, source: o });
      groups.set(key, group);
    });
  }
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  const batches = [...groups.values()].map((g) => {
    const mesh = new THREE.InstancedMesh(
      g.geometry,
      g.material,
      g.slots.length,
    );
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    g.slots.forEach((slot, i) => mesh.setMatrixAt(i, slot.source.matrixWorld));
    // Fixed bounds cover every authored location even when some slots collapse to zero.
    mesh.computeBoundingSphere();
    g.slots.forEach((_, i) => mesh.setMatrixAt(i, hidden));
    root.add(mesh);
    return { ...g, mesh };
  });
  function update(player: { x: number; z: number }) {
    const changed = new Set<Row>();
    for (const row of rows) {
      const b = BUILDINGS[row.index],
        d = Math.hypot(player.x - b.x, player.z - b.z),
        state = d < ROW_DETAIL_DISTANCE ? 0 : d < ROW_RENDER_DISTANCE ? 1 : 2;
      row.root.visible = state === 0;
      if (state !== row.state) {
        row.state = state;
        changed.add(row);
      }
    }
    for (const batch of batches) {
      let dirty = false;
      batch.slots.forEach((slot, i) => {
        if (!changed.has(slot.row)) return;
        slot.source.updateWorldMatrix(true, false);
        batch.mesh.setMatrixAt(
          i,
          slot.row.state === 1 ? slot.source.matrixWorld : hidden,
        );
        dirty = true;
      });
      if (dirty) batch.mesh.instanceMatrix.needsUpdate = true;
    }
  }
  return {
    root,
    update,
    rows: rows.length,
    batches: batches.length,
    instances: batches.reduce((n, b) => n + b.slots.length, 0),
  };
}
