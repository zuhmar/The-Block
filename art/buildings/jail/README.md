# Jail-centered town

The current 128 × 128 m prototype now centers on CENTRAL JAIL at (0, 0). The existing five businesses/homes surround it, served by a street loop and connected western and eastern outbound roads. The eastern road retains the river bridge at z=7. Wilderness remains available outside the city and roads.

| Building | Center (x, z), meters |
| --- | --- |
| Central Jail | 0, 0 |
| General Store | -24, -10 |
| The Haven | 0, -24 |
| Workshop | 24, -9 |
| Old Residence | -24, 16 |
| Warehouse | 24, 19 |

The original Blender jail has a 16 × 14 m footprint, a south entrance with a working hinged door, reception desk, waiting bench, records cabinet, three furnished holding cells, security bars and ceiling lights. Cell entrances are open passages. No arrest, custody, police-spawn or inventory system is introduced.

`jail.blend` is the editable source; the self-contained GLB is in `apps/client/src/fps/models/buildings/jail.glb`. The material palette supplies the glossy cartoon finish. `report.json` records its geometry budget. Rebuild with `pnpm assets:jail`; the shared building-library command also rebuilds the jail.

Shared `building-layout.ts` definitions drive doors, physical collision, shot proxies, interiors and fixture reservations. The jail roof and furnishings use the same metadata and culling as existing buildings. The original five building meshes remain unchanged. The generic building-library generator intentionally handles those five, while `build-jail.py` builds the new landmark.

Five loot indices and rewards are unchanged; their locations move away from new walls and roads. Saved player wood, pieces, IDs, elevations and searched loot indices retain the existing storage format. No save reset or database migration is performed. This is the current single-player 3D prototype; the historical multiplayer world is not modified.

Verification: `tests/jail-district.test.ts`, existing world/building tests, and `tests/browser/jail-district.py`. The browser test uses keyboard and actual emulated phone touch controls to open the door, enter the jail, walk through a holding-cell entrance, and exit, while preserving an existing house and inventory. Software WebGL tests do not measure physical-phone performance.
