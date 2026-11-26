# Timber yard — Blender architecture kit

Eleven individually authored, metre-scale modules based on `art/ai/pvp/timber-yard/reference.png`. The matching six textured Meshy props are available in [meshy-props](meshy-props/README.md). Both packs await placement in the playable map.

| Module            | Dimensions / purpose                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| Fence panels      | 1, 2 and 4-metre bays, 2.2 metres high; actual open diamond wire                                 |
| Fence post        | Separate teal post with a cream structural footing                                               |
| Sliding gate      | 8-metre bay, 7.55-metre clear opening; slides 8.25 metres left                                   |
| Pedestrian gate   | 2-metre bay, 1.66-metre clear opening; hinged leaf                                               |
| Truck entrance    | 8-metre bay, 7.5 metres clear width, 4.14 metres clear height                                    |
| Concrete barrier  | 2-metre module, 0.9 metres high, 0.72 metres deep                                                |
| Saw-shed shell    | 6 × 6-metre open-front structure; 5.32-metre clear entrance, 3.02-metre headroom above its floor |
| Saw-shed roof     | Matching pitched roof with eave mounting datum at Y=0; mounts at Y=3.3                           |
| Complete saw shed | Shell and a genuinely detachable roof group                                                      |

`timber-yard-kit.blend` contains the assembled architecture, editable module library, packed concept image, materials, lights and camera. `parts/` contains the eleven self-contained GLBs. `timber-yard-architecture.glb` is an architecture-only assembly proving that the parts connect around a 32 × 32-metre yard with three entrances and a clear central area.

All pieces retain unit scale. Meshes are authored to their actual dimensions rather than stretched during placement. The sliding gate needs its declared parking clearance on the left, behind the fence. Gate GLBs contain named `open` and `close` clips with a one-second duration; they start closed. The shed roof remains under `detachable-shed-roof`, and its meshes are tagged `roof` for cutaway editing.

`manifest.json` records snap coordinates, collision boxes, gate motion, clearances, floor surfaces, reference provenance, and exact assembly placements. Snap empties carry the `snap` metadata key; use this key rather than Blender's display-name suffixes when locating a connector. Fence movement screens do not pretend to be solid bullet cover; structural concrete curbs and posts have separate projectile collision data. Render-only ground is excluded from every GLB: no terrain patches are baked into standalone modules.

Rebuild and validate with `pnpm assets:timber-yard-kit`. The validator loads every export in Three.js and checks dimensions, scale, connectors, open-wire gaps, animated gate clearance, shed access and roof removal. `checks.json` records the result.

These models have not been placed into the playable map. This stage adds no capture logic, multiplayer ownership, resource changes or save migrations, and spends no Meshy credits.
