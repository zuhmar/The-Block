# Street Survival · Meshy jail source kit

18 separately generated, textured GLBs made from the approved glossy cartoon jail references using Meshy `meshy-t2` smart topology and `meshy-n1` textures. Total charge: 270 credits. Generation completed for every asset without reruns. Task IDs, source crops, target polygon counts, hashes and measured mesh statistics are recorded in `manifest.json`.

## Files

- `raw/`: original Meshy GLBs with embedded textures, suitable for importing into Blender.
- `references/`: individual modeling inputs extracted from the coordinated reference sheets.
- `previews/`: Meshy's model thumbnails, inspected as a contact sheet in `preview.jpg`.

Architecture: cellblock, entrance, corner wing, guard tower, gatehouse, bridge.
Security: straight fence, corner fence, vehicle gate, pedestrian gate, barrier arm, floodlight.
Courtyard: basketball hoop, bench, picnic table, pull-up bars, weight bench, trash bin.

## Assembly specification — intended dimensions, not applied transforms

Use metres, a common ground plane, and a 2m placement grid. Buildings share an 8m two-story envelope with the intermediate floor at 4m. Gray-blue concrete, navy metal/roofs, mustard safety accents and cyan glazing belong to one shared material palette. Normalize material values when assembling; AI textures vary slightly.

| Module | Intended width × depth × height (m) |
| --- | --- |
| Straight cellblock | 12 × 8 × 8 |
| Entrance | 8 × 8 × 8 |
| Corner wing | 8 × 8 × 8 |
| Guard tower (including stairs) | 6 × 6 × 12 |
| Gatehouse | 4 × 4 × 3.5 |
| Bridge | 8 × 8; deck height matches road |
| Straight fence | 4m post-center span; 3.5m body plus wire |
| Corner fence | two 4m post-center spans at 90° |
| Vehicle gate | 8m clear opening; match fence height |
| Pedestrian gate | 2m clear opening; match fence height |

These are modeling targets. Raw Meshy sizes and pivots have **not** been converted to these dimensions. Build joins on exact planes, use one shared post per adjoining fence pair, and trim roof parapets where building modules meet. Bridge approach ends must remain free of cross rails, with matching deck elevation. Place four instances of the same tower asset rather than generating four different towers.

## Known limitations before runtime use

These are generated source assets, not an integrated playable jail. Meshy previews show some opaque chain-link infill and imperfect architectural details. Replace fence infill with actual open mesh or an alpha-cutout material. Check all sides of buildings, remove overlapping trim at joins, and create verified hollow rooms, floors, corridors and stairs where players enter. Doors, gates and barrier arms are static and need separated geometry, pivots and animation before gameplay integration. Collision, navigation, exact snap alignment, physical dimensions and mobile rendering have not been verified for this new kit. The existing playable jail remains unchanged.

All 18 files passed GLB header/length/JSON checks and contain meshes, materials and embedded images without external buffers. Total measured indexed triangle count is recorded per model in the manifest. Thumbnail inspection is not a topology or interior-access guarantee.
