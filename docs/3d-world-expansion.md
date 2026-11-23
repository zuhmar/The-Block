# Jail grounds and West Quarter

The first-person map now measures 384 × 384 metres. Six original Blender building variants form West Quarter beyond the former western boundary: Corner Diner, West Market, Repair Garage, Brick Duplex (two floors), West Clinic, and Corner Offices (three floors). Each has a furnished interior, an operating entrance, and supply loot. The existing bridge and Fort East remain in place.

Central Jail now has a fenced courtyard, open north and south pedestrian gates, four stair-accessible watchtowers, benches, and a recreation court. The city loop and surrounding buildings have been adjusted within the original reserved city footprint. Physical fences, tower decks, stairs, and shooting cover use shared authored dimensions.

There are 23 searchable roadside trash containers in three original styles: metal can, wheelie bin, and public litter bin. They award 8, 12, or 10 wood respectively, once per saved container. Fourteen new supply crates and all trash entries append after the existing 28 crates, retaining old searched indices. The expanded world has 65 searchable containers total.

Saved structures retain their original coordinates and heights. The new western connector routes around saved bases and existing trees at load time; if enclosed, it leaves the base intact rather than drawing a road through it. The six new buildings occupy previously inaccessible land. Construction remains available on open countryside with the existing 100-piece limit.

Regenerate the new models with `pnpm assets:town-expansion`. Shared physics data lives in `jail-ground-layout.ts`, `building-layout.ts`, and `west-quarter.ts`; original Blender sources and scripts are committed alongside the runtime GLBs. Existing character, combat, multiplayer, and database systems are unchanged.
