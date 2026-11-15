import type { PoolClient } from "pg";

// Hold a session lock for the lifetime of the process. A rolling replacement may
// wait, but must never migrate or tick the shared city while its predecessor runs.
export async function acquireAuthority(client: PoolClient, waitMs = 0) {
  const deadline = Date.now() + waitMs;
  let waiting = false;
  while (true) {
    if (
      (await client.query("SELECT pg_try_advisory_lock(739481) AS locked"))
        .rows[0].locked
    )
      return;
    if (Date.now() >= deadline)
      throw Error(
        "Another Street Survival authority is already running for this database",
      );
    if (!waiting) {
      console.log(
        "Waiting for the previous city authority to stop before migration.",
      );
      waiting = true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
