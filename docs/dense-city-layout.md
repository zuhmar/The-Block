# Denser city street blocks

The compact city now contains **75 buildings**, up from 51: **18 additional three-story tenements and six smaller homes**. The 24 authored positions in `dense-city-plan.json` fill street-facing gaps, create tighter residential rows, and add a line of buildings along the northern waterfront. Every addition reuses an existing furnished prefab at its original size and preserves its door, room, stair and collision layout.

The additions retain roughly two metres of clearance between neighboring footprints and a two-metre setback from the paved street edge. Their entrances face streets and connect to sidewalks. All **62 public city entrances** have validated walking routes; original entrance routes remain open. The other 13 buildings retain their authored jail, military and laboratory circulation.

All twelve housing plots retain their IDs, positions and dimensions. Resource parks, lumberyard entrances, compound patrol areas and dock geometry remain clear. Existing buildings and loot retain their indices; 24 additional indoor caches append after existing world data. No inventory, housing lease, upkeep or player-built structure is reset.

## Rendering

`city-row-render.ts` keeps full interactive building geometry within 45 metres. Beyond that distance, repeated exterior meshes render in shared instance batches, using the existing tenement LOD. Interiors remain excluded from the distant batches. Buildings beyond 145 metres stop rendering. Meshes and materials are reused; no new artwork downloads are required.

The browser measured **36 shared exterior batches / 492 mesh placements for the 24 additions**, with zero script errors and zero missing asset requests. Static source transforms are retained, and full door/room geometry returns on approach.

## Validation

- **301 automated tests pass**, including street-to-door movement, all housing clearances, resource access, building separation, indoor cache placement, rotated stairs and door interaction, and distant/near rendering transitions.
- Type checking, lint, asset validation and production build pass.
- The actual game loads all 24 additions and all 62 public street frontages successfully.
- A browser-rendered overview was inspected for the new street rows and waterfront spacing. That overview shows the architecture and road layers; the playable game also includes existing water, trees, housing, NPCs and environmental props.
