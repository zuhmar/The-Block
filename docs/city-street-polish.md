# City street polish

The compact map now uses a shared street layer with softly grained asphalt, concrete sidewalk joints, segmented curbs, curb openings at entrances, zebra crossings, approach-lane stop bars, tactile corner pads, drainage grates, utility covers and restrained repair patches. Lane markings stop before junctions. Intersections share the same world-space pavement UVs, avoiding texture discontinuities where roads overlap.

`city-streets-layout.ts` derives the layer from the existing road network and all 62 public frontages. It records **30 junctions, 99 crossing approaches, 156 drainage grates, 74 lamps and 14 cardboard/bag clutter clusters**. Corner turns remain free of unnecessary crossing markings. Lamp and clutter placement avoids entrance walks, housing plots, resource parks, nearby loot and existing obstacles. Solid props have movement collision and shooting proxies; pavement details remain traversable.

`city-streets-view.ts` draws the entire detail layer in **23 shared batches**, including two pavement meshes. Two small procedural 128 × 128 textures provide subtle surface variation without external downloads. Lamp lenses use a warm emissive material, with no additional real-time lights. Curbs, markings, covers, poles and clutter share geometry and materials. Standalone objects have no baked terrain patches.

The 75 building placements, housing leases, inventories, structure data, gathering nodes and existing loot indices are unchanged. Legacy maps retain their original road rendering and acquire no invisible street obstacles when compact-map configuration is undone.

Validation: **303 tests pass**, including all public street-to-door movement routes, housing and resource clearances, solid-prop collision, world-identity preservation, pavement UV consistency and batch budgets. Type checking, lint, asset validation and production builds pass. Browser startup reports no script errors or missing assets, and the close-up architecture/street preview was visually inspected.
