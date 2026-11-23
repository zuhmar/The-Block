# North Works NPC models — Meshy

Three textured GLB models generated in Meshy from the separate approved white-stick-figure sprite references. Generation used **Meshy T2.5 smart topology**, **Meshy N1 textures**, and a **10,000-triangle target** per character. The original downloaded Meshy GLBs are retained without mesh edits.

| Tier   | Model                 | Actual triangles | Meshy task ID                          |
| ------ | --------------------- | ---------------: | -------------------------------------- |
| Easy   | `easy-worker.glb`     |           10,479 | `01a20a4c-e540-7110-89a9-dd6fdf79f034` |
| Medium | `medium-security.glb` |           10,671 | `01a20a4d-1cc2-7646-9c89-360b5dda4467` |
| Hard   | `hard-enforcer.glb`   |           10,529 | `01a20a4d-59cc-7496-8405-3b3b6abedd57` |

Each file contains one mesh/material and an embedded base-color texture, with normals and UVs and no external file dependencies. The files contain **no skeletons or animation clips**. Original Meshy scale is retained; rigging, game scaling, animation and NPC spawning are separate integration work. Existing game characters remain unchanged.

The corresponding `*-preview.png` files are Meshy's model previews and were visually inspected. `inspection.json` records measured geometry, file hashes and reference-image hashes. `meshy-tasks.json` records generation settings, request UUIDs and task IDs so follow-up work can reuse these tasks without regenerating the models. Source artwork lives under `art/ai/north-lab-npcs`.

The three generations consumed 45 Meshy credits total (175 before, 130 after). Only GLB downloads were requested. Expiring download URLs are intentionally not stored in the repository.
