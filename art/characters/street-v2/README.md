# Street V2 — archived Blender benchmark

A review model for the approved glossy black stick-figure Street outfit: burgundy hoodie and cap, charcoal cargo joggers, ivory sneakers and a gold chain. A reproducible Blender modeling script builds the geometry, rig and shading bake. The concept illustrations guide the proportions and materials.

This earlier benchmark is retained as an archived iteration. The active viewer image buttons now load the [fresh four-character image-led library](../image-rebuild/README.md).

This is the Street quality benchmark for review. Gameplay players, NPCs, armor stats and their current movement/combat rigs retain their existing implementations. The new rig and lower-detail model are ready for a subsequent gameplay integration step after visual review.

## Deliverables

- [Editable Blender source](street-v2.blend), including the character, rig, materials, packed shading image, animation actions, lights and camera.
- [Game GLB](../../../apps/client/src/fps/models/street-v2.glb): **37,504 triangles**, **28 bones**, **10 materials**, five independently removable mesh groups. About 1.96 MB, including the embedded image. The viewer renders the model in 16 draw calls, plus one for its pedestal.
- [Lower-detail GLB](street-v2-lod.glb): **16,873 triangles**, preserving bone weights, clothing groups, materials and animation clips. Exported for future distance/mobile integration; the benchmark viewer shows the detailed model.
- [512 × 512 baked shading atlas](street-v2-ao.png), packed into both GLBs and the Blender file.
- Studio renders: [front](front.png), [side](side.png), [back](back.png), [three-quarter](three-quarter.png).
- [Measured export report](model-report.json).

The model includes weighted elbows, knees, wrists, ankles and finger/thumb joints. Cloth compressions, hood lining/rim, pocket openings/stitching, knit cuffs, cargo pockets, cap seams, shoe eyelets/laces and separate soles are modeled details. Skin is glossy; fabric, leather/rubber and gold have distinct roughness/metallic settings. Ambient occlusion is baked to a shared UV atlas, providing local shading without runtime shadow maps.

## Regeneration

From the repository root with Blender 4.3:

```sh
pnpm assets:street-v2
```

The source is `packages/art-tools/build-street-v2.py`. It builds the model and rig, packs the UV atlas, bakes shading, exports both skinned GLBs, saves the editable `.blend` and renders the four views. Units are meters. Blender +Y faces forward and +Z points up; glTF export uses the game's −Z forward / +Y up convention. Clips are named `idle`, `walk` and `grip`.

`pnpm assets:models` continues to regenerate the existing lightweight gameplay models; it does not overwrite this benchmark.

## Verification

`tests/street-review.test.ts` inspects the binary glTF structure, real skin weights, bone hierarchy, embedded texture, clothing metadata, material differences, animations and lower-detail budget. The browser checks load the actual asset and shading atlas, verify it stays unloaded until requested, exercise clothing controls, knee/finger animation, mouse/touch rotation, delayed loading and reopening. Existing player/pistol behavior is also checked. Software-WebGL checks do not establish physical-phone FPS.
