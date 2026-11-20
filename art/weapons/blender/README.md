# Blender weapon library

Four original decorative cartoon game props: charcoal pistol and SMG, olive assault rifle, burgundy scoped sniper. Built from a fresh Blender scene, guided by the reference sheet generated in chat. That image was not available as a local file; this is a visual interpretation rather than a pixel-traced reconstruction. No existing model geometry is imported.

Run `pnpm assets:weapons` from the repository root. Editable source: `weapon-library.blend`. Render: `lineup.png`. Runtime exports: `apps/client/src/fps/models/weapons`. `report.json` records triangle and material-batch counts.

Meshes have frame/slide part metadata and a forward muzzle socket. The game retains its existing weapon groups, recoil, hand poses, projectile origin, stats and combat behavior, loading GLB visuals asynchronously with the original geometry as a loading/error fallback. Closing the viewer disposes loaded models and discards late arrivals. The muzzle's child effects remain attached during model replacement.
