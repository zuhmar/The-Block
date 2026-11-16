import { test } from "node:test";
import assert from "node:assert/strict";
import {
  act,
  blocked,
  commitAction,
  emptyWorld,
  createPlayer,
  tick,
  upgradeWorld,
  visible,
} from "../apps/server/src/engine.js";
import { createDog, damageDog } from "../apps/server/src/wildlife.js";
import { DOG_RULES as R, DOG_HOMES } from "../packages/game-data/wildlife.js";
import { safe } from "../packages/shared/src/index.js";
const look = {
  skin: "#c98c62",
  hair: "#252939",
  top: "#ec8753",
  body: "standard",
  style: "short",
} as const;
function setup(playerX = 1535, dogX = 1500) {
  const world = emptyWorld(),
    player = createPlayer("owner", "Owner", look);
  player.x = playerX;
  player.y = 1100;
  player.protected = false;
  world.players[player.id] = player;
  const dog = createDog("test-dog", { x: dogX, y: 1100 });
  world.dogs = { [dog.id]: dog };
  world.shots = {};
  world.wildlifeVersion = 1;
  return { world, player, dog, active: new Set([player.id]) };
}
test("wildlife migration seeds town dogs once, outside the Haven and solid obstacles", () => {
  const world = upgradeWorld(emptyWorld());
  assert.equal(Object.keys(world.dogs!).length, DOG_HOMES.length);
  for (const dog of Object.values(world.dogs!)) {
    assert(!safe(dog.x, dog.y));
    assert(!blocked(world, dog));
  }
  const first = Object.values(world.dogs!)[0];
  damageDog(first, R.health, 1000);
  const restarted = upgradeWorld(JSON.parse(JSON.stringify(world)));
  assert.equal(restarted.dogs![first.id].health, 0);
  assert.equal(restarted.dogs![first.id].respawnAt, 1000 + R.respawnMs);
  assert.equal(Object.keys(restarted.dogs!).length, DOG_HOMES.length);
});
test("dogs chase eligible nearby players and bite only after the wind-up, once per cooldown", () => {
  const chase = setup(1700);
  tick(chase.world, 0.25, chase.active, 1000);
  assert.equal(chase.dog.state, "chase");
  assert(chase.dog.x > 1500);
  const { world, player, dog, active } = setup();
  tick(world, 0.05, active, 1000);
  assert.equal(dog.state, "attack");
  assert.equal(player.health, 100);
  tick(world, 0.05, active, 1249);
  assert.equal(player.health, 100);
  tick(world, 0.05, active, 1250);
  assert.equal(player.health, 100 - R.damage);
  tick(world, 0.05, active, 1300);
  assert.equal(player.health, 100 - R.damage);
  assert(player.combatUntil > 1300);
});
test("players can dodge a bite and offline players are not attacked", () => {
  const a = setup();
  tick(a.world, 0.05, a.active, 1000);
  a.player.x += 100;
  tick(a.world, 0.05, a.active, 1250);
  assert.equal(a.player.health, 100);
  const b = setup();
  tick(b.world, 0.05, b.active, 1000);
  tick(b.world, 0.05, new Set(), 1250);
  assert.equal(b.player.health, 100);
});
test("closed doors block bites, while the Haven remains safe even during a chase", () => {
  const { world, player, dog, active } = setup(1542, 1496);
  world.structures.door = {
    id: "door",
    kind: "door",
    rotation: 90,
    x: 1520,
    y: 1100,
    owner: player.id,
    foundation: "floor",
    hp: 80,
    open: true,
    inventory: {},
    cash: 0,
  };
  tick(world, 0.05, active, 1000);
  assert.equal(dog.state, "attack");
  world.structures.door.open = false;
  tick(world, 0.05, active, 1250);
  assert.equal(player.health, 100);
  const haven = setup(760, 800);
  haven.player.y = 650;
  haven.dog.y = haven.dog.homeY = 650;
  tick(haven.world, 0.05, haven.active, 1000);
  haven.player.x = 730;
  for (let i = 0; i < 60; i++) {
    tick(haven.world, 0.1, haven.active, 1250 + i * 100);
    assert(!safe(haven.dog.x, haven.dog.y));
  }
  assert.equal(haven.player.health, 100);
});
test("dog damage uses the normal death/drop path exactly once", () => {
  const { world, player, active } = setup();
  player.health = R.damage;
  tick(world, 0.05, active, 1000);
  tick(world, 0.05, active, 1250);
  assert(player.dead);
  assert.equal(Object.keys(world.bags).length, 1);
  tick(world, 0.05, active, 1500);
  assert.equal(Object.keys(world.bags).length, 1);
});
test("fists, bats and pistols can damage dogs; pistol shots are authoritative and replay-safe", () => {
  const { world, player, dog, active } = setup(1440);
  act(
    world,
    player.id,
    { type: "attack", weapon: "fists", target: dog.id },
    1000,
  );
  assert.equal(dog.health, R.health - 9);
  assert.equal(dog.targetId, player.id);
  player.inventory.pistol = 1;
  player.weapon = "pistol";
  player.ammo = 3;
  const action = { type: "attack", weapon: "pistol", target: dog.id } as const;
  commitAction(world, player.id, "dog-shot-once", 2000, action, 2000);
  assert.equal(player.ammo, 2);
  assert.equal(Object.keys(world.shots!).length, 1);
  commitAction(world, player.id, "dog-shot-once", 2000, action, 2001);
  assert.equal(player.ammo, 2);
  assert.equal(Object.keys(world.shots!).length, 1);
  act(world, player.id, action, 2600);
  assert.equal(dog.health, 0);
  assert.equal(dog.state, "dead");
  assert.equal(dog.respawnAt, 2600 + R.respawnMs);
  assert.equal(visible(world, player.id, active).shots.length, 2);
  tick(world, 0.05, new Set(), 5000);
  assert.equal(Object.keys(world.shots!).length, 0);
  const bat = setup(1440);
  bat.player.weapon = "bat";
  bat.player.inventory.bat = 1;
  act(
    bat.world,
    bat.player.id,
    { type: "attack", weapon: "bat", target: bat.dog.id },
    1000,
  );
  assert.equal(bat.dog.health, R.health - 18);
});
test("failed or blocked pistol attacks spend no ammunition and create no bullet visual", () => {
  const { world, player, dog } = setup(1440);
  player.weapon = "pistol";
  player.inventory.pistol = 1;
  assert.throws(
    () =>
      act(
        world,
        player.id,
        { type: "attack", weapon: "pistol", target: dog.id },
        1000,
      ),
    /Reload/,
  );
  player.ammo = 3;
  world.structures.wall = {
    id: "wall",
    kind: "wall",
    rotation: 90,
    x: 1470,
    y: 1100,
    owner: player.id,
    foundation: "floor",
    hp: 100,
    open: false,
    inventory: {},
    cash: 0,
  };
  assert.throws(
    () =>
      act(
        world,
        player.id,
        { type: "attack", weapon: "pistol", target: dog.id },
        1000,
      ),
    /Line of sight/,
  );
  assert.equal(player.ammo, 3);
  assert.equal(Object.keys(world.shots!).length, 0);
});
test("defeated dogs respawn after their delay at an unobstructed point near home", () => {
  const { world, dog } = setup();
  damageDog(dog, R.health, 1000);
  world.structures.wall = {
    id: "wall",
    kind: "wall",
    rotation: 90,
    x: dog.homeX,
    y: dog.homeY,
    owner: "owner",
    foundation: "floor",
    hp: 100,
    open: false,
    inventory: {},
    cash: 0,
  };
  tick(world, 0.05, new Set(), 1000 + R.respawnMs - 1);
  assert.equal(world.dogs![dog.id].health, 0);
  tick(world, 0.05, new Set(), 1000 + R.respawnMs);
  const respawned = world.dogs![dog.id];
  assert.equal(respawned.health, R.health);
  assert(!blocked(world, respawned));
  assert(!safe(respawned.x, respawned.y));
});
