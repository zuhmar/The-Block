# Meshy Reinforced animations

Original upload preserved byte-for-byte in original.glb. Editable Blender source: animated-character.blend. Runtime export: apps/client/src/fps/models/meshy-reinforced/animated.glb.

Five native clips retained: idle, walk, run, jump and crouch/look-around. Fourteen Blender-authored combat clips added: left/right hooks plus hold/fire/reload for pistol, SMG, rifle and sniper. Reload timing matches existing game weapon timing. Available finger chains are curled for grip; missing finger joints are left intact. All 10,387 triangles and 58 joints retained; runtime textures limited to 1024px.

Rebuild all outfits with `pnpm assets:meshy-outfits`, or set MESHY_PLAYER_TIER=reinforced when running packages/art-tools/animate-meshy-shadow.py. Inspect all clips via the corresponding image outfit button in the model viewer. Clothing gameplay and equipment selection are outside this animation-authoring change.
