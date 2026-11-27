import test from "node:test";
import assert from "node:assert/strict";
import { FpsEngine } from "../apps/server/src/fps/engine.js";
import { readSave, blocked, START } from "../apps/client/src/fps/world.js";
import { jailReleasePose } from "../apps/client/src/fps/jail-intro-state.js";
const uid = () => crypto.randomUUID();
test("new saves require the intro while old device saves retain their progress and skip it", () => {
  assert.equal(readSave(null).introSeen, false);
  const legacy = { version: 1, wood: 73, pieces: [], opened: [1] };
  const migrated = readSave(JSON.stringify(legacy));
  assert.notEqual(migrated.introSeen, false);
  assert.equal(migrated.wood, 73);
  assert.deepEqual(migrated.opened, [1]);
  assert.equal(
    readSave(JSON.stringify({ ...legacy, introSeen: false })).introSeen,
    false,
  );
  assert.equal(
    readSave(JSON.stringify({ ...legacy, introSeen: true })).introSeen,
    true,
  );
});
test("release finishes once on the authority at clear protected ground past the actual gate", () => {
  const engine = new FpsEngine(),
    p = engine.addPlayer("fresh", "Fresh"),
    release = jailReleasePose();
  assert.equal(p.introSeen, false);
  assert.equal(engine.privateState(p.id).introSeen, false);
  assert.equal(blocked(release, engine.world.pieces), false);
  assert.equal(engine.isSafe(release), true);
  engine.apply(p.id, { type: "intro" }, uid());
  assert.equal(p.introSeen, true);
  assert.deepEqual(p.pose, release);
  assert.deepEqual(engine.privateState(p.id).pose, release);
  p.pose.x = 30;
  p.pose.z = 30;
  const before = { ...p.pose };
  engine.apply(p.id, { type: "intro" }, uid());
  assert.deepEqual(p.pose, before);
  const restored = new FpsEngine(JSON.parse(engine.serialize()));
  assert.equal(restored.world.players.fresh.introSeen, true);
  assert.deepEqual(restored.world.players.fresh.pose, before);
});
test("returning accounts keep their position and inventory rather than receiving the new-player release", () => {
  const engine = new FpsEngine(),
    p = engine.addPlayer("legacy", "Legacy");
  delete p.introSeen;
  p.pose.x = 18;
  p.pose.z = 80;
  p.survival.cash = 123;
  const saved = JSON.parse(engine.serialize()),
    restored = new FpsEngine(saved),
    q = restored.world.players.legacy;
  assert.equal(q.introSeen, true);
  assert.equal(q.pose.x, 18);
  assert.equal(q.pose.z, 80);
  assert.equal(q.survival.cash, 123);
  restored.apply(q.id, { type: "intro" }, uid());
  assert.equal(q.pose.z, 80);
});
test("an unfinished intro survives reconnect, cannot teleport out of combat, and does not replay on respawn", () => {
  const engine = new FpsEngine(),
    p = engine.addPlayer("fresh", "Fresh");
  const restored = new FpsEngine(JSON.parse(engine.serialize())),
    q = restored.world.players.fresh;
  assert.equal(q.introSeen, false);
  q.pose.x = 50;
  q.pose.z = 80;
  q.combatUntil = Date.now() + 30000;
  const before = { ...q.pose };
  restored.apply(q.id, { type: "intro" }, uid());
  assert.deepEqual(q.pose, before);
  assert.equal(q.introSeen, true);
  q.health = 0;
  restored.apply(q.id, { type: "respawn" }, uid());
  assert.equal(q.introSeen, true);
  assert.equal(q.pose.x, START.x);
  assert.equal(q.pose.z, START.z);
  assert.equal(p.introSeen, false);
});
