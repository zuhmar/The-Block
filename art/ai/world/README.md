# AI world sprite pack

41 original AI-generated sprites matching The Block's cartoon art direction. These are additional source assets and individual cutouts; they are not yet connected to the live game's asset manifest.

- **16 street props:** dumpster, trash can, bench, pallet, streetlamp, abandoned car, cardboard boxes, barricade, tree, bush, rubble, tires, shopping cart, water barrel, fence and campfire.
- **16 inventory items:** water, snack, bandage, wood, scrap, stone, brick, concrete, steel, glass, electronics, backpack, cash, bat, pistol and ammunition.
- **9 buildings/base pieces:** shelter, convenience store, workshop, foundation, wall, door, roof, storage chest and ruined building.

Original unmodified image-generation outputs are in `sources/`. Reusable transparent PNGs are in `sprites/`: inventory icons at 128×128, props at 256×256 and buildings at 512×512. `manifest.json` records each source cell and crop. Relative object sizes are presentation sizes, not world collision footprints.

Reproduce the technical crop/scale/packing step with:

```sh
pnpm exec tsx packages/art-tools/pack-world-sprites.ts
```

Packing code only processes the AI source artwork; it does not draw sprites. The packer checks dimensions, nonempty alpha silhouettes and transparent padding. Static sheet composition was inspected; in-game scale, perspective and collision alignment still need verification during integration. Buildings do not yet include damage variants, and the campfire is a single pose rather than an animation.
