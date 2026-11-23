# Street Survival nature models

Six original Blender models interpreted from the generated tree/resource-node sprite references: broadleaf, pine, birch, ordinary rock, sulfur, and metal. This is authored 3D geometry following the reference silhouettes and palette, rather than an automated image-to-mesh reconstruction. Existing game geometry is not imported.

Trees use branching tapered trunks, exposed roots, and solid leaf/bough geometry; birch markings are integrated material patches. Nodes use irregular boulder clusters, embedded yellow sulfur deposits, or rusty metal veins. Materials are self-contained glossy PBR colors. There are no background planes, grass patches, ground discs, baked ground shadows, or alpha-card foliage.

Each asset has an editable `.blend` source with its corresponding sprite reference packed into a non-rendering image guide. GLB exports are right-sized in metres, use Y-up on import, and have a base-level origin. Root metadata identifies the asset/resource, source reference/hash, LOD, and suggested collision radius/height. These collider values are integration hints, not added gameplay collision.

Each main GLB has a lighter `-lod1.glb` for distant instancing. The manifest records actual exported triangle counts, material draw counts, dimensions and sizes. Use the detailed mesh for close views and the distant mesh further away; collision should use the primary asset's dimensions. `preview.png` shows the main models fitted individually to each cell, not at a shared physical scale.

Run `pnpm assets:nature-models` from the repository root (Blender and Python/Pillow required). The generation script writes the source scenes and GLBs, and the packing script builds a labeled preview and ZIP. Downloads live under `/assets/nature-models/`. The ZIP includes all twelve GLBs, six Blender files, six transparent renders, manifest, preview, and this README.

`tests/nature-models.test.ts` loads all exports through the game's GLTFLoader and checks reference provenance, ground alignment, dimensions, finite geometry, self-contained buffers/materials, LOD budgets and distinctive mineral materials. The current map and harvesting systems are unchanged by this asset-delivery pass.
