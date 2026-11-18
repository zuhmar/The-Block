import {
  advanceMovement,
  movementSpeed,
  type MovementInput,
  type MovingActor,
} from "../../../packages/shared/src/movement.js";
import type { Point } from "../../../packages/shared/src/index.js";
type Actor = MovingActor & { id: string };
export class MovementPrediction {
  private actor?: Actor;
  private point: Point = { x: 0, y: 0 };
  private offset: Point = { x: 0, y: 0 };
  private pending: { seq: number; dt: number; input: MovementInput }[] = [];
  private enabled = false;
  private receivedAt = 0;
  reconcile(
    actor: Actor,
    ack: number | undefined,
    now: number,
    blocked: (p: Point) => boolean,
  ) {
    const previous = this.position(),
      reset =
        !this.actor ||
        this.actor.id !== actor.id ||
        actor.dead ||
        Math.hypot(actor.x - this.point.x, actor.y - this.point.y) > 160;
    this.enabled = Number.isFinite(ack);
    this.actor = { ...actor };
    this.receivedAt = now;
    if (reset || !this.enabled) {
      this.point = { x: actor.x, y: actor.y };
      this.pending = [];
      this.offset = { x: 0, y: 0 };
      return;
    }
    this.pending = this.pending.filter((p) => p.seq > ack!);
    let point: Point = actor;
    for (const p of this.pending)
      point = advanceMovement({ ...actor, ...point }, p.input, p.dt, blocked);
    this.point = point;
    this.offset = blocked(previous)
      ? { x: 0, y: 0 }
      : { x: previous.x - point.x, y: previous.y - point.y };
  }
  update(
    input: MovementInput,
    seq: number,
    dt: number,
    now: number,
    blocked: (p: Point) => boolean,
  ) {
    if (!this.actor || !this.enabled || this.actor.dead) return this.position();
    const used = this.pending.reduce((sum, p) => sum + p.dt, 0),
      step = Math.min(0.1, Math.max(0, dt), Math.max(0, 0.5 - used));
    if (seq > 0 && step > 0 && now - this.receivedAt < 750) {
      const next = advanceMovement(
        { ...this.actor, ...this.point },
        input,
        step,
        blocked,
      );
      this.pending.push({ seq, input: { ...input }, dt: step });
      this.point = next;
    }
    const length = Math.hypot(this.offset.x, this.offset.y),
      moving = !!(input.dir || input.dirY),
      correction = Math.min(
        length,
        (moving ? Math.min(48, movementSpeed(this.actor, input) * 0.3) : 180) *
          Math.min(0.1, Math.max(0, dt)),
      );
    if (length) {
      this.offset.x *= 1 - correction / length;
      this.offset.y *= 1 - correction / length;
    }
    const visual = this.position();
    if (length && blocked(visual)) this.offset = { x: 0, y: 0 };
    return this.position();
  }
  position(): Point {
    return { x: this.point.x + this.offset.x, y: this.point.y + this.offset.y };
  }
}
