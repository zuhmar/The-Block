import test from "node:test";
import assert from "node:assert/strict";
import {
  newEnemy,
  updateEnemy,
  damageEnemy,
  segmentHitsPlayer,
} from "../apps/client/src/fps/enemy.js";
test("enemy telegraphs a locked aim before shooting and respects cover", () => {
  const e = newEnemy(),
    p = { x: e.x + 6, z: e.z };
  updateEnemy(e, p, [], 0.1, true);
  assert.equal(e.state, "aim");
  for (let i = 0; i < 10; i++)
    assert.equal(
      updateEnemy(e, { x: p.x + 5, z: p.z }, [], 0.1, true),
      undefined,
    );
  const shot = updateEnemy(e, { x: p.x + 5, z: p.z }, [], 0.1, true);
  assert.deepEqual(shot, p);
  assert.equal(e.shots, 1);
  updateEnemy(e, p, [], 0.1, false);
  assert.equal(e.state, "patrol");
});
test("enemy cannot fire when down and returns after its respawn delay", () => {
  const e = newEnemy();
  damageEnemy(e, 75);
  assert.equal(e.health, 0);
  for (let i = 0; i < 299; i++)
    assert.equal(updateEnemy(e, { x: 0, z: 0 }, [], 0.1, true), undefined);
  assert.equal(e.health, 0);
  for (let i = 0; i < 3; i++) updateEnemy(e, { x: 0, z: 0 }, [], 0.1, true);
  assert.equal(e.health, 75);
});
test("projectile swept collision hits a standing player but allows strafing and jump clearance", () => {
  assert(
    segmentHitsPlayer(
      { x: -1, y: 1, z: 0 },
      { x: 1, y: 1, z: 0 },
      { x: 0, z: 0 },
      0,
    ),
  );
  assert(
    !segmentHitsPlayer(
      { x: -1, y: 1, z: 0 },
      { x: 1, y: 1, z: 0 },
      { x: 0, z: 2 },
      0,
    ),
  );
  assert(
    !segmentHitsPlayer(
      { x: -1, y: 0.3, z: 0 },
      { x: 1, y: 0.3, z: 0 },
      { x: 0, z: 0 },
      1,
    ),
  );
});
