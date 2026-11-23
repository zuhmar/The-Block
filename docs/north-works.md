# North Works compound

North Works is the seven-building, glossy cartoon compound from the approved larger layout, placed on the **northern edge above the jail district**. The existing 640 × 640 m world and island coast are unchanged.

The default reservation is 120 × 100 m, spanning x −140 to −20 and z −238 to −138. Its northern fence sits just inland of the shoreline. A curved, six-meter-wide access road leaves the jail district's northeastern street and reaches the compound's wide southern entrance. The eastern service gate is also open to foot traffic. Gates remain open architectural entrances; they do not introduce another interaction system.

The compound includes:

- A large brick main lab with a central workroom, separate office, and utility room.
- A maintenance workshop with work surfaces, storage and equipment.
- A teal warehouse with shelving and open circulation aisles.
- A smaller brick lab annex.
- A packing building with closed loading shutters and a usable pedestrian entrance.
- A detached security office with desk monitors and lockers.
- A staff building with dining furniture, kitchenette and a separate locker area.

All seven use the existing building/door controller, room collisions, roof cutaways and interior culling. The lab furnishings are fictional environmental set dressing. The courtyard contains shipping containers, pallets, parcels, sealed barrels, dumpsters, bins, a delivery van, forklift, generators, AC units and lamps. Existing player construction, inventory, crafting, combat and loot progression are preserved; this change adds no production mechanic. Existing 70 loot entries and searched indices stay unchanged.

## Saved-world compatibility

Before loading the scene, the new district checks the saved player construction. If its default shoreline footprint is occupied, it selects another clear northern-edge site. If every candidate is occupied, the new district is omitted for that saved world rather than covering a base. Player structures and their contents are never moved or deleted. The access road detours around saved construction, and is omitted if no safe connector is available. The rest of the world remains playable.

## Assets and editor

The standalone editor includes all seven building prefabs plus **North Works · yard and perimeter**. Existing building indices 0–18 retain their identities; new buildings append at 19–25. Local building meshes are positioned from the shared layout. The yard is a shared local-coordinate assembly, translated with the reservation.

Regenerate with `pnpm assets:north-lab`. The script exports the shared layout, then builds original Blender geometry using the project's existing glossy prop helpers. Editable scenes are under `art/buildings/north-lab`; building GLBs are in the existing FPS model catalog, and the yard GLB and manifest are under `apps/client/static/assets/north-lab`.

Validation covers shoreline bounds, old-building and loot identities, both entrances, all seven room approaches, prop/building clearance, road detours, saved-base conflicts, door hinges, roof/interior metadata and geometry budgets. Rendering hides the distant district and reuses material batches; collision boxes share the authored layout.

## Lab guards

North Works now has 15 distinct patrols: ten teal workers with pistols, four amber security guards with assault rifles, and one crimson enforcer with an LMG. Workers cover rooms and loading areas; security covers the entrance, service gate and logistics corridor; the enforcer patrols the inner yard. Patrols follow the compound when it relocates to protect saved bases and are omitted if no safe compound site exists.

These use the original Meshy characters with new editable Blender skeletons and Idle, Walk, Run, Aim, Fire, Reload, Hit and Death clips. Weapons attach to the right hand. Pistols fire single shots, ARs fire three-round bursts, and the LMG fires six-round bursts. Magazine sizes are 12/30/60, with visible timed reloads. All retain the existing line-of-sight checks, damage and 30-second respawn flow. Models are cached once per tier and loaded on approach; distant lab AI sleeps to limit work on phones.

Validation: the full game suite passed, along with focused tests for clear patrol segments, burst fire/cover/reload/respawn and independently animated skinned clones. Desktop and phone-layout browser fixtures at the compound entrance confirmed the exact roster, nearby Blender model hydration, hand attachment and live AR fire without missing assets or page errors. Three.js previews exercised all three rigs through locomotion, firing, reload, death and revival. Browser fixtures are local only; physical phone frame rates were not benchmarked.
