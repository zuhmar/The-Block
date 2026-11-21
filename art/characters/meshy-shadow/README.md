# Animated Meshy shadow figure

The uploaded `original.glb` is preserved byte-for-byte (SHA-256 in `report.json`). It has one skinned mesh, 32 bones and five supplied clips. `animated-character.blend` retains the full-detail character, packed original textures, all native curves and the new editable combat actions.

Run `pnpm assets:meshy-shadow` to rebuild from the preserved upload. The script authors FK keys on the existing Mixamo-named arm bones using a geometric two-bone solve. Combat poses have a two-handed guard/hold, recoil recovery, left/right hook wind-up and follow-through, and a support-hand reload reach/withdraw/insert/return. No replacement skeleton or character geometry is generated.

Added clips: `Punch_Left`, `Punch_Right`; and `Pistol`, `SMG`, `Rifle`, `Sniper` variants of `Hold`, `Fire` and `Reload` (14 new clips). The supplied `Running`, `Walking`, `Idle_3`, `Regular_Jump` and `CrouchLookAroundBow` remain available. Native curves are retimed to the source project's 30 FPS timebase; the runtime export is sampled at 30 FPS and may round a native clip by one frame.

The separate runtime review export is `apps/client/src/fps/models/meshy-shadow/animated.glb`: about 24k triangles, 1024px textures, one skin, all 19 clips. Decimation is applied before the armature modifier so deformation is not baked into the rest mesh. Embedded source textures are matched by their original byte hashes, not Blender-generated image names, preserving base-color/normal/roughness assignments. Full-detail geometry and textures remain in the Blender source.

Use **View Player & Weapons → MESHY BASE → Animation** to preview clips or download the animated GLB. The model is lazy-loaded only when requested. Closing the viewer releases its model, textures and mixer. The uploaded character is a review asset; it does not replace the active player controller, its first-person arms, NPCs, outfits or saved data. Weapon geometry/magazine animation stays separate: socket alignment, runtime animation blending and first-person retargeting are integration work. Hand helper bones are retained, but the uploaded mitten mesh is not a fully articulated five-finger hand.
