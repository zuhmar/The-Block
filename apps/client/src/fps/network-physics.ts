import {
  FPS_STEP,
  type FpsInput,
  type FpsPose,
} from "../../../../packages/shared/src/fps-protocol";
import { movePlayer, surfaceHeight, ceilingHeight, type Piece } from "./world";
/** The same fixed-step controller is used by prediction and the authority. */
export function advanceFpsPose(
  pose: FpsPose,
  input: Pick<FpsInput, "x" | "z" | "run" | "jump" | "yaw" | "pitch">,
  pieces: Piece[],
  dt = FPS_STEP,
): FpsPose {
  const speed = input.run ? 7 : 4.5,
    length = Math.max(1, Math.hypot(input.x, input.z));
  const position = movePlayer(
    pose,
    (input.x / length) * speed * dt,
    (input.z / length) * speed * dt,
    pieces,
    pose.y,
  );
  const surface = surfaceHeight(position, pieces, pose.y + 0.75);
  let y = pose.y,
    vy = pose.vy;
  if (input.jump && Math.abs(y - surface) < 0.02 && vy === 0) vy = 4.8;
  if (y > surface || vy > 0) {
    vy -= 12 * dt;
    const ceiling = ceilingHeight(position, pieces, y) - 1.9,
      next = y + vy * dt;
    y = Math.max(surface, Math.min(next, ceiling));
    if (next > ceiling) vy = Math.min(0, vy);
    if (y === surface) vy = 0;
  } else {
    y = surface;
    vy = 0;
  }
  return { ...position, y, vy, yaw: input.yaw, pitch: input.pitch };
}
export function reconcileFpsPose(
  authority: FpsPose,
  ack: number,
  pending: FpsInput[],
  pieces: Piece[],
) {
  let pose = { ...authority };
  for (const input of pending)
    if (input.seq > ack) pose = advanceFpsPose(pose, input, pieces);
  return pose;
}
