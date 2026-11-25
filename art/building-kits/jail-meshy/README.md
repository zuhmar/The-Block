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

## Raw-source limitations

The `raw/` files are the original generated source assets. See the prepared integration below for the repaired, assembled game exports. Meshy previews show some opaque chain-link infill and imperfect architectural details. Replace fence infill with actual open mesh or an alpha-cutout material. Check all sides of buildings, remove overlapping trim at joins, and create verified hollow rooms, floors, corridors and stairs where players enter. Doors, gates and barrier arms are static and need separated geometry, pivots and animation before gameplay integration. Collision, navigation, exact snap alignment, physical dimensions and mobile rendering have not been verified for this new kit. The original generation did not replace the playable jail.

All 18 files passed GLB header/length/JSON checks and contain meshes, materials and embedded images without external buffers. Total measured indexed triangle count is recorded per model in the manifest. Thumbnail inspection is not a topology or interior-access guarantee.

## Prepared game integration

`pnpm assets:jail-kit` reproduces the prepared exports from `raw/` and the shared `jail-kit-layout.ts` plan. `base-playable-jail.glb` supplies the original entrance hinge and leaf. The corrected shell is modeled as a rear cell block and two forward wings, with an open central courtyard, matching wall/roof collision and furnished cells/reception areas. The active game uses `models/buildings/jail.glb`, the compact island uses `models/street/jail-meshy-grounds.glb`, and all 18 normalized pieces are available under **Jail** in the separate map editor. `integration-report.json` records source hashes and actual export sizes/triangle counts. `jail-assembly.blend` contains the editable prepared grounds assembly.

The prepared straight fences have real open chain link. Repeated panels meet along common spans. The grounds use a 34m square perimeter within the existing jail island, four tower stairs/platforms, an open basketball court, exercise equipment, benches and a hollow gatehouse. Vehicle and pedestrian gates have independent named hinges driven together by the compound-gate interaction; the approach barrier lifts at the same time. Press **E / USE** near either gate to open or close them. Swept collision prevents the leaves from closing through players. The central jail uses its original animated door leaf at the recessed courtyard entrance and retains furnished cells and reception spaces in the U plan. Bridge geometry is part of the grounds assembly and its deck matches the existing water crossing.

Runtime integration adds no Meshy charges and changes no player inventory, owned plots, upkeep deadlines or persistent structures. It does not add a second playable jail floor: the two-row Meshy facade is fitted to the existing building envelope while its working interior is retained. Source-model doors and window details not used as gameplay entrances remain decorative. This is a single-player prototype integration, not network-authoritative gate state.


## Proportion and footprint correction

Imported Meshy geometry uses one uniform scale factor for all three axes. Objects are not flattened or stretched to match an arbitrary bounding box. Precise architectural parts (the U shell, bridge tiles, gates, gatehouse and fence panels) are re-authored to their intended dimensions in Blender using the reference palette. Stock fence modules repeat unchanged; only the terminal panel is trimmed to close a shorter span. The bridge is four 8m modules at local z = 24, 32, 40 and 48, all placed at unit scale. Its posts and rails repeat at the intended proportions instead of extending one model over 32m. The prepared standalone source-derived props preserve their aspect ratios.

The jail's outdoor central opening is x = -4..4, z = -1..7 in building-local coordinates, with no roof, blocking front wall or invisible shooting slab across it. The main entrance is at z = -1; each side wing also has an open front entry. Player collision, interior detection, shot proxies, NPC entry targeting and editor geometry use this same footprint. No plot or saved player structure moves for this correction.
