# Trees and resource nodes

Original AI-generated glossy cartoon art: broadleaf, pine, and birch trees; ordinary gray rock, yellow sulfur, and rusty orange/steel-gray metal nodes. The PNG sheet uses real RGBA transparency. It has no ground tiles, grass islands, or opaque backing patches. Hidden RGB values in transparent areas are retained from the generated source.

`tree-resource-nodes.png` is the original generated 1536 × 1024 sheet. `pnpm assets:nature-sprites` losslessly extracts six 512 × 512 cells and writes the runtime/download pack to `apps/client/static/assets/nature-sprites/`. The command requires Python with Pillow, as used by the existing sprite pipeline. No AI generation runs during a normal build.

The atlas has three columns and two rows, in the order above. `nature-atlas.json` contains stable untrimmed frames and bottom-of-object pivots. `sprite-checks.json` records source alpha ranges, content bounds (ignoring sub-1% alpha specks), and file hashes. The art has been inspected composited against a neutral background to verify that the colored glow visible in some raw previews is not an opaque backdrop.

Published files include individual PNGs, the full atlas and its JSON, and a ZIP at `/assets/nature-sprites/street-survival-nature-sprites.zip`. This delivers artwork for review, inventory/world sprites, or model references. It does not replace the current 3D trees or add harvesting mechanics.
