import { test } from "node:test";
import assert from "node:assert/strict";
import {
  characterAtlas,
  characterState,
} from "../apps/client/src/character-visuals.js";
import {
  emptyWorld,
  createPlayer,
  act,
  publicPlayer,
  kill,
} from "../apps/server/src/engine.js";
const options = {
  now: 1000,
  moving: false,
  crouching: false,
  sprinting: false,
  hurt: false,
};
test("equipped weapons select armed artwork while idle, walking, running, crouching and hurt", () => {
  for (const weapon of ["pistol", "bat"] as const)
    for (const direction of ["south", "north", "east", "west"] as const) {
      const player = { weapon, dead: false, attackAt: 0 };
      assert.equal(
        characterAtlas(weapon, direction),
        `player-stick-${weapon}-${direction}`,
      );
      for (const [changes, expected] of [
        [{}, "idle"],
        [{ moving: true }, "walk"],
        [{ moving: true, sprinting: true }, "run"],
        [{ crouching: true }, "crouch"],
        [{ hurt: true }, "hurt"],
      ] as const)
        assert.equal(
          characterState(player, { ...options, ...changes }),
          expected,
        );
    }
});
test("only an active attack uses firing/swinging poses; holding a pistol does not loop recoil", () => {
  assert.equal(
    characterState({ weapon: "pistol", dead: false, attackAt: 0 }, options),
    "idle",
  );
  assert.equal(
    characterState({ weapon: "pistol", dead: false, attackAt: 1500 }, options),
    "firearm",
  );
  assert.equal(
    characterState({ weapon: "bat", dead: false, attackAt: 1500 }, options),
    "melee",
  );
});
test("authoritative equip changes the local and remote character artwork, and death drops it", () => {
  const world = emptyWorld(),
    player = createPlayer("armed", "Armed", {
      skin: "#c98c62",
      hair: "#252939",
      top: "#ec8753",
      body: "standard",
      style: "short",
    });
  world.players[player.id] = player;
  player.inventory.pistol = 1;
  player.inventory.bat = 1;
  for (const weapon of ["pistol", "bat", "fists"] as const) {
    act(world, player.id, { type: "equip", item: weapon });
    const remote = publicPlayer(player);
    assert.equal(
      characterAtlas(player.weapon, "east"),
      characterAtlas(remote.weapon, "east"),
    );
    assert.equal(
      characterAtlas(remote.weapon, "east"),
      weapon === "fists" ? "player-stick-east" : `player-stick-${weapon}-east`,
    );
  }
  act(world, player.id, { type: "equip", item: "pistol" });
  kill(world, player);
  assert.equal(characterAtlas(player.weapon, "east"), "player-stick-east");
  assert.equal(characterState(player, options), "death");
  assert.equal(Object.values(world.bags)[0].inventory.pistol, 1);
});

test("unarmed attacks select the new punch animation", () => {
  assert.equal(
    characterState({ weapon: "fists", dead: false, attackAt: 1500 }, options),
    "melee",
  );
});
