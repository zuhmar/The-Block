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
  return prepareMeshyNpc(model, kind === "swat" ? "Rifle" : "Pistol");
}

/** Layer native locomotion below the authored grip, with the weapon on its hand. */
function prepareMeshyNpc(
  model: Awaited<ReturnType<typeof loadStreetReview>>,
  weaponKind: "Pistol" | "Rifle",
) {
  model.root.rotation.y = Math.PI;
  model.root.traverse((o) => {
    if (o instanceof THREE.SkinnedMesh) o.frustumCulled = false;
  });
  function action(name: string, upper: boolean) {
    const clip = model.clips.find((c) => c.name === name);
    if (!clip) throw Error("NPC missing " + name);
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
  const hold = action(weaponKind + "_Hold", true).play();
  const fire = action(weaponKind + "_Fire", true);
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
      if (!hand) throw Error("NPC missing right hand");
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
