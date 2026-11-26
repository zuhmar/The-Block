# Timber yard — Meshy props

Six separately generated textured models matching the timber yard's glossy cartoon palette: log cradle, strapped plank pallet, yellow forklift, saw bench, capture terminal with flag mast, and teal shipping container.

Each model is built from its own standalone reference image. The references were generated inside Meshy from detailed text descriptions: the original local yard concept was not uploaded to Meshy after automatic approval review rejected that file upload. The model-generation inputs are verified against the downloaded individual references.

- `references/`: individual 1024 × 1024 reference PNGs.
- `models/`: original textured GLBs downloaded from Meshy, without geometry edits.
- `previews/`: Meshy's rendered model previews.
- `manifest.json`: prompts, task IDs, face targets, source verification, costs and native bounds. Suggested metre dimensions are placement guidance; raw Meshy outputs are not yet normalized to those dimensions.
- `checks.json` and `loader-check.json`: asset structure, embedded texture, polygon and Three.js loading checks.

These are static props. Forklift driving, moving saw parts, animated flags and capture mechanics are separate future work. Placement in the playable yard is complete. The existing Blender shed, gates and fences remain unchanged.

Generation uses Meshy T2 smart topology and N1 textures. The actual charge was six references at 9 credits plus six textured models at 15 credits: 144 credits (balance 1,403 → 1,259). There are no paid reruns, rigging or extra variants. The rejected local-file upload created no Meshy task.

Validate with `python packages/art-tools/check-meshy-props.py art/building-kits/timber-yard/meshy-props`.

## Game integration

The six models now appear in the lumberyard at (46, 102) through locally prepared runtime derivatives. See [integration notes](../../../../docs/timber-yard-city-integration.md). Original source GLBs remain unchanged.
