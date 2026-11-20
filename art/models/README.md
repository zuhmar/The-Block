# Street Survival 3D actor models

Original, source-built Three.js models for the current first-person prototype. These are real meshes with PBR materials, not billboard sprites or rendered images. Units are meters, Y is up, and forward is −Z. There are no external textures or model dependencies in the exported files.

- `black-stick-player.glb`: rounded, featureless black stick-figure character, approximately 1.88 m tall. Head, torso, arms and legs have named groups. Includes a looping `walk` animation and `right-hand-socket` for a low-ready weapon.
- `street-pistol.glb`: approximately 0.23 m long. Separate `pistol-frame`, `pistol-slide`, and `muzzle` groups support recoil and projectile effects. Includes beveled slide/frame, barrel and bore, an open trigger guard, trigger, grip, magazine base, serrations and sights.

Additional original weapon exports:

- `street-smg.glb`: compact receiver, straight magazine, folding-stock rails, vented handguard and short barrel.
- `street-assault-rifle.glb`: full stock, curved magazine, long handguard, rail and extended barrel.
- `street-sniper.glb`: long barrel, short magazine, scope with lens materials, scope mounts and folded bipod.

Each new gun has a named movable bolt and a `muzzle` socket. The first-person rig gives the support hand a weapon-specific foregrip position. The game loads weapon rigs lazily and renders only the equipped one. All weapons are inspectable and rotatable in the model viewer.

Regenerate all files from the same factories used by the game:

```sh
pnpm assets:models
```

Source: `apps/client/src/fps/actor-models.ts`. The first-person rig uses rounded arms, gripping fingers and a support hand. Its portrait layout keeps the pistol inside the view. The muzzle flash and tracer use the animated muzzle socket; the slide recoils and recovers after firing. The first-person lower body uses the same character geometry with the head and upper arms hidden.

The menu’s **View Player & Weapons** button opens a touch-rotatable inspector. It creates a renderer only while open, clones its own materials, renders only on changes, and releases its geometry, materials, WebGL context and event listeners when closed. Fixed model parts are merged by material to keep draw calls low.

`tests/actor-models.test.ts` checks geometry bounds/budgets, exported GLB structure, walk animation, equipping, recoil and portrait muzzle visibility. `tests/browser/actor-models.py` checks the actual rendered inspector, touch rotation, reopening, weapon switching, slide recovery and first-person rendering. Browser checks use software WebGL and do not establish physical-phone FPS.

`tests/weapons.test.ts` checks distinctive model proportions, geometry budgets, portrait muzzle placement, recoil, fire cadence, and GLB roundtrips. `tests/browser/weapon-loadout.py` verifies real mobile held firing for each weapon, scope switching, a scoped NPC hit, and simultaneous desktop movement, right-button aim and left-button firing.
