Phone movement and action latency fixes:

- Touch press, release, cancellation and lost pointer capture send current movement immediately; they no longer depend on the next Phaser update. Blur and page hiding clear held controls and send a stop. The normal movement heartbeat remains unchanged.
- Authoritative world work remains serialized, but at most one simulation tick can be queued/running. Slow database operations cannot accumulate redundant ticks ahead of later player actions. Actions are retained in order.
- After successful commits, snapshots use the world returned by the transaction. This removes an extra full-world database read and upgrade on every tick and action without changing durability. A failed commit does not replace the authoritative cache.
- Join reloads go through the same queue as ticks and actions, preventing an older join read from overwriting a newer committed position.

Server movement/collision validation, speed limits, request deduplication, input expiration and persistent world format remain unchanged. No client-side movement prediction is added.

Verification: all 82 tests pass, including overload coalescing and recovery after a failed tick, plus existing real WebSocket, persistence/restart and 20-client checks. Lint, type checking, asset validation and production build pass. Desktop/mobile software WebGL checks pass without page errors. A dedicated 390 × 844 touch test observes press/release/cancel/blur sends with zero rendered frames, then confirms authoritative movement after rendering resumes. Results are in `mobile-input-check.json`. These local tests do not measure the user's phone hardware or cellular latency.
