# Compact city and jail island

The active 3D map places the jail on its own island north of the city. One bridge crosses the water channel to the city street network. The mainland is approximately 324 × 256 metres, with a working harbor on the south coast. The former countryside is no longer playable land. The 640m save/editor envelope is retained for compatibility; it does not define the new walkable area.

The remaining jail district, West Quarter, shops, apartments, military compound and laboratory share one continuous city. There are 36 buildings, including ten additional furnished variations, with connected street blocks. Twelve 16m/24m housing parcels occupy gaps between buildings rather than an outer housing estate. Existing prices, upkeep, purchase distance and construction limits are unchanged. Three pocket parks supply trees; rock, sulfur and metal respawn inside three urban resource yards. Existing loot, interior fixtures, stairs, doors, patrols and collision data move with their buildings. Existing model assets are reused.

## Saved worlds

The client backs up the original raw local save once under `street-survival:pre-compact-city:v1`, before migration. Version-two migration preserves plot identities, lease deadlines, cash, inventory, structure health, storage contents and relative structure positions. Foundations retain their two-metre construction grid. Purchased homes move to their corresponding city parcels. Older unleased bases move whole to private reserved parcels, with no new rent assigned. These parcels are excluded from sale. Dropped loot is recovered near the city end of the bridge. Natural harvest state restarts for the relocated resource sites.

Migration is idempotent and runs on a clone. If an unusually large legacy base cannot fit any city parcel, the original save and original layout remain active; the start notice explains why. No base is truncated or deleted to force it into the new map. This remains device-local prototype persistence; the historical multiplayer database is untouched.

## Editor and verification

The editor's **Current map** action creates the compact city, separate jail island, bridge, resource yards and housing boundaries. Existing editor drafts remain unchanged until the user chooses to replace them.

Automated checks cover building separation, street traversal, island/channel/bridge collision, clear housing lots, resource density, patrol routes, prefab marker rendering and migration integrity. Browser checks cover rendering, bridge traversal, building entry and the land interface. These checks do not establish physical-phone frame rate or network PvP performance.

## Meshy jail kit

The compact island now uses the prepared Meshy jail grounds and exterior. Its 34m perimeter fits within the existing island. The compound gates open with E / USE near the main gate or pedestrian gate, and the approach barrier lifts with them. Four climbable tower stairways, courtyard props, a hollow gatehouse and the bridge use a shared metre-based plan. The existing jail rooms, main entrance door and save migration stay in place. The map editor includes the assembled perimeter and all 18 standalone prepared components. See `art/building-kits/jail-meshy/README.md` for provenance, reproduction, and the retained single-floor interior limitation.


The jail shell is now a true U shape: roof and rooms cover the rear bar and two side wings while the middle remains outdoors. The recessed main entry and open wing entries share their coordinates with physics and shooting cover. Four equal 8m bridge modules replace the stretched crossing model. Imported jail props use uniform scaling; dimension-critical modules are explicitly modeled or trimmed, never stretched along one axis.
