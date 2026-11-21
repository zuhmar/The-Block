import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  combatClip,
  partitionPlayerGeometry,
} from "../apps/client/src/fps/meshy-player";
test("live combat selects the correct gun family, reload priority and punch side", () => {
  assert.equal(
    combatClip("hands", { punch: 0.3, side: -1 }).name,
    "Punch_Left",
  );
  assert.equal(
    combatClip("hands", { punch: 0.3, side: 1 }).name,
    "Punch_Right",
  );
  assert.equal(combatClip("hands", {}).progress, 0);
  for (const [kind, prefix] of [
    ["pistol", "Pistol"],
    ["smg", "SMG"],
    ["rifle", "Rifle"],
    ["sniper", "Sniper"],
  ] as const) {
    assert.equal(combatClip(kind, {}, Infinity).name, prefix + "_Hold");
    assert.equal(combatClip(kind, {}, 0.01).name, prefix + "_Fire");
    assert.equal(
      combatClip(kind, { reload: 0.5 }, 0.01).name,
      prefix + "_Reload",
    );
  }
});
test("first-person geometry includes forearms and hands while body geometry excludes head and arms", () => {
  const hips = new THREE.Bone();
  hips.name = "mixamorigHips";
  const arm = new THREE.Bone();
  arm.name = "mixamorigLeftArm";
  hips.add(arm);
  const fore = new THREE.Bone();
  fore.name = "mixamorigLeftForeArm";
  arm.add(fore);
  const hand = new THREE.Bone();
  hand.name = "mixamorigLeftHand";
  fore.add(hand);
  const head = new THREE.Bone();
  head.name = "mixamorigHead";
  hips.add(head);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(new Float32Array(27), 3),
  );
  const ids: number[] = [],
    weights: number[] = [];
  for (const joint of [2, 2, 3, 0, 0, 0, 4, 4, 4]) {
    ids.push(joint, 0, 0, 0);
    weights.push(1, 0, 0, 0);
  }
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(ids, 4));
  geometry.setAttribute(
    "skinWeight",
    new THREE.Float32BufferAttribute(weights, 4),
  );
  geometry.setIndex([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  const mesh = new THREE.SkinnedMesh(
    geometry,
    new THREE.MeshStandardMaterial(),
  );
  mesh.add(hips);
  mesh.bind(new THREE.Skeleton([hips, arm, fore, hand, head]));
  const split = partitionPlayerGeometry(mesh);
  assert.deepEqual(Array.from(split.arms.index!.array), [0, 1, 2]);
  assert.deepEqual(Array.from(split.body.index!.array), [3, 4, 5]);
  assert.equal(
    split.arms.getAttribute("position"),
    geometry.getAttribute("position"),
  );
  assert.equal(geometry.index!.count, 9);
  assert.equal(partitionPlayerGeometry(mesh), split);
});
