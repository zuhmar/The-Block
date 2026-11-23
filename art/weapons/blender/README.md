# Blender weapon library

Four original decorative cartoon game props: charcoal pistol and SMG, olive assault rifle, burgundy scoped sniper. Built from a fresh Blender scene, guided by the reference sheet generated in chat. That image was not available as a local file; this is a visual interpretation rather than a pixel-traced reconstruction. No existing model geometry is imported.

Run `pnpm assets:weapons` from the repository root. Editable source: `weapon-library.blend`. Render: `lineup.png`. Runtime exports: `apps/client/src/fps/models/weapons`. `report.json` records triangle and material-batch counts.

Meshes have frame/slide part metadata and a forward muzzle socket. The game retains its existing weapon groups, recoil, hand poses, projectile origin, stats and combat behavior, loading GLB visuals asynchronously with the original geometry as a loading/error fallback. Closing the viewer disposes loaded models and discards late arrivals. The muzzle's child effects remain attached during model replacement.

Magazines now export as a separate `magazine` part. Player reloads move that part, raise/tilt the weapon and move the support hand. Current practice capacities: pistol 12, SMG 30, rifle 30, sniper 5. Reload times: 1.4, 1.8, 2.1 and 2.6 seconds. Magazine contents last for the current session and persist through switching; completing a reload uses unlimited practice reserve. Switching weapons/build mode cancels a reload without adding rounds. Pausing freezes its timer. Respawning restores the practice loadout. No inventory/save format changes.

Hands now alternate close-range hook punches with an elbow pivot, wind-up, sideways swing, follow-through and return to guard. A hit resolves after 0.12 seconds, uses the closest obstruction on the aim ray within 2.1m, and deals 20 damage. The 0.4s animation has a 0.5s repeat interval and does not consume ammunition.

The full loadout now also includes the light machine gun (60 rounds), rocket launcher (1), grenade (3), and C4 (2). Their runtime GLBs are prepared from the original sprite-prop sources with `pnpm assets:heavy-weapons`. This adds forward sockets, an animated LMG charging handle and detachable ammo box, and a camera-facing C4 panel; source sprite renders remain unchanged.

Keys 1–9 select hands and the eight weapons. The toolbar uses the published inventory PNGs. Guns retain their existing skeletal firing/reload clips; the LMG uses the rifle family with its own ammo-box and bolt movement. Rocket reloads tilt the launcher and move the support hand. Grenades and C4 add procedural upper-arm/forearm motion to the uploaded character rig, hide the held prop at release, and restore the resting pose. A queued reload requested during release starts after recovery. Switching cancels an unreleased action without consuming ammo.

Rockets travel visibly and explode on collision. Grenades use a bouncing trajectory and a three-second game-time fuse. C4 sticks to a nearby surface (three-metre reach); G or DETONATE triggers placed charges. Explosions have radial damage falloff, solid-cover occlusion, and self-damage. Up to eight explosives can be active. Pausing freezes fuse/use/reload timers; respawning/resetting clears charges and projectiles. Player-built structures and persistent saves are not damaged or migrated. Practice reserve remains unlimited.
