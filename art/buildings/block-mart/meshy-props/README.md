# Block Mart · original-art prop references

Nine textured Meshy GLB models and their separate AI-generated transparent PNG reference sprites are complete. Each was generated directly from the approved original Block Mart concept in `../references/block-mart.png`, using its glossy cartoon art, palette, fixture designs and architectural details. The sprites were generated from the original artwork, rather than rendered from existing Blender props. Meshy then generated one model per sprite; each raw export is in `models/`.

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

## Completed Meshy generation

All nine corrected image-to-3D tasks succeeded using `meshy-t2` smart topology and `meshy-n1` texturing. `manifest.json` records the individual task IDs, request IDs, image hashes and actual model hashes. `model-report.json` records the measured geometry, embedded textures, source bounds and file sizes. The nine models total **13,719 triangles** and **23,864,136 bytes**; each model has one embedded 2048 × 2048 base-color texture and no external texture dependencies. Run `pnpm exec tsx packages/art-tools/inspect-block-mart-props.ts` to regenerate the inspection report.

`model-previews/` contains actual Blender renders of the downloaded Meshy GLBs. These are model previews, distinct from the AI reference sprites. Some product detail is baked into the textures; these are static props, with no separate animated refrigerator doors or register controls.

The user approved 135 credits for the corrected nine-model set. Five superseded wrong-source drafts had used 75 credits before the source correction; those IDs are retained separately for traceability. Actual total spending was 210 credits, matching the corrected approved budget. There were no further paid reruns or Meshy remesh operations. A local normal repair removed a dark artifact on the upper carton; the original Meshy export is retained in `source-models/stock-boxes.glb`, and `carton-surface-repair.json` records the source/output hashes. Run `blender -b --python-exit-code 1 --python packages/art-tools/repair-block-mart-cartons.py` to reproduce that repair.

## Integration status

These are source exports in Meshy's normalized coordinates. Metre scale, useful placement pivots, material tuning, mobile texture optimization and collision/placement integration remain separate work. Preserve proportions with uniform scaling when preparing the exports. The existing playable Block Mart, its doors, collision, loot and persistent data remain as previously integrated. The new files live outside the runtime asset tree.
