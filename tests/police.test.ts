import test from "node:test";
import assert from "node:assert/strict";
import { initializeFpsMap } from "../apps/server/src/fps/map.js";
import { streetPolicePatrols } from "../apps/client/src/fps/police-layout.js";
import { newEnemy, damageEnemy } from "../apps/client/src/fps/enemy.js";
import {
  reportPoliceViolence,
  updatePolice,
  isStreetPolice,
  type PolicePerson,
} from "../apps/client/src/fps/police.js";
import { blocked } from "../apps/client/src/fps/world.js";
import { FpsEngine } from "../apps/server/src/fps/engine.js";
import { addItem } from "../apps/client/src/fps/inventory.js";
initializeFpsMap();
const patrols = streetPolicePatrols();
function officer(i = 0) {
  const e = newEnemy("police", [], patrols[i]);
  e.yaw = -Math.PI / 2;
  return e;
}
function person(e: ReturnType<typeof officer>, id = "shooter"): PolicePerson {
  return {
    id,
    position: { x: e.x + 5, z: e.z, y: 0 },
    alive: true,
    safe: false,
  };
}
const uid = () => crypto.randomUUID();
test("six street police walk three clear sidewalk circuits without teleporting or leaving their routes", () => {
  assert.equal(patrols.length, 6);
  for (const spec of patrols) {
    for (let i = 0; i < spec.points.length; i++) {
      const a = spec.points[i],
        b = spec.points[(i + 1) % spec.points.length],
        n = Math.ceil(Math.hypot(a.x - b.x, a.z - b.z) * 10);
      for (let j = 0; j <= n; j++)
        assert.equal(
          blocked(
            { x: a.x + ((b.x - a.x) * j) / n, z: a.z + ((b.z - a.z) * j) / n },
            [],
          ),
          false,
          spec.id + " blocked leg " + i,
        );
    }
    const e = newEnemy("police", [], spec),
      start = { ...e };
    let max = 0;
    for (let n = 0; n < 300; n++) {
      const before = { ...e };
      updatePolice(e, [], [], 0.1, () => true, n * 100);
      assert.ok(Math.hypot(e.x - before.x, e.z - before.z) <= 0.126);
      max = Math.max(max, Math.hypot(e.x - start.x, e.z - start.z));
    }
    assert.ok(max > 15, spec.id + " should patrol");
    assert.equal(e.shots, 0);
  }
});
test("an innocent can stand beside police indefinitely without triggering a shot", () => {
  const e = officer(),
    p = person(e, "innocent");
  for (let i = 0; i < 100; i++)
    updatePolice(e, [p], [], 0.1, () => true, i * 100);
  assert.equal(e.police!.phase, "patrol");
  assert.equal(e.police!.suspectId, undefined);
  assert.equal(e.shots, 0);
});
test("witnessing violence identifies that player, not a nearer innocent; rapid gunfire does not reset police aim", () => {
  const e = officer(),
    bad = person(e),
    innocent = person(e, "innocent");
  innocent.position.x = e.x + 1;
  assert.equal(
    reportPoliceViolence([e], bad, bad.position, "gunfire", () => true, 0),
    1,
  );
  let fired = 0;
  for (let i = 1; i < 70; i++) {
    reportPoliceViolence(
      [e],
      bad,
      bad.position,
      "gunfire",
      () => true,
      i * 100,
    );
    const shot = updatePolice(e, [innocent, bad], [], 0.1, () => true, i * 100);
    if (shot) {
      assert.equal(shot.suspectId, bad.id);
      fired++;
    }
  }
  assert.ok(fired >= 2);
  assert.equal(e.police!.suspectId, bad.id);
});
test("walls and facing prevent identification; hearing shots only supplies a location", () => {
  const e = officer(),
    p = person(e);
  reportPoliceViolence([e], p, p.position, "gunfire", () => false, 0);
  assert.equal(e.police!.suspectId, undefined);
  assert.equal(e.police!.phase, "investigate");
  updatePolice(e, [p], [], 0.1, () => true, 100);
  assert.equal(e.shots, 0);
  assert.equal(e.police!.suspectId, undefined);
  const rear = officer();
  rear.yaw = Math.PI / 2;
  reportPoliceViolence([rear], p, p.position, "gunfire", () => true, 0);
  assert.equal(rear.police!.suspectId, undefined);
  const distant = { ...p, position: { x: e.x + 80, z: e.z } };
  reportPoliceViolence(
    [officer()],
    distant,
    distant.position,
    "gunfire",
    () => true,
    0,
  );
  const safe = officer();
  reportPoliceViolence(
    [safe],
    { ...p, safe: true },
    p.position,
    "gunfire",
    () => true,
    0,
  );
  assert.equal(safe.police!.suspectId, undefined);
});
test("a nearby partner receives the observed identity but a different district does not", () => {
  const a = officer(),
    b = officer(1),
    other = officer(2),
    p = person(a);
  b.yaw = Math.PI / 2;
  reportPoliceViolence([a, b, other], p, p.position, "gunfire", () => true, 0);
  assert.equal(a.police!.phase, "pursue");
  assert.equal(b.police!.suspectId, p.id);
  assert.equal(b.police!.phase, "investigate");
  assert.equal(other.police!.suspectId, undefined);
});
test("losing sight cancels a locked shot, remembers the seen location, then clears the suspect", () => {
  const e = officer(),
    p = person(e);
  reportPoliceViolence([e], p, p.position, "gunfire", () => true, 0);
  for (let i = 1; i <= 4; i++)
    updatePolice(e, [p], [], 0.1, () => true, i * 100);
  assert.equal(e.state, "aim");
  const seen = { ...e.police!.lastSeen };
  p.position = { x: 100, z: 140 };
  for (let i = 2; i < 30; i++)
    assert.equal(
      updatePolice(e, [p], [], 0.1, () => false, i * 100),
      undefined,
    );
  assert.deepEqual(e.police!.lastSeen, seen);
  assert.equal(e.shots, 0);
  updatePolice(e, [p], [], 0.1, () => false, 30000);
  assert.equal(e.police!.suspectId, undefined);
  assert.ok(["return", "patrol"].includes(e.police!.phase));
});
test("a remote explosion never identifies a hidden owner and respawn clears old hostility", () => {
  const e = officer(),
    p = person(e);
  p.position = { x: e.x + 30, z: e.z };
  reportPoliceViolence(
    [e],
    p,
    { x: e.x + 2, z: e.z },
    "explosion",
    () => true,
    0,
  );
  assert.equal(e.police!.suspectId, undefined);
  reportPoliceViolence(
    [e],
    person(e),
    person(e).position,
    "assault",
    () => true,
    1,
    e,
  );
  assert.equal(e.police!.suspectId, "shooter");
  damageEnemy(e, 999);
  for (let i = 0; i < 310; i++)
    updatePolice(e, [], [], 0.1, () => true, i * 100);
  assert.equal(e.health, 125);
  assert.equal(e.police!.suspectId, undefined);
});
test("authority migrates patrols without resetting players, and only accepted witnessed attacks cause hostility", () => {
  const engine = new FpsEngine();
  engine.addPlayer("a", "Alpha");
  engine.addPlayer("b", "Bravo");
  const e = engine.world.npcs.find((n) => isStreetPolice(n.enemy))!.enemy;
  const p = engine.world.players.a,
    other = engine.world.players.b;
  Object.assign(p.pose, { x: e.x + 5, z: e.z, y: 0 });
  Object.assign(other.pose, { x: e.x + 1, z: e.z + 1, y: 0 });
  e.yaw = -Math.PI / 2;
  const now = Date.now();
  for (let i = 0; i < 10; i++) engine.step(0.05, now + i * 50);
  assert.equal(e.police!.suspectId, undefined);
  addItem(p.inventory, "pistol", 1);
  const gun = p.inventory.slots.find((s) => s?.kind === "pistol")!;
  p.inventory.hotbar[0] = gun.id;
  p.inventory.active = 0;
  gun.magazine = 0;
  assert.throws(
    () =>
      engine.apply(p.id, { type: "fire", yaw: 0, pitch: 0 }, uid(), now + 600),
    /magazine/,
  );
  assert.equal(e.police!.suspectId, undefined);
  gun.magazine = 12;
  let found = false;
  for (let i = 0; i < 16; i++) {
    const q = {
      x: e.x + Math.cos((i * Math.PI) / 8) * 6,
      z: e.z + Math.sin((i * Math.PI) / 8) * 6,
    };
    if (
      !blocked(q, engine.world.pieces) &&
      engine.cover.visible(
        { x: e.x, y: 1.4, z: e.z },
        { ...q, y: 1.1 },
        undefined,
        true,
      )
    ) {
      Object.assign(p.pose, q);
      found = true;
      break;
    }
  }
  assert.ok(found, "Need an unobstructed observed shooter");
  e.yaw = Math.atan2(e.x - p.pose.x, e.z - p.pose.z);
  engine.apply(p.id, { type: "fire", yaw: 0, pitch: 0.6 }, uid(), now + 800);
  assert.equal(e.police!.suspectId, p.id);
  const old = JSON.parse(engine.serialize());
  old.npcs = old.npcs.filter((n: any) => !isStreetPolice(n.enemy));
  old.npcs.push({ id: "police-town", enemy: newEnemy("police") });
  const restored = new FpsEngine(old);
  assert.equal(
    restored.world.npcs.filter((n) => isStreetPolice(n.enemy)).length,
    6,
  );
  assert.ok(!restored.world.npcs.some((n) => n.id === "police-town"));
  assert.equal(
    restored.world.players.a.inventory.slots.find((s) => s?.id === gun.id)
      ?.magazine,
    11,
  );
});
