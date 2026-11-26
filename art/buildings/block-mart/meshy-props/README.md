# Block Mart · original-art prop references

Nine separate AI-generated transparent PNG sprites are ready as image-to-3D references. Each was generated directly from the approved original Block Mart concept in `../references/block-mart.png`, using its glossy cartoon art, palette, fixture designs and architectural details. These are reference sprites, not renders of the existing Blender props and not completed Meshy models.

## Individual references

| Prop                                         | Sprite                                  |     Mesh target |
| -------------------------------------------- | --------------------------------------- | --------------: |
| Stocked retail shelf                         | `image-references/retail-shelf.png`     | 4,000 triangles |
| Checkout counter, register and candy display | `image-references/checkout-counter.png` | 3,000 triangles |
| Three-door drinks refrigerator               | `image-references/refrigerator.png`     | 3,000 triangles |
| Two stacked delivery cartons                 | `image-references/stock-boxes.png`      | 1,600 triangles |
| Rooftop AC condenser                         | `image-references/roof-ac.png`          | 1,600 triangles |
| Ribbed roof ventilator                       | `image-references/roof-vent.png`        | 1,000 triangles |
| Gooseneck wall lamp                          | `image-references/exterior-light.png`   |   800 triangles |
| Wall-mounted security camera                 | `image-references/security-camera.png`  |   800 triangles |
| Full rain downpipe                           | `image-references/rain-downpipe.png`    |   600 triangles |

The square sprites are 1254 × 1254 pixels; the complete long downpipe is 887 × 1774. `reference-check.json` records measured alpha ranges and visible-content bounds: every sprite has true transparency and its main visible silhouette remains inside the image. The original generated images are retained separately in the workspace.

## Meshy handoff and budget

The intended route is one image-to-3D task per sprite, using `meshy-t2` smart topology and `meshy-n1` texturing. Current listed prices are 5 geometry credits plus 10 texture credits per prop, or 135 for the nine-model set. Preserve task IDs in `manifest.json`, download only required GLBs, inspect the actual models and textures, and prepare correct metre-scale exports before any runtime replacement. Mesh targets are requests, not measured results.

Five superseded draft generations used rendered Blender props as their source before the user corrected the source direction. They consumed 75 credits and are identified separately in the manifest. They must not be presented as the models of these corrected sprites. Completing all nine corrected models would use another 135 credits, bringing the total to 210, which is 75 beyond the initial estimate. Paid reruns await user approval. No corrected Meshy model has been generated or integrated at this stage.

The existing playable Block Mart, its doors, collision, loot and persistent data remain as previously integrated. These source images live outside the runtime asset tree.
