# Street Survival — First-person 3D prototype

Street Survival now opens a small **128 × 128 meter first-person 3D world** built with Three.js and TypeScript. This replaces the playable 2D frontend with a fresh, single-player prototype. The old source and online database are preserved; the prototype does not connect to, reset, or migrate that database.

Live: https://the-block-tau-eight.vercel.app

## Run

```sh
pnpm install
pnpm dev
```

Open http://localhost:5173. No database, account, API key, or external art download is required for the new game.

## Explore and build

- Desktop: WASD / arrows move, mouse looks, Shift runs, Space jumps, Escape pauses. Click **Enter the Block** to capture the mouse.
- Phone: left joystick moves, drag the world to look, and use the Run, Jump, Use and Fire buttons. Movement and look support simultaneous touches.
- E / Use searches five distinct supply-crate tiers around the town. The starter inventory has **10,000 wood**.
- 1 / Hands and 2 / Pistol select a visible first-person tool. The pistol has free practice shots. Targets and an armed enemy south of town let you test aiming and local combat.
- B / Build opens floor, wall, open doorway and storage choices. Aim down at nearby ground and click / Place. R / Rotate changes the edge direction. Floors snap to a two-meter grid; walls and doorways snap along floor edges. Build in open meadows, keeping town, roads, water and trees clear. No roofs or designated plots are needed.
- Aim at your construction and use **Dismantle** to return its wood. Attached walls and storage must be removed before their floor. The budget is **100 pieces**.

Buildings, trees, water and constructed walls block walking. The eastern road crosses a bridge. Scenery includes a compact five-building settlement, sidewalks, street furniture, sparse woodland, river and rocky outer boundary. Buildings are exterior scenery in this first prototype.

Construction, wood and searched crates save locally under `street-survival:3d-prototype:v1`. The menu’s reset clears only that local prototype. Your location resets to the town spawn on reload. This is not yet online multiplayer, shared-world persistence, inventory, or survival simulation; those legacy systems are not silently represented as working 3D features.

## Move, aim and fight

On phones, hold the movement joystick with one thumb and **hold FIRE** with the other. Firing starts on press and repeats while held; drag the firing thumb to aim. A separate touch can also look around. Releasing or canceling the firing touch, pausing, switching tabs, or losing focus stops held fire. Desktop supports holding the mouse button while moving with WASD.

An armed stick-figure enemy guards the southwestern meadow near the practice range. It approaches when it sees you, shows an aiming warning, and locks its aim before firing visible bullets. Keep moving to dodge or use buildings, rocks, crates and your walls as cover. Your pistol deals 25 damage; the enemy has 75 health and its bullets deal 12 damage. A defeated enemy returns after 30 seconds. Being shot down offers a respawn at the starting point with your wood and construction preserved. Combat health resets on reload; this remains a local single-player prototype.

## Player and pistol models

The black stick-figure character now has rounded 3D limbs, a visible first-person lower body and a detailed gripping pose. The pistol has a separate recoiling slide and an animated muzzle socket. Open **View Player & Pistol** in the pause/start menu to rotate and inspect both models.

Reusable GLB exports, including the player walk animation, are in [art/models](art/models/README.md). Run `pnpm assets:models` to regenerate them from the game's model factories.

## Performance and verification

Static box geometry is instanced by material. Trees and boundary rocks also use instancing. The renderer limits phone pixel density to 1.25, uses distance fog and no real-time shadow maps, and loads no legacy sprite sheets. The small map is rendered as one bounded scene; there is no giant streamed 2D terrain.

```sh
pnpm verify
python tests/browser/fps-prototype.py
```

The full automated suite retains legacy backend checks, which require local PostgreSQL (`docker compose up -d --wait db`). The new pure 3D world tests and browser check do not require a database. Browser measurements use software WebGL and do not establish physical-phone frame rate. A small FPS readout is visible in game for device checks.

For the preserved 2D system, see [the archived README](docs/LEGACY_2D_README.md). `pnpm dev:legacy` starts the preserved backend and asset pipeline, but the frontend entry now points to the 3D prototype.
