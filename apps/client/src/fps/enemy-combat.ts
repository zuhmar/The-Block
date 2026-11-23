export type EnemyCombat = {
  health: number;
  damage: number;
  aim: number;
  cooldown: number;
  speed: number;
  burst: number;
  interval: number;
  magazine: number;
  reload: number;
};
export const LAB_COMBAT = {
  easy: {
    health: 75,
    damage: 12,
    aim: 1.1,
    cooldown: 1.8,
    speed: 2,
    burst: 1,
    interval: 0.15,
    magazine: 12,
    reload: 1.6,
  },
  medium: {
    health: 150,
    damage: 13,
    aim: 0.85,
    cooldown: 1.7,
    speed: 2.2,
    burst: 3,
    interval: 0.13,
    magazine: 30,
    reload: 2,
  },
  hard: {
    health: 300,
    damage: 15,
    aim: 0.9,
    cooldown: 2.3,
    speed: 2,
    burst: 6,
    interval: 0.1,
    magazine: 60,
    reload: 3,
  },
} satisfies Record<string, EnemyCombat>;
