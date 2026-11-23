import test from "node:test";
import assert from "node:assert/strict";
import { labEncounters } from "../apps/client/src/fps/lab-enemies";
import {
  newEnemy,
  updateEnemy,
  damageEnemy,
} from "../apps/client/src/fps/enemy";
import { blocked } from "../apps/client/src/fps/world";

test("lab roster and every patrol segment fit the compound collision layout", () => {
  const entries = labEncounters();
  assert.equal(entries.length, 15);
  assert.equal(new Set(entries.map((e) => e.id)).size, 15);
  for (const [tier, weapon, count] of [
    ["easy", "pistol", 10],
    ["medium", "rifle", 4],
    ["hard", "lmg", 1],
  ] as const) {
    const guards = entries.filter((e) => e.labTier === tier);
    assert.equal(guards.length, count);
    assert.ok(guards.every((e) => e.weapon === weapon));
  }
  for (const e of entries)
    for (let i = 0; i < 4; i++) {
      const a = e.patrol.points[i],
        b = e.patrol.points[(i + 1) % 4];
      for (let t = 0; t <= 1; t += 0.025)
        assert.equal(
          blocked({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }, []),
          false,
          `${e.id} patrol collision`,
        );
    }
});

test("lab guns burst, stop firing behind cover, reload and respawn with full magazines", () => {
  for (const entry of labEncounters().filter(
    (e, i, all) => all.findIndex((a) => a.labTier === e.labTier) === i,
  )) {
    const e = newEnemy(entry.kind, [], entry.patrol),
      profile = entry.patrol.combat!;
    const player = { x: e.x, z: e.z + 3 };
    for (let i = 0; i < 100 && e.shots < profile.burst; i++)
      updateEnemy(e, player, [], 0.05, true);
    assert.equal(e.shots, profile.burst);
    assert.equal(e.magazine, profile.magazine - profile.burst);
    e.magazine = 2;
    e.state = "aim";
    e.timer = 0;
    updateEnemy(e, player, [], 0.05, true);
    const shots = e.shots;
    updateEnemy(e, player, [], 0.1, false);
    assert.equal(e.shots, shots);
    assert.equal(e.burst, undefined);
    e.magazine = 0;
    updateEnemy(e, player, [], 0.05, true);
    assert.equal(e.state, "reload");
    for (let i = 0; i < Math.ceil(profile.reload / 0.05) + 2; i++)
      updateEnemy(e, player, [], 0.05, true);
    assert.equal(e.magazine, profile.magazine);
    damageEnemy(e, 10000);
    for (let i = 0; i < 601; i++) updateEnemy(e, player, [], 0.05, false);
    assert.equal(e.health, profile.health);
    assert.equal(e.magazine, profile.magazine);
    assert.equal(e.burst, undefined);
  }
});
