# Animated North Works guards

Blender-authored rigs and eight clips for the original Meshy lab models: Idle, Walk, Run, Aim, Fire, Reload, Hit and Death. Each editable `.blend` retains the original texture resolution. Runtime GLBs use 1024px textures, 22 bones, normalized four-influence skin weights and a right-hand attachment marker. Original unrigged downloads remain in `art/models/north-lab-npcs`.

Rebuild with `pnpm assets:lab-npcs`. This uses local Blender, not Meshy credits. Source mesh topology is preserved. Bone heat is solved on a closed voxel proxy and transferred to the original surface; contact regions around hands and clothing are retouched and smoothed. Skinning and motion are authored by `packages/art-tools/animate-lab-npcs.py`. Runtime combines locomotion below the waist with weapon handling above it and attaches the existing weapon models to the right hand.
