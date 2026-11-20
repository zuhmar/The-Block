import * as THREE from "three";
import test from "node:test";
import assert from "node:assert/strict";
import {
  newWeaponState,
  spendRound,
  beginReload,
  advanceReload,
  cancelReload,
  MELEE,
} from "../apps/client/src/fps/weapon-state";
import { WEAPONS, type WeaponKind } from "../apps/client/src/fps/weapons";
import { createFirstPersonRig } from "../apps/client/src/fps/actor-models";
test("magazines stop at zero and refill only after a complete reload", () => {
  for (const kind of Object.keys(WEAPONS) as WeaponKind[]) {
    const state = newWeaponState(),
      w = WEAPONS[kind];
    assert(!beginReload(state, kind));
    for (let i = 0; i < w.magazineSize; i++) assert(spendRound(state, kind));
    assert(!spendRound(state, kind));
    assert.equal(state.rounds[kind], 0);
    assert(beginReload(state, kind));
    assert(!beginReload(state, kind));
    assert(!spendRound(state, kind));
    assert(!spendRound(state, "pistol"));
    assert(!advanceReload(state, w.reloadSeconds - 0.01));
    assert.equal(state.rounds[kind], 0);
    assert(advanceReload(state, 0.02));
    assert.equal(state.rounds[kind], w.magazineSize);
  }
});
test("cancelled reloads preserve partial magazines and cannot refill another weapon", () => {
  const s = newWeaponState();
  spendRound(s, "rifle");
  spendRound(s, "pistol");
  beginReload(s, "rifle");
  advanceReload(s, 1);
  cancelReload(s);
  advanceReload(s, 20);
  assert.equal(s.rounds.rifle, 29);
  assert.equal(s.rounds.pistol, 11);
  beginReload(s, "pistol");
  advanceReload(s, 0);
  assert.equal(s.rounds.pistol, 11);
  advanceReload(s, 2);
  assert.equal(s.rounds.pistol, 12);
  assert.equal(s.rounds.rifle, 29);
});
test("punch swings the forearm through a hook with one hand and reload tilts the gun, then both return to rest", () => {
  const r = createFirstPersonRig();
  r.setAspect(390 / 844);
  r.equip(false);
  r.animate(0, false, 0, { punch: 0.3, side: -1 });
  const left = r.root.getObjectByName("unarmed-left")!,
    right = r.root.getObjectByName("unarmed-right")!;
  assert(left.children[0].rotation.y < -0.7);
  r.animate(0, false, 0, { punch: 0.15, side: -1 });
  assert(left.children[0].rotation.y > 0.2);
  r.animate(0, false, 0, { punch: 0.5, side: -1 });
  assert(left.children[0].rotation.y < -1);
  assert(Math.abs(right.children[0].rotation.y) < 1e-6);
  assert(Math.abs(right.position.z) < 1e-6);
  r.animate(0, false, 0);
  assert(Math.abs(left.position.z) < 1e-6);
  r.equip(true);
  r.animate(0, false, 0, { reload: 0.5 });
  assert(r.gun.root.position.y > -0.15);
  assert(r.gun.root.rotation.z < -0.3);
  r.animate(0, false, 0);
  assert.equal(r.gun.root.position.y, -0.19);
  assert(Math.abs(r.gun.root.rotation.z) < 1e-6);
  assert(MELEE.impactAt < MELEE.duration && MELEE.duration < MELEE.interval);
});

test("each hook sweeps sideways across the view rather than translating straight forward", () => {
  const r = createFirstPersonRig();
  r.setAspect(390 / 844);
  r.equip(false);
  for (const side of [-1, 1]) {
    const swing = r.root.getObjectByName(
      side < 0 ? "unarmed-left-swing" : "unarmed-right-swing",
    )!;
    const fist = () =>
      swing.localToWorld(new THREE.Vector3(-side * 0.07, 0.14, -0.29));
    r.animate(0, false, 0, { punch: 0.15, side });
    const wind = fist();
    r.animate(0, false, 0, { punch: 0.5, side });
    const through = fist();
    assert(
      (wind.x - through.x) * side > 0.25,
      JSON.stringify({ side, wind, through }),
    );
    r.animate(0, false, 0);
    assert(
      swing.rotation
        .toArray()
        .slice(0, 3)
        .every((v) => Math.abs(Number(v)) < 1e-6),
    );
  }
});
