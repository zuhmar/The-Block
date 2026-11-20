import * as THREE from "three";
import { loadStreetReview } from "./street-review";
import type { NpcKind } from "./npc-models";

/** Rendered meshes are separate from the inexpensive shooting volumes. */
export function createNpcHitbox() {
  const root = new THREE.Group();
  root.name = "npc-hitbox";
  const material = new THREE.MeshBasicMaterial();
  for (const [y, w, h, d] of [
    [0.94, 0.64, 1.3, 0.44],
    [1.7, 0.58, 0.58, 0.58],
  ]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.y = y;
    mesh.visible = false;
    root.add(mesh);
  }
  return root;
}
export async function loadNpcImage(kind: NpcKind) {
  const model = await loadStreetReview(kind);
  const walk = model.clips.find((c) => c.name === "walk"),
    combat = model.clips.find((c) => c.name === "combat");
  if (!walk || !combat) throw Error("NPC rig missing combat/walk clips");
  const lower = new THREE.AnimationClip(
    "walking-legs",
    walk.duration,
    walk.tracks.filter((t) => /thigh|shin|foot/.test(t.name)),
  );
  const upper = new THREE.AnimationClip(
    "aiming-arm",
    combat.duration,
    combat.tracks.filter((t) =>
      /upper_armR|forearmR|handR|finger0R|thumbR/.test(t.name),
    ),
  );
  const walkAction = model.mixer.clipAction(lower);
  model.mixer.clipAction(upper).play();
  return {
    ...model,
    animate(moving: boolean, dt: number) {
      if (moving) {
        if (!walkAction.isRunning()) walkAction.reset().play();
      } else if (walkAction.isRunning()) walkAction.stop();
      model.mixer.update(dt);
    },
  };
}
