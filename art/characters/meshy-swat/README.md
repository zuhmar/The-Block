# Meshy Swat

Original uploaded GLB retained byte-for-byte. Editable Blender source: animated-character.blend. Runtime: apps/client/src/fps/models/meshy-swat/animated.glb.

Rebuild with `pnpm assets:meshy-swat`. Shared builder preserves native idle/walk/run, adds Rifle hold/fire and curls available finger chains. No geometry reduction: 10,403 triangles and 58 joints retained. Runtime textures limited to 1024px.

Replaces only the swat enemy artwork; existing spawn, health, behavior and inexpensive shooting hitboxes are retained. The existing weapon is mounted to the right hand, with native lower-body locomotion layered below weapon poses. Procedural fallback remains available on load failure.
