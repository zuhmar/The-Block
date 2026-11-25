# Meshy gathering models

Six textured GLB models generated in Meshy from the existing, approved gathering-node sprite references. The source images are the individual crops in `apps/client/static/assets/nature-sprites/`, from `art/ai/nature/tree-resource-nodes.png`.

| File                 | Reference                            | Actual triangles |
| -------------------- | ------------------------------------ | ---------------: |
| `tree-broadleaf.glb` | Broadleaf tree                       |            3,578 |
| `tree-pine.glb`      | Pine tree                            |            4,286 |
| `tree-birch.glb`     | Birch tree                           |            3,776 |
| `node-rock.glb`      | Gray rock cluster                    |            2,410 |
| `node-sulfur.glb`    | Yellow sulfur deposits               |            2,689 |
| `node-metal.glb`     | Gray rock with orange metal deposits |            2,645 |

Geometry uses Meshy T2 smart topology with targets of 4,000 faces for trees and 2,500 for nodes; actual counts vary. Textures use Meshy N1. Each GLB contains one mesh/material, normals, UVs and its embedded texture with no external dependencies. These are original Meshy downloads, retaining Meshy's scale and origin. They are now used in the game and map editor through optimized exports in `apps/client/static/assets/meshy-nature-v1`. The existing harvesting, collision proxies, saved depletion and respawn behavior remain in use.

All six Meshy previews were visually inspected for subject, silhouette and distinguishing resource colors; this does not establish hidden-surface quality. The binary GLBs were checked for valid container lengths, finite positions, triangle primitives, UVs, normals and embedded buffers/images. `inspection.json` records actual counts and hashes. `preview.png` is a labeled contact sheet of Meshy's rendered thumbnails, not an interactive viewer.

`tasks.json` preserves task IDs, request UUIDs, generation settings and source image hashes so follow-ups reuse the existing models. Six requested generations consumed 90 credits by balance delta (115 → 25); no paid remesh, rigging, animation or rerun was performed. Per-task consumed-credit values were not provided by the hosted task tool. Expiring signed URLs are not stored.

## Runtime preparation

Run `pnpm assets:meshy-gathering` to rebuild all twelve runtime GLBs from these untouched original downloads. The local Blender script fits the models to the previous world envelopes, centers them at ground level, retains UVs, and exports one material per model. Near textures are 1024px and distant textures 512px. Distant geometry uses roughly 22% of the original triangles and is grounded again after simplification. The versioned asset directory prevents old cached nature files from being substituted. No Meshy API calls or credits are used by this preparation step.
