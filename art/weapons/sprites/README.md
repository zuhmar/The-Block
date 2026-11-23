# Weapon inventory sprites

Eight 512 × 256 PNG cutouts with true alpha, consistent right-facing presentation and glossy studio lighting. The transparent 1024 × 1024 atlas has two columns and four rows: pistol, SMG, assault rifle, sniper, light machine gun, rocket launcher, grenade, C4. Atlas frames have stable 512 × 256 cells and centered pivots. These are inventory/reference sprites, not first-person animation frames.

The first four render the game's existing GLBs directly, preserving their geometry and materials. The four additions are original decorative Blender props with simplified exterior details. Their editable `.blend` files and GLB exports live in `models/`. No functional mechanisms or new combat behavior are included. These are Blender renders, not AI-generated images.

Run `pnpm assets:weapon-sprites` from the repository root. `render-weapon-sprites.py` generates the models and transparent icons; `pack-weapon-sprites.py` verifies dimensions, real transparency and clear margins, then creates the atlas, labeled preview and ZIP. `report.json` records source models; `sprite-checks.json` records bounds and PNG hashes.

Game-ready PNGs, atlas JSON, preview and ZIP are published under `/assets/weapon-icons/`. The sprites are supplied as assets without changing the current weapon loadout, damage, ammo or animations.
