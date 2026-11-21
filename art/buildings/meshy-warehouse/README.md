# Uploaded warehouse and props

The seven uploads are retained byte-for-byte in originals/. `pnpm assets:meshy-warehouse` rebuilds the editable warehouse.blend, runtime warehouse.glb and six standalone prop GLBs. Blender source packs textures. Runtime prop textures are limited to 1024px; topology reductions preserve silhouettes and UVs.

The uploaded warehouse was a textureless, fused scan with no usable floor or independent door. The prepared version fits the existing 12 × 9 m warehouse footprint. It uses the uploaded shell with cleaned blue steel cladding and resurfaced roof panels, new interior lining/floor/ceiling, and a separate 1.6 m hinged pedestrian door. The loading shutter is decorative. Existing movement, USE interaction, door angles, hitboxes and saved-world data remain authoritative.

Four storage racks, two pallets, parcels, a pallet jack, packing station and cabinet occupy the existing five furniture reservations. The central walkway and centered entrance stay clear. Props are visual furnishings, with the existing fixture collisions; this change adds no storage or loot mechanics. Standalone GLBs preserve native aspect ratios at unit maximum dimension; placed props are fitted to the existing reservations.

`report.json` records source hashes, triangle counts and placement dimensions. Exterior/interior renders provide art review. The original five-building asset library is retained; the live warehouse URL selects the new model with the existing procedural failure fallback.
