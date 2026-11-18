import { test } from "node:test";
import assert from "node:assert/strict";
import { MovementPrediction } from "../apps/client/src/movement-prediction.js";
import {
  advanceMovement,
  type MovementInput,
} from "../packages/shared/src/movement.js";
const player = {
  id: "local",
  x: 1000,
  y: 1000,
  energy: 100,
  hunger: 100,
  thirst: 100,
  dead: false,
};
const right: MovementInput = { dir: 1, dirY: 0, sprint: false, crouch: false },
  idle = { ...right, dir: 0 },
  clear = () => false;
test("walking starts on the next frame without a server reply and stops on release", () => {
  const m = new MovementPrediction();
  m.reconcile(player, 0, 0, clear);
  const p = m.update(right, 1, 1 / 60, 16, clear);
  assert.ok(p.x > player.x);
  assert.equal(player.x, 1000);
  assert.equal(m.update(idle, 2, 1 / 60, 32, clear).x, p.x);
});
test("acknowledged input is removed while newer input is replayed exactly once", () => {
  const m = new MovementPrediction();
  m.reconcile(player, 0, 0, clear);
  m.update(right, 1, 0.1, 100, clear);
  m.update(right, 2, 0.1, 200, clear);
  const committed = { ...player, x: 1014.5 };
  m.reconcile(committed, 1, 220, clear);
  assert.equal(m.position().x, 1029);
  m.reconcile(committed, 1, 230, clear);
  assert.equal(m.position().x, 1029);
  m.update(idle, 3, 0.1, 300, clear);
  m.reconcile({ ...player, x: 1029 }, 3, 330, clear);
  assert.equal(m.update(idle, 4, 0.1, 400, clear).x, 1029);
});
test("prediction and authority share diagonal normalization, speed limits and wall sliding", () => {
  const block = (p: { x: number; y: number }) => p.x > 1010;
  const input = { ...right, dirY: 1, sprint: true },
    p = advanceMovement(player, input, 0.25, block);
  assert.ok(p.x <= 1010);
  assert.ok(p.y > 1000);
  assert.ok(Math.hypot(p.x - 1000, p.y - 1000) <= 235 * 0.25 + 1e-8);
  const m = new MovementPrediction();
  m.reconcile(player, 0, 0, block);
  for (let i = 1; i <= 5; i++) m.update(input, i, 0.05, i * 50, block);
  assert.ok(m.position().x <= 1010);
});
test("prediction is bounded when snapshots stop, and teleports or death reset pending motion", () => {
  const m = new MovementPrediction();
  m.reconcile(player, 0, 0, clear);
  for (let i = 1; i <= 20; i++) m.update(right, i, 0.1, i * 100, clear);
  assert.ok(m.position().x <= 1072.5 + 1e-8);
  const stopped = m.position();
  assert.deepEqual(m.update(right, 21, 0.1, 3000, clear), stopped);
  m.reconcile({ ...player, x: 3000, y: 3000 }, 21, 3100, clear);
  assert.deepEqual(m.position(), { x: 3000, y: 3000 });
  m.reconcile({ ...player, dead: true }, 21, 3200, clear);
  assert.deepEqual(m.update(right, 22, 0.1, 3300, clear), { x: 1000, y: 1000 });
});
test("older servers remain authoritative and new obstacles cannot be hidden by smoothing", () => {
  const m = new MovementPrediction();
  m.reconcile(player, undefined, 0, clear);
  assert.deepEqual(m.update(right, 1, 0.1, 100, clear), { x: 1000, y: 1000 });
  m.reconcile(player, 0, 200, clear);
  m.update(right, 2, 0.1, 300, clear);
  m.reconcile(player, 2, 400, (p) => p.x > 1005);
  assert.ok(m.position().x <= 1005);
});
