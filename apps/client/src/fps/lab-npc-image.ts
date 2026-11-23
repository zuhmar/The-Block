import * as THREE from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import type { LabNpcModel } from "./lab-enemies";
export const LAB_NPC_URLS = {
  "easy-worker": new URL(
    "./models/north-lab-npcs/easy-worker.glb",
    import.meta.url,
  ).href,
  "medium-security": new URL(
    "./models/north-lab-npcs/medium-security.glb",
    import.meta.url,
  ).href,
  "hard-enforcer": new URL(
    "./models/north-lab-npcs/hard-enforcer.glb",
    import.meta.url,
  ).href,
};
const templates = new Map<
  LabNpcModel,
  Promise<{ root: THREE.Group; clips: THREE.AnimationClip[] }>
>();
function template(kind: LabNpcModel) {
  let pending = templates.get(kind);
  if (!pending) {
    pending = (async () => {
      const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
      const g = await new GLTFLoader().loadAsync(LAB_NPC_URLS[kind]);
      return { root: g.scene, clips: g.animations };
    })();
    templates.set(kind, pending);
    pending.catch(() => templates.delete(kind));
  }
  return pending;
}
let warming = false;
export function warmLabNpcModels() {
  if (warming) return;
  warming = true;
  void Promise.allSettled(
    (Object.keys(LAB_NPC_URLS) as LabNpcModel[]).map(template),
  );
}
export type LabAnimationState = {
  reloading?: boolean;
  down?: boolean;
  hit?: boolean;
  running?: boolean;
};
export async function loadLabNpc(kind: LabNpcModel) {
  const source = await template(kind);
  return prepareLabNpc(clone(source.root) as THREE.Group, source.clips);
}
export function prepareLabNpc(root: THREE.Group, clips: THREE.AnimationClip[]) {
  root.rotation.y = Math.PI;
  root.traverse((o) => {
    if (o instanceof THREE.SkinnedMesh) o.frustumCulled = false;
  });
  const mixer = new THREE.AnimationMixer(root);
  function make(name: string, part: "lower" | "upper" | "all") {
    const clip = clips.find((c) => c.name === name);
    if (!clip) throw Error("Lab NPC missing " + name);
    const tracks = clip.tracks.filter(
      (t) =>
        part === "all" ||
        (part === "lower"
          ? /Lab(Hips|LeftUpLeg|RightUpLeg|LeftLeg|RightLeg|LeftFoot|RightFoot|LeftToe|RightToe)/.test(
              t.name,
            )
          : /Lab(Spine|Chest|Neck|Head|LeftShoulder|RightShoulder|LeftArm|RightArm|LeftForeArm|RightForeArm|LeftHand|RightHand)/.test(
              t.name,
            )),
    );
    return mixer.clipAction(
      new THREE.AnimationClip(name + "-" + part, clip.duration, tracks),
    );
  }
  const lower = {
      Idle: make("Idle", "lower"),
      Walk: make("Walk", "lower"),
      Run: make("Run", "lower"),
    },
    upper = {
      Aim: make("Aim", "upper"),
      Fire: make("Fire", "upper"),
      Reload: make("Reload", "upper"),
      Hit: make("Hit", "upper"),
    },
    death = make("Death", "all");
  for (const a of [upper.Fire, upper.Reload, upper.Hit, death]) {
    a.setLoop(THREE.LoopOnce, 1);
    a.clampWhenFinished = true;
  }
  let lowerName: keyof typeof lower = "Idle",
    upperName: keyof typeof upper = "Aim",
    dead = false,
    reloading = false;
  lower.Idle.play();
  upper.Aim.play();
  mixer.update(0);
  function setUpper(name: keyof typeof upper, force = false) {
    if (name === upperName && !force) return;
    upper[upperName].stop();
    upperName = name;
    upper[name].reset().play();
  }
  mixer.addEventListener("finished", (e) => {
    if (
      !dead &&
      !reloading &&
      (e.action === upper.Fire || e.action === upper.Hit)
    )
      setUpper("Aim");
  });
  return {
    root,
    clips,
    mixer,
    attachWeapon(weapon: THREE.Group) {
      const hand = root.getObjectByName("LabRightHand");
      if (!hand) throw Error("Lab NPC missing right hand");
      root.updateMatrixWorld(true);
      const basis =
        root.parent?.getWorldQuaternion(new THREE.Quaternion()) ??
        new THREE.Quaternion();
      const target = hand
        .getWorldPosition(new THREE.Vector3())
        .add(new THREE.Vector3(0, 0.08, -0.04).applyQuaternion(basis));
      const rotation = hand
        .getWorldQuaternion(new THREE.Quaternion())
        .invert()
        .multiply(basis);
      hand.worldToLocal(target);
      hand.add(weapon);
      weapon.position.copy(target);
      weapon.quaternion.copy(rotation);
      weapon.scale.setScalar(1);
      weapon.userData.labHandAttached = true;
    },
    animate(
      moving: boolean,
      dt: number,
      shot = false,
      state: LabAnimationState = {},
    ) {
      if (state.down) {
        if (!dead) {
          mixer.stopAllAction();
          death.reset().play();
          dead = true;
        }
        mixer.update(dt);
        root.userData.labAnimation = "Death";
        return;
      }
      if (dead) {
        mixer.stopAllAction();
        dead = false;
        lowerName = "Idle";
        upperName = "Aim";
        lower.Idle.reset().play();
        upper.Aim.reset().play();
      }
      const next = moving ? (state.running ? "Run" : "Walk") : "Idle";
      if (next !== lowerName) {
        lower[lowerName].fadeOut(0.12);
        lower[next].reset().fadeIn(0.12).play();
        lowerName = next;
      }
      if (state.reloading && !reloading) setUpper("Reload", true);
      else if (!state.reloading && reloading) setUpper("Aim");
      reloading = !!state.reloading;
      if (!reloading) {
        if (state.hit) setUpper("Hit", true);
        else if (shot) setUpper("Fire", true);
      }
      mixer.update(dt);
      root.userData.labAnimation = lowerName + " + " + upperName;
    },
  };
}
