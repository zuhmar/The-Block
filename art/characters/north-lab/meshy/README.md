# Meshy lab NPC rigs and included motions

The three original Meshy lab models now have Meshy-generated skeletons and included walking/running clips. Files are separate from the Blender rigs and are **not yet installed in the game**. Each GLB embeds its textures and skin; `tasks.json` records task IDs, hashes, clip names and actual rigging charges without signed download URLs.

- Easy: `easy-rig.glb`, `easy-walk.glb`, `easy-run.glb`
- Medium: `medium-rig.glb`, `medium-walk.glb`, `medium-run.glb`
- Hard: `hard-rig.glb`, `hard-walk.glb`, `hard-run.glb`

The API charged 5 credits per rig, 15 total (balance 130 → 115). Walking and running came with those rigs; no animation-create requests were submitted. The user clarified that they want the free Meshy Studio animation library. Studio includes library access, while the separate API prices preset application at 3 credits/action. Do not submit paid preset actions for this job.

Sources checked November 23, 2026: https://www.meshy.ai/pricing and https://docs.meshy.ai/api/pricing.md.

For the remaining free Studio clips, open each character in Meshy Studio, use its Animation library, and export GLBs with the desired idle, weapon handling, reload, hit and death clips. Candidate catalog names: Idle, Cowboy Quick Draw Shooting (pistol), Walk Forward While Shooting (rifle/LMG), Standing Reload, Gunshot Reaction, Shot and Fall Backward. Their suitability must be checked in Studio. The connected tools/CLI cannot apply the free Studio entitlement; their animation-create endpoint is billed separately.

Rigging task IDs:

- Easy: `01a20a6f-83a9-7300-afbb-bcf8784f78cd`
- Medium: `01a20a6f-bcd5-730a-ab8c-21f88fa9420e`
- Hard: `01a20a6f-f751-77b7-a3d1-2eef77b8f5f8`

`walk-preview.png` is a locally rendered sample of the downloaded Meshy walk clips. It is not a Meshy animation-library generation or an interactive viewer.
