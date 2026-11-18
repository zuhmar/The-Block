import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MovementInputs,
  type TimedMovement,
} from "../apps/server/src/movement-inputs.js";
const input = (time: number, seq: number, dir: number): TimedMovement => ({
  time,
  seq,
  dir,
  dirY: 0,
  sprint: false,
  crouch: false,
  sessionId: "session",
});
test("a short press and release between ticks retains its actual server-observed duration", () => {
  const q = new MovementInputs();
  q.push(input(20, 1, 1));
  q.push(input(55, 2, 0));
  const plan = q.plan(100, 0.1);
  assert.equal(
    plan.segments
      .filter((s) => s.input.dir === 1)
      .reduce((n, s) => n + s.dt, 0),
    0.035,
  );
  assert.equal(plan.last?.seq, 2);
  q.commit(plan);
  assert.equal(
    q.plan(200, 0.1).segments.some((s) => s.input.dir !== 0),
    false,
  );
});
test("uncommitted movement is replayable and newer arrivals survive a commit", () => {
  const q = new MovementInputs();
  q.push(input(10, 1, 1));
  const plan = q.plan(100, 0.1);
  assert.deepEqual(q.plan(100, 0.1), plan);
  q.push(input(120, 2, 0));
  q.commit(plan);
  const next = q.plan(200, 0.1);
  assert.equal(next.last?.seq, 2);
  assert.ok(
    Math.abs(
      next.segments
        .filter((s) => s.input.dir === 1)
        .reduce((n, s) => n + s.dt, 0) - 0.02,
    ) < 1e-9,
  );
});
test("input expiration and tick limits bound movement without trusting client durations", () => {
  const q = new MovementInputs();
  q.push(input(0, 1, 1));
  let plan = q.plan(100, 0.1);
  q.commit(plan);
  plan = q.plan(500, 1);
  assert.ok(
    Math.abs(plan.segments.reduce((n, s) => n + s.dt, 0) - 0.15) < 1e-9,
  );
  q.commit(plan);
  assert.equal(q.plan(600, 0.1).segments.length, 0);
});
test("events arriving after a simulation time are retained for the next tick", () => {
  const q = new MovementInputs();
  q.push(input(110, 1, 1));
  const old = q.plan(100, 0.1);
  assert.equal(old.last, undefined);
  q.commit(old);
  assert.equal(q.plan(200, 0.1).last?.seq, 1);
});
