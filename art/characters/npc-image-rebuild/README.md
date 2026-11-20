# NPC image rebuild

The final white Lookout / navy Police / black SWAT reference sheet was recreated from the approved design descriptions because only the earlier black NPC sheet remained available. `reference.png` is now saved alongside the source and copied into the game viewer.

`pnpm assets:image-npcs` starts an empty Blender scene and builds three fresh models using this reference and `landmarks.json`. It does not import previous character geometry. The shared authoring helpers provide smooth surfaces, rigging, clothing slots and AO baking. Depth and rear surfaces are interpretations of the front reference.

`npc-character-library.blend` contains the editable models and packed reference. Runtime GLBs live in `apps/client/src/fps/models/npc-image-rebuild`. Each has 28 bones, idle/walk/grip/combat clips, a 512px AO map and separate headwear, torso, legs and footwear slots. The SWAT visor uses transparent material. Triangle counts are recorded in `report.json`.

The viewer's Lookout / Police / SWAT buttons load these models. Live enemies load them within 38m, retaining existing AI, territories and health. Lightweight invisible shooting volumes avoid CPU raycasts through skinned geometry. Walk animation uses the legs while the weapon arm retains its aiming pose. No persistent player data is migrated.
