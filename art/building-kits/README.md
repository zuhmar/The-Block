# Player building kit modeling references

Original AI-generated glossy cartoon concept sheets: references/wood.png, stone.png and metal.png. Each sheet contains the same 20 component designs. The metal double-door pair was corrected to put its hinges on the outer edges. These are visual references, not measured orthographic blueprints; use the dimensions below when modeling. Raster dimensions differ between sheets and do not define game scale.

## Shared modeling targets

Use identical snap edges, openings and pivots across wood, stone and metal so upgrading a piece can retain its placement. The existing game uses a 2 m horizontal building grid, 2.5 m tall placeholder walls, 0.16 m wall collision thickness and 0.18 m floors. The original image brief suggested a taller wall; the modeling targets here take precedence so the new kit matches the current game.

| Component | Target dimensions / construction |
| --- | --- |
| Square foundation | 2 × 2 m footprint, 0.50 m high |
| Triangle foundation | Equilateral triangle, all edges 2 m, 0.50 m high; altitude √3 m |
| Square floor | 2 × 2 m, 0.18 m thick |
| Triangle floor | Equilateral 2 m edges, 0.18 m thick |
| Full wall | 2 m wide × 2.5 m high × 0.16 m thick |
| Half wall | 2 m wide × 1.25 m high × 0.16 m thick |
| Low wall | 2 m wide × 0.625 m high × 0.16 m thick |
| Open wall frame | Full wall envelope, empty center |
| Single door frame | Full wall envelope, centered clear opening 1.12 × 2.10 m |
| Double door frame | Full wall envelope, centered clear opening 1.60 × 2.10 m |
| Window wall | Full wall envelope; centered 1 × 0.90 m opening, sill 1 m above wall base |
| Window shutter | Separate 0.96 × 0.86 m leaf, thickness about 0.06 m |
| Single door leaf | Separate 1.08 × 2.06 m leaf, thickness about 0.08 m |
| Double door leaves | Two mirrored 0.78 × 2.06 m leaves; hinge at outer edges |
| Stairs | 2 m wide × 4 m run, 2.68 m full-story rise; about 14 equal risers. Sheet shows styling, not final step count |
| Ramp | 2 m wide × 4 m run, 2.68 m full-story rise |
| Sloped roof | 2 m horizontal run × 2 m width; 35° pitch; snap using horizontal footprint |
| Roof corner | Match the 35° roof pitch and 2 m edge modules; derive geometry from roof mesh, not the drawing |
| Floor hatch frame | 2 × 2 m slab, 0.18 m thick, centered 1 × 1 m opening |
| Hatch leaf | Separate 0.96 × 0.96 m lid with edge hinge |

For each piece, match silhouette and material language rather than copying image perspective into geometry. Keep structural details inside the snap envelope; avoid protruding bolts/posts that overlap adjacent modules. Thin floors and thick foundations must have exactly matching horizontal edges. Stone structural pieces use masonry; the stone kit's moving doors/shutters/hatches use reinforced timber and iron.

## Delivery

Build one component per model. Use names such as wood_wall_full.glb, stone_foundation_triangle.glb and metal_door_single.glb. Export each double-door leaf separately, or retain two clearly named child meshes. Do not fuse door leaves to frames or hatch lids to slabs. Put moving-part origins on their hinge edge; put wall origins at bottom center and slab origins at bottom center of their footprint. Apply transforms; embed textures in GLB. Start with 1K textures and modest geometry, retaining real door/window openings.

The three sheets are design references for the user's modeling work. New component types, upgrades, stacking, doors and roof snapping require subsequent gameplay integration; this reference-only change does not implement those systems.
