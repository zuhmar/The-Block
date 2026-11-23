# South Harbor

Original glossy cartoon Blender environment built from the shared game layout. Includes cargo yard, twelve shipping containers, three walkable finger piers, quay, crane, two moored workboats, forklift, pallets/crates, barrels, bollards, rails and open port office. The models are fully three-dimensional with self-contained PBR color materials, no external image dependencies and no baked ground shadows.

Rebuild with `pnpm assets:harbor` from the repository root. `layout.json` is exported from `apps/client/src/fps/harbor-layout.ts`, keeping visual bounds aligned with movement, deck support and shot collision. Editable source: `south-harbor.blend`. Preview: `preview.png`. Runtime export and mesh manifest: `apps/client/static/assets/harbor/`.

The asset uses absolute game coordinates with root at world origin, GLB Y-up and metres. The cargo apron is intentional terrain for the harbor; this is an environment asset rather than a standalone prop cutout. See `docs/south-harbor.md` for world integration and save compatibility.
