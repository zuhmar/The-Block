import { HARBOR_BOXES } from "../../../client/src/fps/harbor-layout.js";
import { northYardBoxes } from "../../../client/src/fps/north-lab-layout.js";
import { COMPOUND_BARRIERS } from "../../../client/src/fps/military-compound.js";
import * as THREE from "three";
import { createBuildingShotProxy } from "../../../client/src/fps/blender-buildings.js";
import {
  BUILDINGS,
  buildingEnabled,
  buildingYaw,
  doorAngles,
} from "../../../client/src/fps/building-layout.js";
import { apartmentDoorState } from "../../../client/src/fps/city-apartments-layout.js";
import { martState } from "../../../client/src/fps/block-mart-layout.js";
import { LOOT, type Piece } from "../../../client/src/fps/world.js";
import {
  JAIL_BOXES,
  JAIL_TOWERS,
  JAIL_OFFSET,
  jailGate,
} from "../../../client/src/fps/jail-ground-layout.js";
import { JAIL_KIT_GATES } from "../../../client/src/fps/jail-kit-layout.js";
import { STREET_PLAN } from "../../../client/src/fps/city-streets-layout.js";
import { structureParts } from "../../../client/src/fps/structure-damage.js";
import {
  timberColliders,
  TIMBER_YARD,
} from "../../../client/src/fps/timber-yard-layout.js";
import type { WorldResource } from "../../../client/src/fps/resource-world.js";
const geometry = new THREE.BoxGeometry(1, 1, 1),
  material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
export class FpsCover {
  private buildings: {
    root: THREE.Group;
    door: THREE.Group;
    apartmentHinges: THREE.Group[];
    martHinges: THREE.Group[];
    index: number;
  }[] = [];
  private staticRoot = new THREE.Group();
  private lootRoot = new THREE.Group();
  private structures = new THREE.Group();
  private nature = new THREE.Group();
  private gates = new THREE.Group();
  private ray = new THREE.Raycaster();
  constructor() {
    for (const [index, b] of BUILDINGS.entries()) {
      if (!buildingEnabled(b)) continue;
      const proxy = createBuildingShotProxy(index);
      proxy.root.position.set(b.x, 0, b.z);
      proxy.root.rotation.y = buildingYaw(b);
      this.buildings.push({
        root: proxy.root,
        door: proxy.door,
        index,
        apartmentHinges:
          "apartmentHinges" in proxy ? proxy.apartmentHinges : [],
        martHinges: "hinges" in proxy ? proxy.hinges : [],
      });
    }
    for (const b of JAIL_BOXES)
      this.box(
        this.staticRoot,
        b.x,
        b.y + b.height / 2,
        b.z,
        b.width,
        b.height,
        b.depth,
      );
    for (const t of JAIL_TOWERS)
      this.box(this.staticRoot, t.x, t.y - 0.09, t.z, 3, 0.18, 3);
    for (const p of STREET_PLAN.props)
      this.box(
        this.staticRoot,
        p.x,
        p.y + p.height / 2,
        p.z,
        p.width,
        p.height,
        p.depth,
      );
    for (const c of timberColliders)
      this.box(
        this.staticRoot,
        TIMBER_YARD.x + c.x,
        c.y + c.height / 2,
        TIMBER_YARD.z + c.z,
        c.width,
        c.height,
        c.depth,
      );
    for (const b of [
      ...HARBOR_BOXES,
      ...northYardBoxes(),
      ...COMPOUND_BARRIERS,
    ])
      this.box(
        this.staticRoot,
        b.x,
        ("y" in b ? Number(b.y) : 0) + b.height / 2,
        b.z,
        b.width,
        b.height,
        b.depth,
      );
    for (const l of LOOT)
      this.box(
        this.lootRoot,
        l.x,
        (l.y ?? 0) + l.height / 2,
        l.z,
        l.width,
        l.height,
        l.depth,
      );
    this.staticRoot.updateMatrixWorld(true);
    this.lootRoot.updateMatrixWorld(true);
  }
  private box(
    root: THREE.Group,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    yaw = 0,
    id?: string,
  ) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.rotation.y = yaw;
    if (id) mesh.userData.pieceId = id;
    root.add(mesh);
    return mesh;
  }
  update(pieces: Piece[], resources: WorldResource[], rebuild = false) {
    if (rebuild) {
      this.structures.clear();
      for (const p of pieces)
        for (const part of structureParts(p, pieces))
          this.box(
            this.structures,
            part.x,
            part.y,
            part.z,
            part.width,
            part.height,
            part.depth,
            part.yaw,
            p.id,
          );
      this.nature.clear();
      for (const r of resources)
        if (r.health > 0)
          this.box(
            this.nature,
            r.x,
            r.height / 2,
            r.z,
            r.width,
            r.height,
            r.depth,
          );
      this.structures.updateMatrixWorld(true);
      this.nature.updateMatrixWorld(true);
    }
    this.gates.clear();
    for (const g of JAIL_KIT_GATES) {
      const hinge = new THREE.Group();
      hinge.position.set(
        g.x - g.width / 2 + JAIL_OFFSET.x,
        0,
        g.z + JAIL_OFFSET.z,
      );
      hinge.rotation.y = jailGate.angle;
      this.box(hinge, g.width / 2, 1.5, 0, g.width, 3, 0.18);
      this.gates.add(hinge);
    }
    this.gates.updateMatrixWorld(true);
    for (const b of this.buildings) {
      b.door.rotation.y = doorAngles[b.index] ?? 0;
      const state = apartmentDoorState(b.index);
      b.apartmentHinges.forEach(
        (hinge, i) => (hinge.rotation.y = state.angles[i] ?? 0),
      );
      const mart = martState(b.index);
      b.martHinges.forEach((hinge, i) => {
        if (i > 0) hinge.rotation.y = mart.angles[i] ?? 0;
      });
      b.root.updateMatrixWorld(true);
    }
  }
  trace(
    from: { x: number; y: number; z: number },
    direction: { x: number; y: number; z: number },
    range: number,
    options: { ignorePiece?: string; loot?: boolean; ground?: boolean } = {},
  ) {
    this.ray.set(
      new THREE.Vector3(from.x, from.y, from.z),
      new THREE.Vector3(direction.x, direction.y, direction.z).normalize(),
    );
    this.ray.near = 0.005;
    this.ray.far = range;
    const roots: THREE.Object3D[] = [
      ...this.buildings.map((b) => b.root),
      this.staticRoot,
      this.gates,
      this.nature,
      this.structures,
    ];
    if (options.loot !== false) roots.push(this.lootRoot);
    const hit = this.ray
      .intersectObjects(roots, true)
      .find(
        (h) =>
          !options.ignorePiece ||
          h.object.userData.pieceId !== options.ignorePiece,
      );
    if (options.ground !== false && direction.y < 0) {
      const distance = (from.y - 0.02) / -direction.y;
      if (
        distance > 0 &&
        distance <= range &&
        (!hit || distance < hit.distance)
      ) {
        const point = this.ray.ray.at(distance, new THREE.Vector3());
        return {
          distance,
          point,
          normal: new THREE.Vector3(0, 1, 0),
          pieceId: undefined as string | undefined,
        };
      }
    }
    if (!hit) return;
    return {
      distance: hit.distance,
      point: hit.point,
      normal:
        hit.face?.normal.clone().transformDirection(hit.object.matrixWorld) ??
        new THREE.Vector3(0, 1, 0),
      pieceId: hit.object.userData.pieceId as string | undefined,
    };
  }
  visible(
    from: { x: number; y: number; z: number },
    to: { x: number; y: number; z: number },
    ignorePiece?: string,
    loot = false,
  ) {
    const d = new THREE.Vector3(to.x - from.x, to.y - from.y, to.z - from.z),
      length = d.length();
    if (length < 0.01) return true;
    return !this.trace(from, d.normalize(), length - 0.1, {
      ignorePiece,
      loot,
      ground: false,
    });
  }
}
