# West Court apartment props

Eight original, separately generated reference images and textured Meshy models matching Street Survival's glossy cartoon style: bed, sofa, wardrobe, straight kitchen counter, dining table, dining chair, refrigerator, and TV cabinet.

Each model uses its own reference image. Geometry uses Meshy T2 smart topology with a per-object triangle target; textures use Meshy N1. `manifest.json` records prompts, reference/model task IDs, polygon targets, intended dimensions, downloaded files, and measured asset checks. All eight Meshy-ingested source images were verified pixel-identical to their intended references. `loader-check.json` records successful Three.js loads and native model bounds. The suggested metre dimensions are placement guidance, not a claim that Meshy's raw output already uses those dimensions.

`references/` contains the original 1024 × 1024 AI reference PNGs. `models/` contains the textured GLBs downloaded from Meshy. `previews/` contains Meshy's resulting model thumbnails for comparison with the references.

The prepared versions are integrated into all six West Court apartments: 54 furniture instances, including two chairs per unit. Runtime exports in `apps/client/src/fps/models/apartment-props/` use uniform scale baked into vertices, floor pivots, 1024-pixel JPEG textures, and glossy materials. Their measured dimensions drive fixture footprints and shooting proxies. Repeated instances share eight geometry buffers and their textures; furniture on other floors is culled, and the exterior distance model omits furniture. The original Meshy downloads in this folder remain unchanged. Existing tenements, housing plots, loot identities and player saves are preserved. Integration uses local Blender processing and spends no additional Meshy credits.

Actual generation charge: eight references at 9 credits and eight textured T2/N1 models at 15 credits, totalling 192 credits. Balance: 1,595 before and 1,403 after. No paid remeshing, rigging, extra variants or reruns are included.

Recheck the delivered pack with `python packages/art-tools/check-apartment-props.py`. This validates GLB headers, triangle budgets, embedded texture decoding, reference dimensions, and content hashes without changing the models.
