import { z } from "zod";
import {
  FPS_STEP,
  type FpsInput,
  type FpsPose,
} from "../../../../packages/shared/src/fps-protocol.js";
import { advanceFpsPose } from "../../../client/src/fps/network-physics.js";
import type { Piece } from "../../../client/src/fps/world.js";
export const fpsInputSchema = z
  .object({
    seq: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    x: z.number().finite().min(-1).max(1),
    z: z.number().finite().min(-1).max(1),
    run: z.boolean(),
    jump: z.boolean(),
    yaw: z.number().finite().min(-1e6).max(1e6),
    pitch: z.number().finite().min(-1.35).max(1.35),
  })
  .strict();
export class FpsInputs {
  pending: FpsInput[] = [];
  ack = 0;
  received = 0;
  credit = 0;
  push(batch: unknown) {
    const parsed = z.array(fpsInputSchema).max(10).safeParse(batch);
    if (!parsed.success) return false;
    for (const input of parsed.data) {
      if (input.seq <= this.received) continue;
      if (this.pending.length >= 25) return false;
      this.received = input.seq;
      this.pending.push(input);
    }
    return true;
  }
  stop() {
    this.pending = [];
    this.ack = this.received;
  }
  step(pose: FpsPose, pieces: Piece[], elapsed: number, enabled: boolean) {
    this.credit = Math.min(
      0.12,
      this.credit + Math.max(0, Math.min(0.1, elapsed)),
    );
    let processed = 0;
    while (this.credit >= FPS_STEP && processed++ < 6) {
      this.credit -= FPS_STEP;
      const input = enabled ? this.pending.shift() : undefined;
      if (input) {
        pose = advanceFpsPose(pose, input, pieces);
        this.ack = input.seq;
      } else {
        pose = advanceFpsPose(
          pose,
          {
            x: 0,
            z: 0,
            run: false,
            jump: false,
            yaw: pose.yaw,
            pitch: pose.pitch,
          },
          pieces,
        );
        if (!enabled) this.stop();
      }
    }
    return pose;
  }
}
