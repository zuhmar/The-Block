# Meshy Police

Original uploaded GLB retained byte-for-byte. Editable Blender source: animated-character.blend. Runtime: apps/client/src/fps/models/meshy-police/animated.glb.

Rebuild with `pnpm assets:meshy-police`. Shared builder preserves native idle/walk/run, adds Pistol hold/fire and curls available finger chains. No geometry reduction: 10,387 triangles and 66 joints retained. Runtime textures limited to 1024px.

Replaces only the police enemy artwork; existing spawn, health, behavior and inexpensive shooting hitboxes are retained. The existing weapon is mounted to the right hand, with native lower-body locomotion layered below weapon poses. Procedural fallback remains available on load failure.
