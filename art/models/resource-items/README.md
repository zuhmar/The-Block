# Reference-matched resource items

Four original Blender inventory/drop models built from the approved corrected resource sheet: three cut wood logs, a gray rock cluster, vivid yellow sulfur, and gray metal ore with rusty orange-brown deposits. The silver-blue/ingot metal versions are not used. These are item-sized models, separate from the existing harvestable world nodes.

The original image supplies the projected painted detail, including log end grain, bark, rock facets, mineral colors and outlines. Each model is a collection of three closed, outward-facing solid volumes with actual depth, rather than textured planes or camera-facing sprites. The log ends are perpendicular to their oblique 3D axes. Rock silhouettes are traced from the image; their backs and thickness are authored interpretations because the reference supplies only one view. The front comparison and angled renders show that distinction.

The ores embed their unchanged 654 × 601 reference quadrants. Wood uses a 2048 × 1024 atlas baked from its original quadrant: projected detail on visible faces blends into wrapped bark on the hidden sides, keeping end grain on cut ends. Each GLB uses one shared PBR material across three meshes. There are no external texture dependencies, ground planes, background patches or baked floor shadows. GLBs use metres, Y-up and a ground-centered origin, at about 0.7 m width. The Blender scenes retain editable component geometry, projected UVs, packed image guide, camera and studio lights. Exact exported dimensions and triangle counts are in `manifest.json`.

Rebuild with `pnpm assets:resource-items` (Blender and Python/Pillow required). Run `pnpm exec tsx --test tests/resource-item-models.test.ts` to validate original ore pixels and wood reference/atlas, source provenance, normals/volume orientation, ground alignment, real depth and import/triangle budgets through GLTFLoader. Transparent front and angled renders are included, along with a comparison sheet.

This delivers the models and textures. It does not replace the in-world resource nodes or change resource rewards, HUD, inventory, saves or gathering behavior.
