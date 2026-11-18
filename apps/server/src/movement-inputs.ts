import type { MovementInput } from "../../../packages/shared/src/movement.js";
export interface TimedMovement extends MovementInput {
  time: number;
  seq: number;
  sessionId: string;
}
export interface MovementPlan {
  segments: { input: TimedMovement; dt: number }[];
  last?: TimedMovement;
}
// Server receive times determine duration; no client-provided movement time is trusted.
export class MovementInputs {
  private events: TimedMovement[] = [];
  private current?: TimedMovement;
  push(input: TimedMovement) {
    this.events.push(input);
    if (this.events.length > 64) this.events.shift();
  }
  plan(now: number, dt: number): MovementPlan {
    const start = now - Math.min(0.25, Math.max(0, dt)) * 1000;
    const events = this.events.filter((e) => e.time <= now),
      segments: MovementPlan["segments"] = [];
    let current = this.current,
      cursor = start;
    const append = (end: number) => {
      if (current) {
        const until = Math.min(end, current.time + 400);
        if (until > cursor)
          segments.push({ input: current, dt: (until - cursor) / 1000 });
      }
      cursor = end;
    };
    for (const event of events) {
      if (event.time > start) append(Math.min(now, event.time));
      current = event;
    }
    append(now);
    return { segments, last: current };
  }
  commit(plan: MovementPlan) {
    if (!plan.last) return;
    this.current = plan.last;
    this.events = this.events.filter((e) => e.seq > plan.last!.seq);
  }
}
