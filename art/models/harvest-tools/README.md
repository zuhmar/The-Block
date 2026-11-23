# Street Survival harvest tools

Original Blender models authored from the approved AI axe and pickaxe sprites in `art/ai/harvest-tools`. These are full 3D meshes, not image planes or reused placeholder tools. The reference is packed into each editable Blender scene as a non-rendering guide.

Both tools have a curved wooden haft, solid grain accents, layered charcoal grip, orange cross bindings and glossy steel. The axe has a broad crescent bit and polished cutting bevel; the pickaxe has a tapered curved mining spike and opposing chisel. Self-contained PBR color materials require no external texture files. UVs are provided for future painted textures.

GLBs are in metres, Y-up, with the lower hand grip centered at the local origin. Each export combines parts into six material meshes. Dimensions and actual triangle counts are recorded in `manifest.json`. Blender sources retain editable separate parts, camera, studio lights and packed reference. Transparent renders preview actual model geometry.

Run `pnpm assets:harvest-tools` from the repository root with Blender installed. Run `pnpm exec tsx --test tests/harvest-tool-models.test.ts` to validate GLTFLoader import, reference hashes, dimensions, UVs, materials and rendering budgets.

This asset pass supplies the new models for integration. The current in-game contextual tool models and harvesting animations are unchanged.
