import { test } from "node:test";
import assert from "node:assert/strict";
import { WorldQueue } from "../apps/server/src/world-queue.js";

test("slow world operations cannot accumulate simulation ticks ahead of player actions", async () => {
  const events: string[] = [],
    errors: unknown[] = [];
  const q = new WorldQueue((e) => errors.push(e));
  let release!: () => void;
  const blocked = new Promise<void>((r) => (release = r));
  void q.run(async () => {
    events.push("database");
    await blocked;
  });
  for (let i = 0; i < 40; i++)
    void q.tick(async () => {
      events.push("tick");
    });
  const action = q.run(async () => {
    events.push("action");
  });
  release();
  await action;
  assert.deepEqual(events, ["database", "tick", "action"]);
  assert.deepEqual(errors, []);
  await q.tick(async () => {
    events.push("next tick");
  });
  assert.equal(events.at(-1), "next tick");
});
test("a failed tick releases its slot and later authoritative actions still run in order", async () => {
  const errors: unknown[] = [],
    events: string[] = [],
    q = new WorldQueue((e) => errors.push(e));
  await q.tick(async () => {
    throw Error("temporary database failure");
  });
  await q.run(async () => {
    events.push("action");
  });
  await q.tick(async () => {
    events.push("tick");
  });
  assert.equal(errors.length, 1);
  assert.deepEqual(events, ["action", "tick"]);
});
