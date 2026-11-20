# Four image-led Blender rebuilds

The reference is a **recreated** version of the agreed four-character concept sheet. The missing earlier lineup was not recovered. [reference.png](reference.png) is now saved in the repository and packed into the editable Blender library.

These four models were built in a fresh Blender scene from the saved image and [manually traced pixel landmarks](landmarks.json). The builder does not import an earlier Blender file, GLB or character mesh. Widths, head size, joint heights and garment outlines are based on the image. Depth and unseen surfaces are authored interpretations of the front-view sheet.

Open **View Player & Weapons** and choose **IMAGE BASE**, **IMAGE STREET**, **IMAGE MILITARY** or **IMAGE ARMOR**. The **FOUR-CHARACTER REFERENCE IMAGE** link opens the exact saved sheet. Each model loads only when requested. The existing procedural buttons remain available for comparison; these review assets do not yet replace the gameplay controllers or enemy rigs.

## Deliverables

- [Editable Blender library](image-character-library.blend): all four fresh rigs/meshes, materials, packed shading images, animation actions, studio and aligned image reference.
- [Base GLB](../../../apps/client/src/fps/models/image-rebuild/base.glb): 9,248 triangles.
- [Street GLB](../../../apps/client/src/fps/models/image-rebuild/street.glb): 40,196 triangles.
- [Reinforced GLB](../../../apps/client/src/fps/models/image-rebuild/reinforced.glb): 44,480 triangles.
- [Armored GLB](../../../apps/client/src/fps/models/image-rebuild/armored.glb): 46,704 triangles.
- [Export report](report.json) records counts and the reference image's SHA-256.
- [Blender lineup render](blender-lineup.png) and individual front renders: [base](base-front.png), [Street](street-front.png), [Reinforced](reinforced-front.png), [Armored](armored-front.png).

Each model has a fresh 28-bone rig and its own `idle`, `walk` and `grip` clips. Clothing remains separately removable by headwear/torso/legs/footwear. The hands are continuous rounded mittens with thumb forms, following the image. Pants and upper garments have joined surfaces; knees/elbows use blended skin weights. Each GLB embeds its own 512-pixel shading atlas.

The image's distinctive features are kept: bare glossy black identity; burgundy hoodie/cap with ivory, outward-turned sneakers; black military uniform and regular open-face helmet; graphite/amber armor with an enclosed visor and chin guard.

## Rebuild

With Blender 4.3 installed, run from the repository root:

```sh
pnpm assets:image-characters
```

`packages/art-tools/build-image-characters.py` resets Blender to an empty scene, reads only the reference/landmarks as modeling inputs, creates geometry and rigs, joins cloth surfaces, bakes shading, exports the four GLBs, renders previews and saves the library. Its reference-plane scale and column positions use the same pixel-to-meter conversion as the character measurements.

`tests/image-character-rebuild.test.ts` validates provenance, embedded texture, skin data, unique animation clips and geometry budgets. The browser test exercises all four models on desktop and phone, checks actual knee/mitten deformation, removes headwear and verifies the exact saved image is accessible. These are software-WebGL checks, not physical-phone FPS measurements.
