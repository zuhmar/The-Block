# Street Survival harvest tools

Revised Blender models traced from the approved AI axe and pickaxe sprites in `art/ai/harvest-tools`. These are full 3D meshes, not image planes or reused placeholder tools. The reference is packed into each editable Blender scene as a non-rendering guide.

Both tools have the reference silhouette, a thicker curved wooden haft, layered diagonal charcoal grip, orange socket wraps and glossy steel. The axe has a broad crescent bit and polished cutting bevel; the pickaxe has a tapered curved mining spike and opposing chisel. Reference-projected UVs carry the original wood grain, leather shading and steel facet coloration onto the actual 3D surfaces. The shared color image is embedded in each GLB, so no external texture files are required. Rear surfaces reuse the projected finish; this is a textured 3D interpretation of one view, not unseen detail recovered from the image.

GLBs are in metres, Y-up, with the lower hand grip centered at the local origin. Each export combines parts into five material meshes and stays below 12,000 triangles for a close first-person view. Dimensions and actual triangle counts are recorded in `manifest.json`. Blender sources retain editable separate parts, camera, studio lights and packed reference. Transparent renders preview actual model geometry.

Run `pnpm assets:harvest-tools` from the repository root with Blender installed. Run `pnpm exec tsx --test tests/harvest-tool-models.test.ts` to validate GLTFLoader import, reference hashes, dimensions, UVs, embedded texture decoding, materials and rendering budgets.

This asset pass supplies the new models for integration. The current in-game contextual tool models and harvesting animations are unchanged.
