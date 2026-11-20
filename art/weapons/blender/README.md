# Blender weapon library

Four original decorative cartoon game props: charcoal pistol and SMG, olive assault rifle, burgundy scoped sniper. Built from a fresh Blender scene, guided by the reference sheet generated in chat. That image was not available as a local file; this is a visual interpretation rather than a pixel-traced reconstruction. No existing model geometry is imported.

Run `pnpm assets:weapons` from the repository root. Editable source: `weapon-library.blend`. Render: `lineup.png`. Runtime exports: `apps/client/src/fps/models/weapons`. `report.json` records triangle and material-batch counts.

Meshes have frame/slide part metadata and a forward muzzle socket. The game retains its existing weapon groups, recoil, hand poses, projectile origin, stats and combat behavior, loading GLB visuals asynchronously with the original geometry as a loading/error fallback. Closing the viewer disposes loaded models and discards late arrivals. The muzzle's child effects remain attached during model replacement.

Magazines now export as a separate `magazine` part. Player reloads move that part, raise/tilt the weapon and move the support hand. Current practice capacities: pistol 12, SMG 30, rifle 30, sniper 5. Reload times: 1.4, 1.8, 2.1 and 2.6 seconds. Magazine contents last for the current session and persist through switching; completing a reload uses unlimited practice reserve. Switching weapons/build mode cancels a reload without adding rounds. Pausing freezes its timer. Respawning restores the practice loadout. No inventory/save format changes.

Hands now alternate close-range punches. A hit resolves after 0.12 seconds, uses the closest obstruction on the aim ray within 2.1m, and deals 20 damage. The 0.4s animation has a 0.5s repeat interval and does not consume ammunition.
