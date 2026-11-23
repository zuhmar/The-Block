import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  advanceProjectile,
  blastDamage,
  type Projectile,
} from "../apps/client/src/fps/explosives";
import { combatClip } from "../apps/client/src/fps/meshy-player";
import { WEAPONS } from "../apps/client/src/fps/weapons";
const projectile = (kind: Projectile["kind"]): Projectile => ({
  id: 1,
  kind,
  position: { x: 0, y: 2, z: 0 },
  velocity: { x: 0, y: 0, z: -32 },
  fuse: 3,
  settled: false,
});
test("rocket sweeps every movement segment, detonates on impact and expires without a hit", () => {
  const p = projectile("rocket");
  let segments = 0;
  assert(
    advanceProjectile(p, 0.2, (a, b) => {
      segments++;
      return b.z <= -1
        ? { point: { x: 0, y: 2, z: -1 }, normal: { x: 0, y: 0, z: 1 } }
        : undefined;
    }),
  );
  assert.equal(p.position.z, -0.9);
  assert(segments > 1);
  const expired = projectile("rocket");
  assert(advanceProjectile(expired, 4, () => undefined));
});
test("grenade bounces, keeps its fuse after settling and does not move while paused", () => {
  const p = projectile("grenade");
  p.position.y = 0.1;
  p.velocity = { x: 0, y: -4, z: 0 };
  assert(
    !advanceProjectile(p, 0.02, (_a, b) =>
      b.y <= 0.08
        ? { point: { ...b, y: 0.08 }, normal: { x: 0, y: 1, z: 0 } }
        : undefined,
    ),
  );
  assert(p.velocity.y > 0);
  const before = structuredClone(p);
  assert(!advanceProjectile(p, 0, () => undefined));
  assert.deepEqual(p, before);
  p.settled = true;
  assert(advanceProjectile(p, 3, () => undefined));
});
test("placed C4 remains stationary until explicitly detonated; blast damage falls with distance", () => {
  const p = projectile("c4"),
    before = structuredClone(p);
  assert(
    !advanceProjectile(p, 100, () => {
      throw Error("C4 must not fly");
    }),
  );
  assert.deepEqual(p, before);
  for (const kind of ["rocket", "grenade", "c4"] as const) {
    assert(blastDamage(kind, 0) > blastDamage(kind, 2));
    assert.equal(blastDamage(kind, 20), 0);
  }
});
test("new items reuse available skeletal families with reload priority", () => {
  for (const kind of ["lmg", "rocket", "grenade", "c4"] as const) {
    assert(WEAPONS[kind].magazineSize > 0);
    assert(!combatClip(kind, {}, Infinity).name.includes("undefined"));
    assert(combatClip(kind, { reload: 0.4 }, 0.01).name.endsWith("_Reload"));
  }
});
test("four new runtime GLBs have forward sockets, a detachable LMG box and bounded draw calls", async () => {
  for (const kind of ["lmg", "rocket", "grenade", "c4"]) {
    const raw = await readFile(
      `apps/client/src/fps/models/weapons/${kind}.glb`,
    );
    const g = await new GLTFLoader().parseAsync(
      raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength),
      "",
    );
    g.scene.updateMatrixWorld(true);
    const socket = g.scene.getObjectByName(kind + "-muzzle");
    assert(socket, kind);
    assert(socket.getWorldPosition(new THREE.Vector3()).z < 0, kind);
    let meshes = 0,
      magazines = 0;
    g.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        meshes++;
        if (o.userData.weaponPart === "magazine") magazines++;
      }
    });
    assert(meshes <= 8, `${kind}: ${meshes} draw calls`);
    if (kind === "lmg") assert(magazines > 0);
  }
});

test("thin solid cover stops blast damage, while targets on the same side stay exposed", async () => {
  const { blastOccluded } = await import(
    "../apps/client/src/fps/explosion-visibility"
  );
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 3, 3),
    new THREE.MeshBasicMaterial(),
  );
  wall.position.y = 1.5;
  wall.updateMatrixWorld(true);
  assert(
    blastOccluded(
      new THREE.Vector3(-0.18, 1, 0),
      new THREE.Vector3(0.3, 1, 0),
      [wall],
    ),
  );
  assert(
    !blastOccluded(
      new THREE.Vector3(-0.18, 1, 0),
      new THREE.Vector3(-2, 1, 0),
      [wall],
    ),
  );
  wall.visible = false;
  assert(
    blastOccluded(
      new THREE.Vector3(-0.18, 1, 0),
      new THREE.Vector3(0.3, 1, 0),
      [wall],
    ),
  );
});
