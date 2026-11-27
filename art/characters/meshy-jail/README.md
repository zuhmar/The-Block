# Uploaded STB jail character

`original.glb` is the unchanged user upload `Meshy_AI_Orange_Void_Astronaut_20261127_animated_mixamo_All_animation.glb`, SHA-256 `6038640342f12bfcd759ae683327e95574573b4efa07f1dcfcf7536272a62058`.

The uploaded 76-joint Mixamo rig and 10,441-triangle geometry are preserved. Its native Walking and Running clips are retained; Blender adapts the existing game's remaining 17 actions, including idle, jump, crouch, punches and weapon hold/fire/reload clips. `animation-report.json` records the source, clip durations and bone mappings. No Meshy credits were spent.

- `animated-character.blend`: packed editable rig and 19 actions.
- `animated.glb`: complete animated character used by the jail-release movie builder.

Rebuild from the repository root:

```sh
blender -b -t 4 --python-exit-code 1 --python packages/art-tools/animate-uploaded-jail.py
```

The cinematic imports this uploaded character, not the earlier generated or hand-built jail drafts. Main gameplay character equipment is unchanged.
