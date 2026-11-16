import type { Player } from "../../../packages/shared/src/index";
export type CharacterDirection = "south" | "north" | "east" | "west";
export function characterAppearanceKey(weapon: Player["weapon"]) {
  return weapon === "fists" ? "player-stick" : `player-stick-${weapon}`;
}
export function characterAtlas(
  weapon: Player["weapon"],
  direction: CharacterDirection,
) {
  return `${characterAppearanceKey(weapon)}-${direction}`;
}
export function characterState(
  player: Pick<Player, "weapon" | "dead" | "attackAt">,
  options: {
    now: number;
    moving: boolean;
    crouching: boolean;
    sprinting: boolean;
    hurt: boolean;
  },
) {
  if (player.dead) return "death";
  if (options.hurt) return "hurt";
  if (player.attackAt > options.now)
    return player.weapon === "pistol"
      ? "firearm"
      : player.weapon === "bat"
        ? "melee"
        : "idle";
  if (options.crouching) return "crouch";
  if (options.moving) return options.sprinting ? "run" : "walk";
  return "idle";
}
