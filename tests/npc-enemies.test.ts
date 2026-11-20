import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { readFile } from "node:fs/promises";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createNpc, NPC_KINDS } from "../apps/client/src/fps/npc-models.js";
import {
  ENEMY_TYPES,
  newEnemy,
  updateEnemy,
  damageEnemy,
} from "../apps/client/src/fps/enemy.js";
import { blocked, START } from "../apps/client/src/fps/world.js";
test("one enemy per tier starts on clear ground, away from spawn and other encounters", () => {
  for (const kind of NPC_KINDS) {
    const e = newEnemy(kind);
    assert(!blocked(e, []), kind);
    assert(Math.hypot(e.x - START.x, e.z - START.z) > 23);
    for (const other of NPC_KINDS)
      if (other !== kind) {
        const b = newEnemy(other);
        assert(Math.hypot(e.x - b.x, e.z - b.z) > 55);
      }
  }
});
test("each tier has increasing pressure, accepts independent damage and respawns in its own territory", () => {
  assert(
    ENEMY_TYPES.lookout.health < ENEMY_TYPES.police.health &&
      ENEMY_TYPES.police.health < ENEMY_TYPES.swat.health,
  );
  assert(
    ENEMY_TYPES.lookout.damage < ENEMY_TYPES.police.damage &&
      ENEMY_TYPES.police.damage < ENEMY_TYPES.swat.damage,
  );
  for (const kind of NPC_KINDS) {
    const e = newEnemy(kind),
      other = newEnemy("lookout"),
      p = { x: e.x + 6, z: e.z };
    updateEnemy(e, p, [], 0.1, true);
    assert.equal(e.state, "aim");
    let shot;
    for (let n = 0; n < 15 && !shot; n++)
      shot = updateEnemy(e, p, [], 0.1, true);
    assert(shot, kind);
    damageEnemy(e, 1000);
    assert.equal(other.health, 75);
    for (let n = 0; n < 305; n++) updateEnemy(e, p, [], 0.1, false);
    assert.equal(e.kind, kind);
    assert.equal(e.health, ENEMY_TYPES[kind].health);
    assert.equal(e.x, ENEMY_TYPES[kind].spawn.x);
    assert.equal(e.z, ENEMY_TYPES[kind].spawn.z);
  }
});
test("three smooth white NPCs have distinct headwear, detachable clothing and bounded geometry", () => {
  for (const kind of NPC_KINDS) {
    const actor = createNpc(kind),
      head = actor.root.getObjectByName("featureless-black-head") as THREE.Mesh;
    assert.equal(
      (head.material as THREE.MeshStandardMaterial).color.getHex(),
      0xf1f3f5,
    );
    let calls = 0,
      triangles = 0;
    actor.root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        calls++;
        triangles +=
          (o.geometry.index?.count || o.geometry.attributes.position.count) / 3;
      }
    });
    console.log(kind, calls, triangles);
    assert(calls < 65 && triangles < 28000);
    assert(new THREE.Box3().setFromObject(actor.root).max.y < 2.1);
    for (const slot of ["headwear", "torso", "legs", "footwear"] as const) {
      assert(actor.slots[slot].length);
      actor.setSlot(slot, false);
      assert(actor.slots[slot].every((g) => !g.visible));
      actor.setSlot(slot, true);
    }
  }
  const swat = createNpc("swat");
  const shield = swat.root.getObjectByName("clear-face-shield") as THREE.Mesh;
  assert((shield.material as THREE.Material).transparent);
  assert((shield.material as THREE.MeshStandardMaterial).opacity < 0.3);
});
test("all three NPC GLBs roundtrip with white bodies, articulated limbs and walk clips", async () => {
  for (const kind of NPC_KINDS) {
    const bytes = await readFile(`art/models/npc-${kind}.glb`),
      model = await new GLTFLoader().parseAsync(
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ),
        "",
      );
    assert(model.scene.getObjectByName("left-leg"));
    assert(model.animations.some((a) => a.name === "walk"));
    const head = model.scene.getObjectByName(
      "featureless-black-head",
    ) as THREE.Mesh;
    assert.equal(
      (head.material as THREE.MeshStandardMaterial).color.getHex(),
      0xf1f3f5,
    );
  }
});

test("test enemies avoid existing player-built walls on spawn", () => {
  const seed = ENEMY_TYPES.police.spawn;
  const pieces = [
    {
      id: "test-wall",
      kind: "wall" as const,
      x: seed.x,
      z: seed.z,
      rotation: 0,
    },
  ];
  const e = newEnemy("police", pieces);
  assert(!blocked(e, pieces));
  assert(Math.hypot(e.x - seed.x, e.z - seed.z) <= 8);
});
