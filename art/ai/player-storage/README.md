# Player-crafted storage chest references

Two original AI-generated alpha sprites, produced for Street Survival's glossy cartoon style. These are player-built wooden containers, separate from the five scavenged loot-crate tiers.

- `chest-small-reference.png`: compact amber wooden chest, two charcoal straps, silver front latch and flat lid.
- `chest-large-reference.png`: wider reinforced wooden trunk, three charcoal straps, silver front latch and flat lid.

Original references are retained unchanged. Runtime PNGs are proportional 512-pixel thumbnails with alpha, generated using Sharp. Their corresponding 3D meshes were built in Blender using `packages/art-tools/build-player-storage.py`, following the reference silhouettes, plank construction, straps, corner protectors and latches. They use glossy material shading, not the source PNG as a texture or a flat billboard. Editable `.blend` files live in `art/models/player-storage`; runtime GLBs and a provenance/bounds manifest live in `apps/client/static/assets/player-storage`.

Regenerate the meshes with `pnpm assets:player-storage`. Source-image hashes are embedded in the GLB extras. Runtime dimensions are defined in `storage-spec.ts`: small 1 × 0.8 × 0.8 m; large 1.8 × 1 × 0.95 m (width × depth × height). Both are ground-centered with flat stacking surfaces and no baked terrain or ground shadows.
