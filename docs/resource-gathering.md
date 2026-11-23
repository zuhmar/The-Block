# Gathering resources in the 3D prototype

The wilderness contains 440 fixed tree locations (broadleaf, pine and birch) and 75 mineral nodes: 25 ordinary rock, 25 sulfur and 25 metal. The original Blender GLBs use near/distant geometry, instanced material batches and camera/distance culling. Collision and interaction use simple independent proxies rather than detailed model triangles.

Aim at a trunk or node within 3.2 metres. Hold **E** on desktop or the contextual **CHOP / MINE** button on a phone. USE performs one swing; attacking with empty hands also gathers a resource under the crosshair. The first-person character uses an axe for trees and a pickaxe for minerals, with wind-up, contact and follow-through poses. Tools are contextual; equipping a gun does not consume ammunition for gathering. Walls and other cover block gathering, and reach is rechecked when the swing lands.

| Resource | Health | Strikes | Reward per strike |     Total | Respawn                         |
| -------- | -----: | ------: | ----------------: | --------: | ------------------------------- |
| Any tree |    100 |       4 |           25 wood |  100 wood | 120 seconds, original location  |
| Rock     |    100 |       4 |            8 rock |   32 rock | 45 seconds, new random location |
| Sulfur   |    100 |       4 |          5 sulfur | 20 sulfur | 45 seconds, new random location |
| Metal    |    125 |       5 |           6 metal |  30 metal | 45 seconds, new random location |

Depletion removes collision immediately. A short fall/shrink visual marks depletion. Mineral respawns move at least ten metres from their previous position and avoid the player, tree canopies, other nodes, buildings, roads, water and bases. Tree regeneration waits when a player or structure occupies its fixed spot. If no safe mineral position is found, the slot remains depleted and retries; it never falls back to an unsafe position.

Resource damage, mineral coordinates/generations, depleted tree timers and the resource wallet persist in the existing device-local prototype save. Timers use wall-clock time, including time offline. Strikes have a cooldown and recheck the live target to prevent duplicate awards. Existing wood, opened crates and player structures are preserved when adding the optional save fields. Reset local prototype explicitly resets resources as well. Existing online characters/world data are separate.

Wood joins the existing building balance. Rock, sulfur and metal appear in their own HUD counters and are stockpiled; this change does not alter existing practice-building recipes, add crafting recipes or change weapon ammunition.

Verification: `pnpm verify` includes resource population/placement, collision removal, fixed/random respawn, base obstruction, wallet/save compatibility, hit cooldown, swing phases and stable proxy identity checks. `tests/nature-models.test.ts` checks all twelve GLB exports through GLTFLoader.
