# Playable Meshy wood building kit

Five original uploads are retained in originals/. `pnpm assets:wood-kit` creates the editable wood-kit.blend and five runtime GLBs under apps/client/src/fps/models/build-wood. The pipeline welds split seam vertices before reducing topology, repairs normals, keeps UVs/textures, and fits models to the existing two-meter placement grid. Albedo maps use up to 1024px; other maps use up to 512px. All five runtime models total about 2.7 MB.

Floor: 2 × 2 × 0.18 m. Foundation: 2 × 2 × 0.50 m. Wall and doorway: 2 m wide, 2.5 m high, 0.16 m thick. The doorway opening is fitted to the existing 1.12 m clear width and 2.10 m clear height. The separate door is 1.08 × 2.06 × 0.10 m, with its local origin on the left-bottom hinge edge.

Existing floor, wall, doorway and storage saves retain their IDs, coordinates and wood balance. Foundation and door are additional build choices, at 12 and 4 wood. Floors can sit on foundations; walls/doorways snap to either platform's edges. Walking and jumping use the actual platform surface height. A placed door requires a doorway and responds to E/USE. Its open target is saved; temporary animation angles are excluded from saves. Door sweeps pause when a player or living NPC occupies the swing area.

Static art is instanced by geometry/material. Dynamic doors animate separately. Shooting, cover checks and dismantling use lightweight proxy geometry rather than the detailed imported meshes. Dependency checks require doors to be removed before their frames, and attached pieces before supporting floors/foundations; dismantling refunds the original cost. Missing art uses matching procedural fallbacks. The 100-piece budget remains in place.

This is the initial wood kit. The other reference-sheet component types and stone/metal tiers are not introduced by this integration.
