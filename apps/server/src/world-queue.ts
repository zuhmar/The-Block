// Keep authoritative work ordered, without letting redundant simulation ticks delay actions.
export class WorldQueue {
  private tail: Promise<unknown> = Promise.resolve();
  private tickPending = false;
  constructor(private onError: (error: unknown) => void) {}
  run(fn: () => Promise<void>): Promise<unknown> {
    this.tail = this.tail.then(fn).catch(this.onError);
    return this.tail;
  }
  tick(fn: () => Promise<void>) {
    if (this.tickPending) return;
    this.tickPending = true;
    return this.run(async () => {
      try {
        await fn();
      } finally {
        this.tickPending = false;
      }
    });
  }
}
