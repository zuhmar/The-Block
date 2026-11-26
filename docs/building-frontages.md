# Road-facing city entrances

All **62 public city buildings** have a checked, unobstructed front-door route to an existing street. The other 13 buildings retain their authored jail, laboratory and military-compound entrances and circulation. The Block Mart's diagonal corner doorway is evaluated using its actual door center and outward direction. West Court retains its existing front facade, private apartment doors, stairs and roof access; its street bin moves sideways to clear the entrance walk.

`building-frontage.ts` checks cardinal orientations against streets, neighboring building footprints, collision and all housing plots. It selects a clear nearby street and records a frontage. Cream-colored entrance walks connect each recorded door to the sidewalk. One newly added office moves two metres within its block so the rotated footprint clears its neighbor. No building is stretched, and housing plots and player-built structures stay in place.

Prefab room and stair plans remain in local coordinates. `buildingWorld` and `buildingLocal` transform door interaction, collision, floor and ceiling queries, and NPC doorway navigation. The same yaw parents both Blender art and shooting geometry; door hinges retain their local animation. Existing indoor loot rotates with its building while retaining its saved cooldown index. Footprint checks and resource placement use rotated extents. Undoing the compact map clears all orientation metadata for legacy saves.

Validation includes a complete street-to-door movement check for every public building, a rotated tenement's closed/open door and continuous stairs, and a loaded Blender model/proxy alignment check. The complete automated suite passes **301 tests**, together with lint, type checking and the production build.

The subsequent [density pass](dense-city-layout.md) appends 24 street-facing buildings without changing earlier building or cache indices.
