# STB jail player

Orange STB jumpsuit over the established glossy black character, built from `reference.png`.

- `jail-player.glb`: unchanged textured Meshy model, image-to-3D task `01a21d79-5596-75ff-a5a5-1ec20eab90ed`.
- `rigged.glb`: unchanged Meshy humanoid rig, rigging task `01a21d7d-00ed-703c-bf55-322d73f37061`, 5 consumed credits, requested height 2 m.
- `walking.glb` / `running.glb`: native clips included with the rigging task, downloaded without submitting another generation.
- `animated-character.blend`: packed editable Blender scene with 19 baked actions, muted NLA tracks, and left/right hand attachment sockets.
- `animated.glb`: textured rig and all 19 animation clips for later game integration.
- `animation-report.json`: clip names, durations, bone mapping counts, rig provenance, and output size.
- `pose-check.json` and pose previews: sampled deformed bounds and rendered checks.
- `walking-preview.mp4`: short rendered walking loop from the final Blender scene.

Blender bakes native walk/run and adapts the existing black player's animation library to this rig's rest transforms and bone hierarchy. The remaining clips are idle, crouch, jump, two punches, and hold/fire/reload for pistol, SMG, rifle, and sniper. Mesh, UVs, and skin weights remain those of the Meshy rig; no weapon meshes are baked into the hands.

Rebuild from repository root with:

```sh
blender -b -t 4 --python-exit-code 1 --python packages/art-tools/animate-jail-player.py
LIBGL_ALWAYS_SOFTWARE=1 blender -b -t 4 --python-exit-code 1 --python packages/art-tools/preview-jail-player.py
```

This asset is prepared separately; gameplay and the jail cinematic are not switched to it by this asset-only change.
