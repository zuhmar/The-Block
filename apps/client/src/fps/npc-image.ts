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
  if (kind === "lookout") return prepareMeshyLookout(model);
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
    attachWeapon: undefined as ((weapon: THREE.Group) => void) | undefined,
    animate(moving: boolean, dt: number) {
      if (moving) {
        if (!walkAction.isRunning()) walkAction.reset().play();
      } else if (walkAction.isRunning()) walkAction.stop();
      model.mixer.update(dt);
    },
  };
}

/** Layer native locomotion below the authored grip, with the weapon on its hand. */
function prepareMeshyLookout(
  model: Awaited<ReturnType<typeof loadStreetReview>>,
) {
  model.root.rotation.y = Math.PI;
  model.root.traverse((o) => {
    if (o instanceof THREE.SkinnedMesh) o.frustumCulled = false;
  });
  function action(name: string, upper: boolean) {
    const clip = model.clips.find((c) => c.name === name);
    if (!clip) throw Error("Lookout missing " + name);
    return model.mixer.clipAction(
      new THREE.AnimationClip(
        name,
        clip.duration,
        clip.tracks.filter((t) =>
          upper
            ? /Spine|Shoulder|Arm|Hand/.test(t.name)
            : /Hips|UpLeg|Leg|Foot|Toe/.test(t.name),
        ),
      ),
    );
  }
  const idle = action("Idle_3", false).play(),
    walk = action("Walking", false);
  const hold = action("Pistol_Hold", true).play();
  const fire = action("Pistol_Fire", true);
  fire.setLoop(THREE.LoopOnce, 1);
  fire.clampWhenFinished = false;
  model.mixer.addEventListener("finished", () => {
    hold.reset().play();
  });
  let movingLast = false;
  model.mixer.update(0);
  return {
    ...model,
    attachWeapon(weapon: THREE.Group) {
      const hand = model.root.getObjectByName("mixamorigRightHand");
      if (!hand) throw Error("Lookout missing right hand");
      model.root.updateMatrixWorld(true);
      const target = hand
        .getWorldPosition(new THREE.Vector3())
        .add(new THREE.Vector3(0, 0.075, -0.1));
      const rotation = hand.getWorldQuaternion(new THREE.Quaternion()).invert();
      hand.worldToLocal(target);
      hand.add(weapon);
      weapon.position.copy(target);
      weapon.quaternion.copy(rotation);
      weapon.scale.setScalar(1 / model.root.scale.x);
    },
    animate(moving: boolean, dt: number, shot = false) {
      if (shot) {
        hold.stop();
        fire.reset().play();
      }
      if (moving !== movingLast) {
        const previous = movingLast ? walk : idle,
          next = moving ? walk : idle;
        previous.fadeOut(0.15);
        next.reset().fadeIn(0.15).play();
        movingLast = moving;
      }
      model.mixer.update(dt);
    },
  };
}
