# Lumberyard and compact city integration

The 32 × 32 m lumberyard occupies the southern city block at **(46, 102)**. Its three entrances connect to existing avenues through short service streets. The truck and pedestrian gates remain open for multiple approaches. The saw shed has a walkable slab, roof headroom and an accessible front opening.

All six existing Meshy prop types are present across nine placements: two log cradles, three plank pallets, a forklift, saw bench, capture terminal and shipping container. Movement colliders match the posed architecture and the normalized prop bounds. Projectile proxies preserve gaps in the wire fence and include the shed roof. Harvestable trees use the existing gathering and respawn system and avoid solid props. The central terminal is currently scenery: shared capture ownership still requires the planned 3D multiplayer integration.

The city adds **14 furnished two- and three-story buildings**, bringing the total to **51**. Existing prefabs retain their geometry, stories, collision, stairs and door behavior. A new short north–south street divides the eastern residential block; three service streets reach the lumberyard. Crosswalks mark the new connections. The southern avenue moves four metres north to clear the existing harbor forklift. Supply cases keep their saved indices and sit outside the road.

All 12 housing plots keep their IDs, dimensions and positions. Existing building and loot indices stay intact; new building loot appends after the West Court supplies. No save version, player-built structure, inventory, lease or upkeep data is reset.

## Runtime assets and performance

`pnpm assets:timber-yard-runtime` produces local derivatives from the committed Blender architecture and Meshy GLBs. Props use a single uniform source scale and floor pivot, with embedded 1K JPEG textures. The forklift receives an axis rotation before fitting its physical envelope. No model is stretched. Architecture renders in batches by material; repeated prop placements share geometry and textures. The yard has distance culling and a coarse collision rejection outside its footprint. Runtime GLBs total approximately **2.8 MB**. No additional Meshy credits were spent.

## Verification

- Full suite: **296 tests passed**.
- Type checking, lint and production build passed.
- Actual player movement function traversed all three yard access routes.
- Fine-grained road collision checks covered every road segment; building entrances, housing clearances, stairs, roof access, save migration and loot identity checks passed.
- Browser game startup loaded **7 assets / 9 prop instances**, with zero script errors and zero missing requests.
- Browser-rendered yard and city previews were visually inspected. These inspection scenes show the building/road/yard layers; the playable game also renders water, trees, housing, NPCs and other existing scenery.
