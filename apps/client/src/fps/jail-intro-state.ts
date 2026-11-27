import { COMPACT } from "./compact-plan";
import { JAIL_OFFSET } from "./jail-ground-layout";
import { START } from "./world";
export const JAIL_INTRO_SECONDS = 15;
export const JAIL_INTRO_POSTER = "/assets/cinematics/jail-release-v2.webp";
export const JAIL_INTRO_VIDEO = "/assets/cinematics/jail-release-v2.mp4";
/** Past the real gate at local 17 and barrier at 19, still in the protected release area. */
export function jailReleasePose() {
  return {
    x: START.x,
    z: COMPACT.active ? JAIL_OFFSET.z + 20.2 : START.z + 6.2,
    y: 0,
    vy: 0,
    yaw: Math.PI,
    pitch: -0.03,
  };
}
