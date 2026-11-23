# Fort East military compound

The playable world expands from 128 × 128 m to **256 × 256 m**, retaining the town origin, bridge, original building positions, trees in the old playable area and saved player construction. The river continues to the new north/south boundaries; sparse woodland fills the additional wilderness. The eastern road now reaches and passes through the new compound.

Fort East occupies x=64–112, z=-21–35, beyond the bridge on the eastern bank. West/east gate openings align with the road at z=7. The perimeter has security fencing, floodlight posts and low sandbag cover. Buildings connect to the main approach with pedestrian paths; outdoor circulation and guard routes remain clear. The compound is reserved from player construction; open wilderness outside the town, compound, roads, trees and water remains buildable.

| Building | Center (x, z) | Interior |
| --- | --- | --- |
| Fort East Command | 76, -12 | Briefing/communications spaces, radio desks, cabinets |
| SWAT Barracks | 96, -12 | Four cots, storage and shared table |
| Military Supply Hangar | 100, 25 | Curved steel roof, racks, pallets, packing station |
| Field Tent | 74, 22 | Olive canvas ridge roof, cots, field table and cabinet |
| Medical Tent | 86, 22 | Khaki canvas roof, first-aid emblem, treatment cots and supplies |

All five use the existing E/USE entry-door animation, player collision, furnishing reservations, interior culling and cheap shot proxies. Tents have hinged entrance flaps and slope-aware head clearance. `military-*.blend` files are editable sources; the self-contained GLBs are in `apps/client/src/fps/models/buildings/`. Rebuild with `pnpm assets:military`. `report.json` records the geometry and download budgets. Artwork is original Blender geometry with the project's glossy cartoon material palette; no external image or texture download is required.

Four white SWAT riflemen patrol the gate sector, northern perimeter, tent lanes and supply yard. Each has its own health, aim, shots, waypoint progress and respawn post. They use the existing SWAT combat tuning and visible-projectile combat. After losing sight of a target, a small cached navigation grid helps them rejoin their assigned circuit, including returning from an interior through an open doorway and recovering when a closed exit is reopened. Chase movement stays within the compound. Animation mixers and skeletons are independent; the SWAT mesh geometry, textures and animation clips are shared across clones so multiple guards do not reload and duplicate the same model.

Seven new loot containers are appended after the original 21: one in each new building plus two supply caches outdoors. Existing searched indices, player wood and construction IDs remain unchanged. New structures in the expanded wilderness also pass the local-save coordinate validator. No database migration, save reset or multiplayer rewrite is included.

Verification covers bridge continuity, expanded limits, old and new save coordinates, compound building restrictions, fencing and low cover, complete patrol circuits, combat, return-to-route and individual respawn. Model checks cover hollow furnished rooms and door hinges. Browser routes use actual desktop/phone controls to cross the bridge, observe patrols, enter and close a tent, search once, and reload the preserved save. Phone combat uses the rifle to clear bridge guards; walking unarmed into the compound is dangerous. Software WebGL is not a physical-device performance benchmark.
