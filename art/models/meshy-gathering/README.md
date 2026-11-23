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

Geometry uses Meshy T2 smart topology with targets of 4,000 faces for trees and 2,500 for nodes; actual counts vary. Textures use Meshy N1. Each GLB contains one mesh/material, normals, UVs and its embedded texture with no external dependencies. These are original Meshy downloads, retaining Meshy's scale and origin. They are not yet wired into the game; the existing gathering models and mechanics remain active. World-scale normalization, colliders, LODs and runtime texture optimization belong to integration.

All six Meshy previews were visually inspected for subject, silhouette and distinguishing resource colors; this does not establish hidden-surface quality. The binary GLBs were checked for valid container lengths, finite positions, triangle primitives, UVs, normals and embedded buffers/images. `inspection.json` records actual counts and hashes. `preview.png` is a labeled contact sheet of Meshy's rendered thumbnails, not an interactive viewer.

`tasks.json` preserves task IDs, request UUIDs, generation settings and source image hashes so follow-ups reuse the existing models. Six requested generations consumed 90 credits by balance delta (115 → 25); no paid remesh, rigging, animation or rerun was performed. Per-task consumed-credit values were not provided by the hosted task tool. Expiring signed URLs are not stored.
