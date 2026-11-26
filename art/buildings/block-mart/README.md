# Block Mart · reference-guided Blender building

A single-storey corner convenience store modeled directly in Blender from the approved concept. The architecture uses a 10 × 10m pentagonal floor plan with a chamfered corner entrance, 28cm-thick walls and 4.1m room height. Awnings, sills, door reveals, projecting masonry, individual brick relief, stepped parapets, roof equipment, gutters, lights and a security camera have real geometry. No generated model is flattened or stretched to make the building fit.

## Files

- `block-mart.blend`: editable source with the assembled building, packed reference image, studio setup and a hidden **Reusable modules** collection arranged off to the side.
- `block-mart.glb`: furnished detailed model, exported at metre scale with embedded materials and no external texture dependencies.
- `block-mart-lod.glb`: lighter distance version that removes small brick, grocery-label and package detail while preserving architecture and all door animations.
- `parts/`: 14 independent reusable GLBs: display window, glass entrance door, delivery door, stockroom door, awning, retail shelf, checkout counter, refrigerator, supply boxes, roof AC, roof vent, exterior lamp, security camera and downpipe.
- `layout.json`: floor outline, actual wall openings, door centers/tangents, stockroom partitions and fixture bounds shared by runtime collision and shooting cover.
- `model-report.json`: measured triangle/file counts and reference SHA-256.
- `preview-exterior.png`, `preview-rear.png`, `preview-interior.png`: Blender renders of the modeled geometry, not AI concept images.

## Scale and animation

The floor surface is Y=0 in game coordinates; glTF is Y-up. The base building footprint spans X/Z=-5..5 with the northeast corner cut along X+Z=8. Roof trim, awnings, threshold and delivery supplies extend beyond that floor outline. All placed module scales remain `(1,1,1)`; use the modeled dimensions rather than squeezing the file into a different building envelope.

Named hinges `front-door-hinge`, `delivery-door-hinge` and `stockroom-door-hinge` each have independent `*-door-open` and `*-door-close` clips. The openings are 1.8m (front) and 1.5m (service/stockroom) before frames; the frames leave clear passages of approximately 1.6m and 1.3m. Each animation lasts one second and rotates its own leaf through 90 degrees. The window panes are transparent and set behind the outer masonry surface; they are not painted window decals.

The interior contains two stocked shelf aisles, checkout/register, three stocked refrigerators, a partitioned stockroom, pallets/cartons and ceiling fixtures. Brick variation, cream plaster, teal metalwork, charcoal trim, glass and packaging share 18 PBR materials. Small wear/repair accents are modeled on the wall base. The model deliberately retains the game's glossy cartoon style rather than photorealistic noise.

## Reproduction and verification

Run `pnpm assets:block-mart` with Blender 4.3.2. Add `-- --skip-renders` when invoking the Python script directly to export the models/source without repeating studio renders. No Meshy credits or remote generation are used. The source requires the standard DejaVu Sans Bold font during generation; exported lettering is mesh geometry.

Automated checks parse both GLBs, enforce geometry/file budgets and unit scale, compare the packed reference hash, check fixture bounds, verify recessed transparent glazing, and play each independent animation to prove its opening is actually clear. Studio lights and background are preview-only and are excluded from the GLBs.

The compact city now uses this model at the existing store location, without scaling. E / USE operates the diagonal front entrance, stockroom and delivery doors independently. Physics, bullet cover and NPC door avoidance share the exported layout. The original store remains available for legacy layout compatibility. The detailed model switches to its lighter model at 45m. The map editor includes the assembled shop and all 14 reusable props. Existing player saves and loot cooldown indices are preserved. Automated/browser verification does not establish performance on a physical phone.
