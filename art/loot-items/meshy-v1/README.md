# Street Survival — individual loot pickups

**42 new item sets**: one individual AI-generated reference image, one textured Meshy GLB, one true-alpha inventory sprite, and one Meshy model preview per item. The manifest also identifies **24 existing item sets** for reuse, giving **66 item sets** in the complete downloadable bundle.

| Category             | New items                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| Materials            | Scrap metal, cloth, leather, rope, mechanical parts, electrical parts, weapon parts                       |
| Tools                | Building plan, construction hammer, repair wrench, torch, flashlight, binoculars, baseball bat            |
| Food and medical     | Bottled water, canned drink, canned food, snack bar, cooked meat, bandage, medkit, painkillers            |
| Valuables and access | Cash, watch, jewelry, electronics, sealed fictional contraband parcel, keycard                            |
| Armor                | Street, reinforced and armored headwear, body clothing, trousers and paired footwear: 12 separate pickups |
| Security             | Keypad door lock and storage padlock                                                                      |

The existing item sets cover four gathered resources, four processed materials, six ammunition types, eight weapons/explosives and two gathering tools. Their authoritative repository paths are recorded under `reusedAssets` in `manifest.json`. Copies are included under `existing/` in the complete download bundle.

## Files

- `references/`: 42 original 1024 × 1024 Meshy text-to-image PNGs, each with its own plain background. Every model was generated from its matching individual reference, never from a contact sheet or another prop.
- `models/`: 42 self-contained static GLBs generated with Meshy T2 smart topology and N1 texturing. Local preparation applies uniform scale and floor pivots, embeds 1K JPEG textures, and retains the generated mesh proportions.
- `sprites/`: 42 individual 512 × 512 RGBA PNGs rendered in Blender directly from those AI-generated models. These sprites have actual transparency; the original reference PNGs have plain backgrounds. No hand-built replacement geometry was used.
- `previews/`: Meshy's rendered previews of the original models.
- `index.html` and `gallery.png`: filterable offline gallery and an image overview. Open the HTML after extracting the bundle or serve the folder over HTTP.
- `manifest.json`: prompts, request IDs, task IDs, native and prepared sizes, source hashes, generation costs, and reuse paths.
- `checks.json`, `sprite-checks.json`, `loader-check.json`: embedded-texture and geometry checks, image/source pairing, transparency and framing, and actual Three.js GLB loading.
- `tasks/`: generation and preparation journals retained in the repository for resumable processing. Canonical task information is consolidated into the manifest.

## Scope

These are **loot pickup and inventory art assets**. The new item types are not yet connected to gameplay, crafting recipes or loot tables. The twelve armor models are static garment pickups, not rigged replacements for the existing player outfits. No character, weapon, inventory, building, save or multiplayer system was changed.

## Cost

42 references × 9 credits + 42 textured models × 15 credits = **1,008 Meshy credits**. Balance: **1,359 → 351**. No paid reruns, additional variants or rigging stages were used. Each model was downloaded once as GLB.

## Validation and preparation

All **42 source images match their intended references pixel-for-pixel**. All 42 prepared GLBs load in Three.js, use floor pivots, and contain their textures. All 42 sprites have true alpha and at least eight pixels of clear framing. All 24 reused model/sprite pairs exist. The 42 new models contain **116,542 triangles total** and occupy **7,684,964 bytes** before ZIP compression.

Run:

```sh
python packages/art-tools/check-loot-pickups.py
python packages/art-tools/check-meshy-props.py art/loot-items/meshy-v1
pnpm exec tsx packages/art-tools/check-loot-pickups.ts
```

To prepare original GLBs downloaded from the recorded Meshy tasks, place them in `work/loot-raw/<item-name>.glb` and run Blender 4.3 with `packages/art-tools/prepare-loot-pickups.py`. It writes the uniform-scale derivatives and transparent sprites. Original download hashes are retained; the temporary raw downloads may be discarded after successful preparation.
