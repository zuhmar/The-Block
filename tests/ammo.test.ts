import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BULLET_AMMO,
  STARTER_AMMO,
  ammoFor,
} from "../apps/client/src/fps/ammo";
import {
  emptyInventory,
  migrateInventory,
  ensureStarterAmmo,
  addItem,
  countItem,
  takeItem,
  readInventory,
  dropStack,
  pickupDrop,
} from "../apps/client/src/fps/inventory";
import {
  newWeaponState,
  beginReload,
  cancelReload,
} from "../apps/client/src/fps/weapon-state";
import { advanceInventoryReload } from "../apps/client/src/fps/ammo-loadout";
test("ammo migration grants once, preserves full bags and survives reload without new grants", () => {
  const inv = emptyInventory();
  addItem(inv, "wood", 10000);
  assert(ensureStarterAmmo(inv));
  assert.equal(countItem(inv, "wood"), 10000);
  assert.equal(inv.slots.filter(Boolean).length, 20);
  for (const k of BULLET_AMMO)
    assert.equal(
      inv.reserve.find((s) => s.kind === k)?.quantity,
      STARTER_AMMO[k],
    );
  const saved = readInventory(JSON.parse(JSON.stringify(inv)))!;
  assert(!ensureStarterAmmo(saved));
  assert.deepEqual(saved, inv);
  const fresh = migrateInventory(10000);
  assert.equal(fresh.slots.filter(Boolean).length, 20);
  for (const k of BULLET_AMMO)
    assert.equal(countItem(fresh, k), STARTER_AMMO[k]);
});
test("bullets stack to 500, obey total capacity, and ground pickup conserves remaining rounds", () => {
  const inv = emptyInventory();
  assert.equal(addItem(inv, "rifle-ammo", 10001), 10000);
  assert.equal(inv.slots.filter(Boolean).length, 20);
  const id = inv.slots[0]!.id;
  assert(dropStack(inv, id, { x: 0, z: 14, y: 0 }));
  addItem(inv, "rifle-ammo", 470);
  assert.equal(pickupDrop(inv, inv.drops[0].id), 30);
  assert.equal(inv.drops[0].quantity, 470);
  assert.equal(countItem(inv, "rifle-ammo"), 10000);
});
test("reload transfers only matching carried ammo after the complete animation, supports partial magazines and cancellation", () => {
  const inv = emptyInventory(),
    state = newWeaponState();
  state.rounds.pistol = 3;
  addItem(inv, "pistol-ammo", 4);
  addItem(inv, "smg-ammo", 30);
  assert(beginReload(state, "pistol"));
  assert(!advanceInventoryReload(state, inv, 0.5));
  assert.equal(countItem(inv, "pistol-ammo"), 4);
  cancelReload(state);
  assert(!advanceInventoryReload(state, inv, 5));
  assert.equal(state.rounds.pistol, 3);
  beginReload(state, "pistol");
  assert(advanceInventoryReload(state, inv, 5));
  assert.equal(state.rounds.pistol, 7);
  assert.equal(countItem(inv, "pistol-ammo"), 0);
  assert.equal(countItem(inv, "smg-ammo"), 30);
  beginReload(state, "pistol");
  advanceInventoryReload(state, inv, 5);
  assert.equal(state.rounds.pistol, 7);
  addItem(inv, "pistol-ammo", 40);
  beginReload(state, "pistol");
  advanceInventoryReload(state, inv, 5);
  assert.equal(state.rounds.pistol, 12);
  assert.equal(countItem(inv, "pistol-ammo"), 35);
});
test("rocket reload cannot create a charge or consume it twice", () => {
  const inv = emptyInventory(),
    state = newWeaponState();
  state.rounds.rocket = 0;
  addItem(inv, "rockets", 2);
  beginReload(state, "rocket");
  advanceInventoryReload(state, inv, 5);
  assert.equal(state.rounds.rocket, 1);
  assert.equal(countItem(inv, "rockets"), 2);
  takeItem(inv, "rockets", 2);
  state.rounds.rocket = 0;
  beginReload(state, "rocket");
  advanceInventoryReload(state, inv, 5);
  assert.equal(state.rounds.rocket, 0);
  assert.equal(ammoFor("rocket"), "rockets");
});
function glb(file: string) {
  const b = readFileSync(file);
  assert.equal(b.toString("utf8", 0, 4), "glTF");
  return JSON.parse(b.toString("utf8", 20, 20 + b.readUInt32LE(12)));
}
test("six textured Blender ammo exports have bounded geometry and separate bullet-only projectiles", () => {
  const base = "apps/client/static/assets/ammo/";
  for (const kind of ["pistol", "smg", "rifle", "sniper", "lmg", "rockets"]) {
    const g = glb(base + `ammo-${kind}.glb`);
    assert(g.images.length > 0);
    assert(
      g.images.every(
        (i: { bufferView?: number }) => i.bufferView !== undefined,
      ),
    );
    const tris = g.meshes
      .flatMap((m: { primitives: { indices: number }[] }) => m.primitives)
      .reduce(
        (n: number, p: { indices: number }) =>
          n + g.accessors[p.indices].count / 3,
        0,
      );
    assert(tris < 5000, `${kind}: ${tris}`);
    const root = g.nodes.find(
      (n: { name: string }) => n.name === `ammo-${kind}`,
    );
    assert.equal(root.extras.ammoKind, kind);
    assert(root.extras.sourceSHA256);
    if (kind !== "rockets") {
      const projectile = glb(base + `projectile-${kind}.glb`);
      assert.equal(projectile.meshes.length, 1);
      assert(
        projectile.nodes.some(
          (n: { name: string }) => n.name === `projectile-${kind}`,
        ),
      );
    }
  }
});
