# Terrain artwork

`cliff-sheet.png` is an original AI-generated four-variant rocky bluff atlas with grassy tops and south-facing slate rock faces, on transparent alpha. `import-terrain.ts` crops the four source cells, trims transparent padding, and packs four 384 × 144 sprites without redrawing them.

The coastline, water boundaries, roads and bridge planks are code-native geographic shapes derived from the shared terrain model. The map preview renders those actual coordinates; it is a map-model illustration, not a browser screenshot. Trees reuse the existing AI world sprites.
