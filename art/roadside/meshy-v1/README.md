# Street Survival — roadside crates and street props

A coordinated flat glossy cartoon kit with separate image references for every object.
The five crate tiers retain distinct silhouettes: small wood, tall supply, reinforced,
skinny long weapon case and thick long heavy supply case. Searchable containers have
matching teal plates for readability. There are no ground patches or terrain planes.

## Delivered

- **12 individual 1024 × 1024 AI-generated reference images** in `references/`.
- **12 textured Meshy models** in `models/`: five crate tiers, metal trash can, wheelie
  bin, litter basket, dumpster, streetlamp, bench and fire hydrant.
- **12 transparent 512 × 512 sprites** in `sprites/`, rendered from those models.
- Meshy previews, per-task journals, prompts, source hashes and verification reports.
- Open `index.html` to inspect/filter/download individual files. The two gallery
  images show the original references and the finished transparent sprites separately.

All twelve models are integrated into the game and separate map editor. Existing
crate and bin locations retain their saved container indices and cooldowns. Models
are fitted uniformly inside their former placement envelopes, with movement and shot
collision matching the resulting visual bounds. New searchable dumpsters are appended
after existing containers. Benches and hydrants occupy validated sidewalk positions
outside roads, entrances, housing parcels and resource parks. Streetlamps reuse the
existing lamp positions; repeated street models share instanced GPU batches.

Runtime copies live in `apps/client/src/fps/models/roadside/`. One shared preload loads
the twelve assets and caps their base-color textures to 512px on the GPU. The map
editor lists every model, uses the updated containers in its city template, and includes
the new street dressing. No player inventory or persistent world data is reset.

## Meshy pipeline and cost

Each object uses its own individual reference image, never a sheet or another prop.
T2 smart topology targets 1,800–3,000 triangles; N1 supplies the base-color texture.
Preparation embeds a 1024px JPEG texture, preserves proportions through uniform scale,
sets the origin at the floor and renders the model with an actual alpha background.
These are static environmental props; lids and doors are not rigged for animation.

**288 credits spent:** 12 reference images × 9 + 12 textured models × 15.
**63 credits remain.** The user approved the final 45-credit completion step.
No paid reruns or duplicate generation tasks were used.

## Validation and regeneration

```sh
blender -b -t 2 --python-exit-code 1 --python packages/art-tools/prepare-roadside-props.py
python packages/art-tools/check-roadside-sprites.py
python packages/art-tools/check-meshy-props.py art/roadside/meshy-v1
pnpm exec tsx packages/art-tools/check-roadside-props.ts
python packages/art-tools/pack-roadside-props.py
```

Preparation reads downloaded originals from `work/roadside-raw/`; source GLB hashes
are recorded in `tasks/prepared-*.json`. Meshy task IDs are retained for later downloads.
Validation checks the actual Meshy source pixels against each intended reference,
alpha and clear margins, real-world bounds, self-contained textures, triangle budgets,
and floor pivots through the actual Three.js GLTF loader. All twelve model and sprite pairs are required by the completed-pack checks.

The downloadable `work/street-survival-roadside-assets.zip` contains this entire art
pack, including all twelve references and the twelve completed model/sprite pairs.
