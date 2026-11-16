# AI-generated black stick figures

Original artwork generated with the image generation tool, following the user's direction to use black stick-figure characters. The game imports these source PNGs through `packages/art-tools/import-characters.ts` during `pnpm assets:generate`.

All five sheets are 1536 × 1024 RGBA with transparent pixels. Character direction order is south, north, east, west.

| File             | Layout             | Contents                                                                         |
| ---------------- | ------------------ | -------------------------------------------------------------------------------- |
| stick-base.png   | 8 columns × 4 rows | Idle, two walk poses, run, crouch, bat, pistol, collapsed pose in each direction |
| stick-walk.png   | 8 columns × 4 rows | Walking pose sequence in each direction                                          |
| stick-run.png    | 8 columns × 4 rows | Running pose sequence in each direction                                          |
| stick-combat.png | 8 columns × 4 rows | Four bat and four pistol poses per direction                                     |
| stick-npcs.png   | 4 columns × 4 rows | Caretaker, trader, shopkeeper, hostile; directions across columns                |

Runtime atlases use 128 × 128 cells, eight columns and eight state rows. Walk/run retain eight source poses; bat/pistol use four source poses held for two cells each. Idle, crouch, hurt and death hold one source pose. Hurt reuses idle with runtime hit feedback, and unarmed attacks retain the idle body with the existing impact effect. These are intentionally not claims of eight unique drawings for every state.

The importer finds alpha bounds within each source cell, crops the faint outer halo, scales without stretching, and aligns feet at y=105. Each direction gets one `player-stick-*` atlas. NPC roles get four directional images; the current stationary NPCs display their south pose. Legacy appearance data remains stored, while every player renders as a black stick figure. Skin/hair selectors are removed.

Original generated PNGs remain unchanged here. World props, inventory items and buildings now also use AI source artwork. Terrain, bed, effects and UI symbols still use the existing procedural pipeline. Animation smoothness and browser/mobile rendering still require visual playtesting.

## Equipped weapons

Five additional AI-generated sheets provide held-weapon artwork:

- `stick-pistol-walk.png`, `stick-pistol-run.png`: eight source cells per direction with the pistol held throughout movement.
- `stick-bat-walk.png`, `stick-bat-run.png`: the corresponding bat movement cycles.
- `stick-armed-base.png`: pistol idle/crouch/hurt/death in columns 1–4 and bat idle/crouch/hurt/death in columns 5–8, with direction order south/north/east/west.

The importer now packs three character sets: unarmed, pistol and bat, each in four directions. Pistol idle uses the neutral first pistol-walk pose so the weapon remains visible beside the north-facing torso. Armed crouch/hurt/death hold the corresponding source pose; attacks use the existing combat sheet. Each atlas has eight state rows and eight cells per row; held-pose states do not claim eight distinct drawings. The runtime manifest records equipment and each state's source sheet.

The renderer selects the equipped-weapon atlas independently of idle/walk/run/crouch/hurt state, for local and remote players. A ready pistol does not run a recoil animation unless the server reports an attack. Death follows the authoritative weapon drop and returns to the unarmed death sprite. Portraits reflect the equipped weapon as well.

`armed-preview.png` is a technical composition of runtime idle/walk cells for both weapons and all four directions, not a browser screenshot.
