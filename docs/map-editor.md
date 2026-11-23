# Street Survival map editor

Open `/editor.html` (production: https://the-block-tau-eight.vercel.app/editor.html). For development, run `pnpm dev` and open that path. The editor is a separate Vite entry with its own camera and UI. It does not load the game bootstrap, run combat, or read/write player saves.

## Workflow

1. Start with **Current map** or **Blank island**. The current-map starter reuses the city's building prefabs, road centerlines, loot locations, nature models, jail perimeter, harbor assembly and spawn markers. River segments and base terrain are editable authoring approximations; this is not a simulation of every runtime terrain detail.
2. Search the library, choose a category, pick an asset, then click/tap to place it. Press **R** to turn the placement 90°. Escape returns to selection. Use the height control or **On surfaces** to furnish upper floors.
3. Select in the viewport or choose **Scene objects** in the library. Use Move, Rotate and Scale gizmos, or enter exact transforms in Properties. Shift-click selects several objects for move/rotate, duplication or shared metadata changes. Locked objects must be unlocked first.
4. Draw roads using successive endpoints. Set their width in the inspector. To shape the island, choose Shoreline and drag its amber vertices. Shift-click inserts a vertex on the nearest edge; Delete removes the selected vertex. Invalid coastlines are rejected.
5. Hide roofs or set a Cutaway height to work inside buildings. Existing building furniture and the jail/harbor assemblies are grouped prefabs; place individual library props to add detail. Layer visibility and solid-bound overlays help inspect the layout. Solid bounds are approximate object boxes, not the game's precise doorway physics.
6. **Save draft** writes only to the editor's IndexedDB database (`street-survival-map-editor-v1`). Changes autosave after a short delay. This draft belongs to this browser/device, does not sync between phones, and can be removed by clearing site data.
7. **Export ZIP** is the complete backup/share file, including custom GLBs. JSON is useful for reviewing layout data but does not embed custom models. Import a ZIP to continue on another device. Invalid files leave the current layout in place.

**Exports do not publish changes to the playable game.** Share the ZIP for a separate, reviewed integration step. Behavior, loot tier, respawn time and collision flags are authoring metadata for that step; NPC markers do not spawn active AI in the editor.

## Models and limits

The catalog includes the existing buildings, wooden construction pieces, loot chests, street and warehouse props, nature models, crafting stations, plus simple road, terrain, furniture, fence, dock and spawn-marker primitives. Import additional self-contained GLB v2 models with embedded textures. Imported models are grounded/centered automatically; adjust their scale in Properties. The editor limits projects to 2,000 objects, 12 custom models, 16 MB per model and 32 MB of custom models per project. Terrain uses a 640 × 640 m authoring area matching the current 3D prototype.

Undo/redo retains 40 layout snapshots per session. Export versions separately for durable history. Imported files are treated as asset data, never as instructions or executable scripts. External texture/buffer URLs are rejected.

## Controls

- Drag: pan; right-drag: orbit; wheel: zoom. Touch: one finger pans, two fingers zoom/orbit.
- G / T / S: move / rotate / scale gizmo. R: turn 90°. F: focus selection.
- Delete: remove selection (or shoreline vertex).
- Ctrl/Command D: duplicate; Ctrl/Command Z: undo; Ctrl/Command Shift Z or Ctrl Y: redo; Ctrl/Command S: save draft.

On narrow screens, open **Catalog** and **Properties** from the scrolling toolbar. Close a drawer with × to return to the viewport.
