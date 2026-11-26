# Street Survival — roadside crates and street props

A coordinated flat glossy cartoon kit with separate image references for every object.
The five crate tiers retain distinct silhouettes: small wood, tall supply, reinforced,
skinny long weapon case and thick long heavy supply case. Searchable containers have
matching teal plates for readability. There are no ground patches or terrain planes.

## Delivered

- **12 individual 1024 × 1024 AI-generated reference images** in `references/`.
- **9 textured Meshy models** in `models/`: five crate tiers, metal trash can, wheelie
  bin, litter basket and dumpster.
- **9 transparent 512 × 512 sprites** in `sprites/`, rendered from those models.
- Meshy previews, per-task journals, prompts, source hashes and verification reports.
- Open `index.html` to inspect/filter/download individual files. The two gallery
  images show the original references and the finished transparent sprites separately.

Streetlamp, bench and hydrant references are ready. Their **3D model submissions are
blocked by automatic approval review**, which requested explicit credit approval.
No placeholder models are represented as completed work. This kit is **not yet
integrated into the playable map**; current gameplay and saved objects are unchanged.

## Meshy pipeline and cost

Each object uses its own individual reference image, never a sheet or another prop.
T2 smart topology targets 1,800–3,000 triangles; N1 supplies the base-color texture.
Preparation embeds a 1024px JPEG texture, preserves proportions through uniform scale,
sets the origin at the floor and renders the model with an actual alpha background.
These are static environmental props; lids and doors are not rigged for animation.

**243 credits spent:** 12 reference images × 9 + 9 textured models × 15.
**108 credits remain.** The remaining three textured models would cost **45 credits**,
bringing the total to the originally planned **288**, with 63 remaining. No paid reruns.
Two attempts to submit the streetlamp were rejected before creation; neither spent
credits or created a duplicate task. Request IDs are retained for safe continuation.

## Validation and regeneration

```sh
blender -b -t 2 --python-exit-code 1 --python packages/art-tools/prepare-roadside-props.py
python packages/art-tools/check-roadside-sprites.py
python packages/art-tools/check-meshy-props.py art/roadside/meshy-v1 --allow-pending
pnpm exec tsx packages/art-tools/check-roadside-props.ts
python packages/art-tools/pack-roadside-props.py
```

Preparation reads downloaded originals from `work/roadside-raw/`; source GLB hashes
are recorded in `tasks/prepared-*.json`. Meshy task IDs are retained for later downloads.
Validation checks the actual Meshy source pixels against each intended reference,
alpha and clear margins, real-world bounds, self-contained textures, triangle budgets,
and floor pivots through the actual Three.js GLTF loader. Pending models remain explicit
in the manifest and are excluded only when `--allow-pending` is supplied.

The downloadable `work/street-survival-roadside-assets.zip` contains this entire art
pack, including all twelve references and the nine completed model/sprite pairs.
