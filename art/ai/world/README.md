# AI world sprite pack

41 original AI-generated sprites matching The Block's cartoon art direction. All 41 source sprites are mapped into the game by `packages/art-tools/import-world.ts` during `pnpm assets:generate`.

- **16 street props:** dumpster, trash can, bench, pallet, streetlamp, abandoned car, cardboard boxes, barricade, tree, bush, rubble, tires, shopping cart, water barrel, fence and campfire.
- **16 inventory items:** water, snack, bandage, wood, scrap, stone, brick, concrete, steel, glass, electronics, backpack, cash, bat, pistol and ammunition.
- **9 buildings/base pieces:** shelter, convenience store, workshop, foundation, wall, door, roof, storage chest and ruined building.

Original unmodified image-generation outputs are in `sources/`. Reusable transparent PNGs are in `sprites/`: inventory icons at 128×128, props at 256×256 and buildings at 512×512. `manifest.json` records each source cell and crop. The importer fits each cutout to the existing runtime canvas sizes and preserves world collision footprints. Inventory icons keep their existing asset keys; city scenery and extra decorative props are connected in the Phaser scene.

Reproduce the technical crop/scale/packing step with:

```sh
pnpm exec tsx packages/art-tools/pack-world-sprites.ts
```

Packing code only processes the AI source artwork; it does not draw sprites. The packer checks dimensions, nonempty alpha silhouettes and transparent padding. Static sheet composition was inspected. Browser/mobile visual playtesting remains unverified. Damaged construction pieces reuse the intact AI silhouette with a runtime tint and existing HP feedback; breached construction pieces use the AI rubble sprite. The campfire is a single pose rather than an animation.
