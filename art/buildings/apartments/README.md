# Multi-story city buildings and indoor loot

Two original glossy cartoon Blender buildings extend the jail district:

| Building | Center (x, z) | Stories | Private rooms | Interior floors |
| --- | --- | --- | --- | --- |
| Courtyard Flats | 0, 23 | 2 | 4 | 0 and 3.2 m |
| Corner Tenements | -24, -25 | 3 | 6 | 0, 3.2 and 6.4 m |

Each floor contains two rooms with open interior doorways, furniture, hallway and stairs with railings. The exterior door uses the existing E/USE hinge animation. Reach upper stories by taking the stairs on the right side of the hallway. At each rear landing, walk around the stair opening to reach the rooms or the next flight. The HUD identifies the current floor. Roof access and new NPC behavior are not introduced.

`flats.blend` and `tenement.blend` are editable sources; runtime GLBs are under `apps/client/src/fps/models/buildings/`. Rebuild with `pnpm assets:apartments`. The shared building-library rebuild also includes these models. The models have self-contained glossy materials and no external texture downloads. The two GLBs total about 1.9 MB; geometry budgets appear in `report.json`.

The shared building layout defines floor slabs with stair openings, stair runs, floor elevations, partitions and furniture. These definitions drive render exports, player collision, ceilings, walkable surfaces and cheap shot proxies. Stair tread visuals use thin steps with clearance underneath; movement follows a continuous stair surface. Floor support respects the player's current elevation to prevent jumping automatically between stories. Layout arrays are cached rather than recreated during movement. Procedural fallback buildings retain floors and stairs if a GLB download fails.

There are 21 loot crates: the original five plus 16 indoors across all eight buildings. Both private rooms on each new floor contain crates, with higher tiers on upper stories. The original five loot indices and reward formula remain intact; new loot is appended so existing searched containers stay searched. The second outdoor crate shifts to the western alley to clear the tenement entrance. Searching requires proximity, compatible elevation, and a clear ray to the container; closed doors, partitions and floors block searching. The distance check runs before raycasting to keep distant containers inexpensive.

Player wood, construction IDs, story elevations and searched indices keep their existing local save format. No database migration, save reset, construction-budget change or multiplayer rewrite is included. The countryside sign is relocated beside the flats to avoid placing it inside the new building.

Verification includes geometry/UV-independent GLB loading, stairs and landings, head clearance, exterior walls upstairs, room openings, crate/furniture separation, legacy saves, and real-control browser routes. `tests/browser/apartment-buildings.py` walks upstairs and downstairs, searches once, checks blocked searches through room walls, and reloads the save using keyboard and emulated phone touch input. Software WebGL checks are not physical-phone performance benchmarks.
