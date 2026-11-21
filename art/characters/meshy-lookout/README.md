# Meshy Lookout

User-provided Urban Lime Scout replaces only the easy Lookout NPC. Police and SWAT remain unchanged. Original GLB retained byte-for-byte; animated-character.blend contains the editable rig and all five actions.

Rebuild: `pnpm assets:meshy-lookout`. Native idle, walk and run are preserved. Authored pistol hold/fire clips use the 66-bone rig and finger grip. Runtime retains all 10,355 triangles and uses 1024px textures (~2.2 MB). The live NPC layers native locomotion with the pistol pose and attaches the existing weapon to its right hand. Existing AI, damage, hitboxes and spawns are retained. Failed loads keep the prior procedural fallback.
