# Street Survival building standard

Block Mart is the approved quality reference for future building upgrades. The user accepted its in-game result on 2026-11-26 and requested this treatment for the remaining buildings.

## Visual and spatial design

Keep the glossy cartoon Street Survival style: readable shapes, restrained highlights, coordinated materials, and deliberate color accents. Give each building a recognizable silhouette and purpose through its architecture, rather than a plain box with a facade texture. Model window recesses, door reveals, parapets, trim, awnings, utilities, and entrances with appropriate depth. Preserve useful sightlines and open paths between furnishings.

Build at the intended metre dimensions. Repeated modules retain their proportions; a differently sized building needs an appropriate layout or repeated modules. Do not stretch a finished building to fit a slot. Multi-storey buildings need connected rooms, usable stairs, landings, floor openings, and headroom.

## Shared asset and integration contract

- Keep an editable Blender source, the design reference, a furnished GLB, reusable prop/module exports, and a lighter distance model.
- Export a layout describing the footprint, wall segments, openings, door hinges, fixtures, and floor levels. Movement and shooting cover must match the visible layout, including irregular footprints.
- Keep doors independent and operable through the existing keyboard/touch interaction. Door leaves and physics share hinge transforms and stop before sweeping through occupants.
- Preserve existing building locations and persistent player data where practical. Retain loot cooldown identities when relocating a container within an upgraded building.
- Make the assembled building and useful standalone modules available in the separate map editor.
- Measure geometry and texture budgets, check exports and collisions, and walk the actual entrance/interior/exit routes before pushing to main. Verify the resulting live deployment.

## Current delivery

Block Mart is integrated. Its standalone Meshy prop set is the next asset task; generation status and model IDs belong in `block-mart/meshy-props/manifest.json`. Completing that set does not imply that the other building models have already been rebuilt.
