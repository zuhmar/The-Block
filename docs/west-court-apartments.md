# West Court apartments

A separate three-story apartment prefab stands at **(-100, 6)** near the west market, facing south toward its shared approach from the street at Z=40. The existing Corner Tenements and South Tenements retain their original models, dimensions, rooms, stairs and entrances.

The new footprint is 18 × 16 metres, authored at unit scale in Blender. Six apartments have individual numbered entrance doors off the shared east hallway, a living/kitchen area, and a separate bedroom with an open doorway. Floor levels are 0, 3.2 and 6.4 metres. The third stair flight reaches the roof at 9.6 metres; its enclosed stair head has an operable roof exit and the roof perimeter has solid parapets. Use **E / USE** near each door.

- Layout/collision authority: `apps/client/src/fps/city-apartments-layout.ts`, together with the shared building stairs/slabs.
- Editable model, preview and export reports: `art/buildings/apartments/west-court/`.
- Rebuild: `pnpm assets:city-apartments`. This reuses our authored tenement modules and prepared utility models; it does not call a paid generation service or resize the existing building model.
- Runtime: full GLB nearby, exterior LOD beyond 50 metres, standard 145-metre building culling. Separate door hinges drive the visible leaves and shooting proxies.
- Editor: “West Court · 6 apartments · roof access” is available as a separate furnished prefab and appears in the current-map document.

The building is appended at index 36 and its six loot containers are appended after all existing city loot. Existing building identities, searched-container cooldown indices, housing plots and player save formats are preserved. Tests cover reversible city setup, unchanged tenements, clear apartment/bedroom entrances, collision during door swings, stairs and headroom, roof access/guards, model scale, matching authored collision data, roof apertures and the distance asset.
