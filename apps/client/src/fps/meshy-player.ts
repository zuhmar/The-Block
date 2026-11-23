import { harvestPose, type HarvestMotion } from "./harvest-animation";
import { animationFamily } from "./weapons";
import * as THREE from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { createFirstPersonRig, createWeapon } from "./actor-models";
import { createSurvivor } from "./survivor-models";
import type { WeaponKind, Tool } from "./weapons";
const MODEL_URL = new URL("./models/meshy-shadow/animated.glb", import.meta.url)
  .href;
let asset: { root: THREE.Group; clips: THREE.AnimationClip[] } | undefined;
const parts = new Map<
  THREE.BufferGeometry,
  { arms: THREE.BufferGeometry; body: THREE.BufferGeometry }
>();
export async function preloadMeshyPlayer() {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const g = await new GLTFLoader().loadAsync(MODEL_URL);
  for (const name of [
    "Idle_3",
    "Walking",
    "Running",
    "Regular_Jump",
    "Punch_Left",
    "Punch_Right",
    ...["Pistol", "SMG", "Rifle", "Sniper"].flatMap((k) => [
      k + "_Hold",
      k + "_Fire",
      k + "_Reload",
    ]),
  ])
    if (!g.animations.some((c) => c.name === name))
      throw Error("Missing player animation " + name);
  asset = { root: g.scene, clips: g.animations };
}
export type PlayerAction = {
  harvest?: { kind: HarvestMotion; progress: number };
  punch?: number;
  side?: number;
  reload?: number;
  use?: number;
  detonate?: number;
  dt?: number;
  shotSerial?: number;
  running?: boolean;
  jumping?: boolean;
};
export function combatClip(
  kind: WeaponKind | "hands",
  action: PlayerAction,
  fireTime = Infinity,
) {
  if (kind === "hands")
    return {
      name: action.punch
        ? action.side === -1
          ? "Punch_Left"
          : "Punch_Right"
        : "Punch_Left",
      progress: action.punch || 0,
    };
  const prefix = animationFamily(kind);
  if (action.reload)
    return { name: prefix + "_Reload", progress: action.reload };
  const duration = {
    pistol: 0.2,
    smg: 0.1,
    rifle: 1 / 6,
    sniper: 0.4,
    lmg: 0.15,
    rocket: 0.6,
    grenade: 0.8,
    c4: 0.8,
  }[kind];
  if (fireTime < duration)
    return { name: prefix + "_Fire", progress: fireTime / duration };
  return { name: prefix + "_Hold", progress: 0 };
}
export function partitionPlayerGeometry(mesh: THREE.SkinnedMesh) {
  const source = mesh.geometry,
    cached = parts.get(source);
  if (cached) return cached;
  const joints = source.getAttribute("skinIndex"),
    weights = source.getAttribute("skinWeight");
  function ancestor(bone: THREE.Bone, pattern: RegExp) {
    let node: THREE.Object3D | null = bone;
    while (node) {
      if (pattern.test(node.name)) return true;
      node = node.parent;
    }
    return false;
  }
  const forearm = mesh.skeleton.bones.map((b) =>
    ancestor(b, /LeftForeArm|RightForeArm/),
  );
  const upper = mesh.skeleton.bones.map((b) =>
    ancestor(b, /LeftArm|RightArm|LeftShoulder|RightShoulder|Head|Neck/),
  );
  const armWeight: number[] = [],
    excluded: number[] = [];
  for (let v = 0; v < joints.count; v++) {
    let a = 0,
      e = 0;
    for (let k = 0; k < 4; k++) {
      const joint = joints.getComponent(v, k),
        weight = weights.getComponent(v, k);
      if (forearm[joint]) a += weight;
      if (upper[joint]) e += weight;
    }
    armWeight.push(a);
    excluded.push(e);
  }
  const armIndices: number[] = [],
    bodyIndices: number[] = [],
    index = source.index;
  const count = index?.count || source.getAttribute("position").count;
  for (let i = 0; i < count; i += 3) {
    const ids = [0, 1, 2].map((k) => (index ? index.getX(i + k) : i + k));
    if (ids.reduce((s, n) => s + armWeight[n], 0) / 3 > 0.45)
      armIndices.push(...ids);
    if (ids.every((n) => excluded[n] < 0.35)) bodyIndices.push(...ids);
  }
  function geometry(indices: number[]) {
    const g = new THREE.BufferGeometry();
    for (const [key, value] of Object.entries(source.attributes))
      g.setAttribute(key, value);
    g.setIndex(indices);
    return g;
  }
  const result = { arms: geometry(armIndices), body: geometry(bodyIndices) };
  parts.set(source, result);
  return result;
}
function copy(part: "arms" | "body") {
  if (!asset) return undefined;
  const root = clone(asset.root) as THREE.Group;
  root.traverse((o) => {
    if (o instanceof THREE.SkinnedMesh) {
      o.geometry = partitionPlayerGeometry(o)[part];
      o.frustumCulled = false;
    }
  });
  return root;
}
function animator(
  root: THREE.Object3D,
  clips: THREE.AnimationClip[],
  blend = 0,
) {
  const mixer = new THREE.AnimationMixer(root);
  let name = "",
    action: THREE.AnimationAction | undefined;
  return {
    mixer,
    play(next: string, dt: number, progress?: number) {
      if (name !== next) {
        const previous = action;
        const fading = blend > 0 && progress === undefined && !!previous;
        if (!fading) mixer.stopAllAction();
        name = next;
        const clip = clips.find((c) => c.name === next);
        action = clip
          ? mixer.clipAction(clip).reset().setEffectiveWeight(1).play()
          : undefined;
        if (fading && action && previous) {
          previous.fadeOut(blend);
          action.fadeIn(blend);
        }
      }
      if (action && progress !== undefined) {
        action.paused = false;
        action.time =
          Math.min(0.999999, Math.max(0, progress)) * action.getClip().duration;
        mixer.update(0);
      } else mixer.update(dt);
    },
    get name() {
      return name;
    },
  };
}
export function createPlayerViewRig(kind: WeaponKind = "pistol") {
  const model = copy("arms");
  if (!model || !asset) {
    const fallback = createFirstPersonRig(kind);
    fallback.root.userData.playerSource = "fallback";
    return fallback;
  }
  const arms = model;
  const root = new THREE.Group();
  root.name = "meshy-first-person";
  root.userData.playerSource = "meshy";
  root.add(model);
  model.rotation.y = Math.PI;
  const animation = animator(model, asset.clips);
  animation.play(animationFamily(kind) + "_Hold", 0, 0);
  model.position.set(0.08, -1.38, -0.03);
  root.updateMatrixWorld(true);
  const hand = model.getObjectByName("mixamorigRightHand");
  if (!hand) throw Error("Meshy right hand missing");
  const gun = createWeapon(kind),
    handPosition = hand.getWorldPosition(new THREE.Vector3()),
    handRotation = hand.getWorldQuaternion(new THREE.Quaternion());
  const target = handPosition
    .clone()
    .add(new THREE.Vector3(kind === "c4" ? -0.045 : 0, 0.075, -0.1));
  gun.root.position.copy(hand.worldToLocal(target));
  const gripPosition = gun.root.position.clone();
  const gripRotation = handRotation.clone().invert();
  gun.root.quaternion.copy(gripRotation);
  if (kind === "c4") gun.root.scale.setScalar(0.72);
  hand.add(gun.root);
  const flash = new THREE.Mesh(
    new THREE.ConeGeometry(0.035, 0.12, 5),
    new THREE.MeshBasicMaterial({ color: 0xffda83 }),
  );
  flash.rotation.x = -Math.PI / 2;
  flash.position.z = -0.035;
  flash.visible = false;
  gun.muzzle.add(flash);
  const useBones = [
    "mixamorigRightArm",
    "mixamorigRightForeArm",
    "mixamorigRightHand",
    "mixamorigLeftArm",
    "mixamorigLeftForeArm",
    "mixamorigLeftHand",
  ]
    .map((name) => model.getObjectByName(name))
    .filter((o): o is THREE.Object3D => !!o);
  const bonePose = new Map<THREE.Object3D, THREE.Quaternion>();
  let armed = false,
    aspect = 1,
    lastSerial: number | undefined,
    fireTime = Infinity;
  function equip(value: boolean) {
    armed = value;
    gun.root.visible = value;
    lastSerial = undefined;
    fireTime = Infinity;
  }
  function setAspect(value: number) {
    aspect = value;
  }
  function animate(
    time: number,
    moving: boolean,
    recoil: number,
    state: PlayerAction = {},
  ) {
    const dt = state.dt ?? 1 / 60;
    if (lastSerial !== undefined && state.shotSerial !== lastSerial)
      fireTime = 0;
    lastSerial = state.shotSerial;
    for (const [bone, pose] of bonePose) bone.quaternion.copy(pose);
    const selected = combatClip(armed ? kind : "hands", state, fireTime);
    animation.play(selected.name, 0, selected.progress);
    for (const bone of useBones) bonePose.set(bone, bone.quaternion.clone());
    const use = state.use ?? 0;
    const stroke =
      kind === "grenade"
        ? use < 0.3
          ? Math.sin(((use / 0.3) * Math.PI) / 2) * 0.6
          : -Math.sin(((use - 0.3) / 0.7) * Math.PI) * 1.1
        : -Math.sin(use * Math.PI) * 0.4;
    if (armed && (kind === "grenade" || kind === "c4")) {
      useBones[0]?.rotateX(stroke);
      useBones[1]?.rotateZ(-Math.sin(use * Math.PI) * 0.65);
    }
    if (armed && state.detonate)
      useBones[2]?.rotateZ(-Math.sin(state.detonate * Math.PI) * 0.45);
    if (state.harvest) {
      const p = harvestPose(state.harvest.kind, state.harvest.progress);
      useBones[0]?.rotateX(p.shoulder);
      useBones[0]?.rotateY(p.side);
      useBones[1]?.rotateZ(p.elbow);
      useBones[2]?.rotateZ(p.wrist);
      useBones[3]?.rotateX(p.shoulder * 0.35);
      useBones[4]?.rotateZ(-p.elbow * 0.4);
    }
    fireTime += dt;
    const bob = moving
      ? Math.sin(time * (state.running ? 12 : 9)) * 0.005
      : Math.sin(time * 1.7) * 0.001;
    if (armed)
      arms.position.set(aspect < 0.8 ? 0.04 : 0.08, -1.38 + bob, -0.03);
    else arms.position.set(0, (aspect < 0.8 ? -1.26 : -1.34) + bob, -0.5);
    gun.root.quaternion
      .copy(gripRotation)
      .multiply(
        new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 0, 1),
          -Math.sin(Math.PI * (state.reload || 0)) * 0.28,
        ),
      );
    const swing = Math.sin(use * Math.PI);
    if (kind === "grenade" || kind === "c4") {
      arms.position.z += swing * (kind === "grenade" ? -0.28 : -0.18);
      arms.rotation.x = swing * (kind === "grenade" ? -0.55 : -0.3);
      gun.root.visible = armed && !(use > 0.45 && use < 0.9);
    } else arms.rotation.x = 0;
    if (kind === "rocket")
      gun.root.position.z =
        gripPosition.z + Math.sin((state.reload ?? 0) * Math.PI) * 0.14;
    gun.slide.position.z = recoil * 0.022;
    const magazine = gun.root.getObjectByName(kind + "-magazine-group");
    if (magazine)
      magazine.position.y =
        -Math.sin(
          Math.PI *
            Math.min(1, Math.max(0, ((state.reload || 0) - 0.15) / 0.65)),
        ) * 0.09;
    root.userData.playerClip = selected.name;
    root.userData.usePose = useBones[0]?.quaternion.toArray().join(",") ?? "";
  }
  equip(false);
  return { root, gun, flash, equip, setAspect, animate };
}
export function createPlayerBody() {
  const model = copy("body");
  if (!model || !asset) {
    const body = createSurvivor("base");
    body.head.visible = false;
    body.arms.forEach((a) => (a.visible = false));
    body.root.userData.playerSource = "fallback";
    return {
      root: body.root,
      animate(
        time: number,
        moving: boolean,
        _state: PlayerAction,
        _tool: Tool,
      ) {
        body.legs[0].rotation.x = moving ? Math.sin(time * 9) * 0.3 : 0;
        body.legs[1].rotation.x = -body.legs[0].rotation.x;
      },
    };
  }
  const root = new THREE.Group();
  root.add(model);
  model.rotation.y = Math.PI;
  model.scale.setScalar(1.12);
  root.userData.playerSource = "meshy";
  const lowerClips = asset.clips
    .filter((c) =>
      ["Idle_3", "Walking", "Running", "Regular_Jump"].includes(c.name),
    )
    .map(
      (c) =>
        new THREE.AnimationClip(
          c.name,
          c.duration,
          c.tracks.filter(
            (t) =>
              /Hips|UpLeg|LeftLeg|RightLeg|Foot|Toe/.test(t.name) &&
              !(c.name === "Regular_Jump" && /Hips.*position/.test(t.name)),
          ),
        ),
    );
  const upperClips = asset.clips.map(
    (c) =>
      new THREE.AnimationClip(
        c.name,
        c.duration,
        c.tracks.filter(
          (t) =>
            /Spine|Shoulder|Arm|Hand|Bone_/.test(t.name) &&
            !/^SmartRigArmature\./.test(t.name),
        ),
      ),
  );
  const lower = animator(model, lowerClips, 0.12),
    upper = animator(model, upperClips);
  let lastSerial: number | undefined,
    fireTime = Infinity,
    jumpTime = 0;
  let lastTool: Tool = "hands";
  return {
    root,
    animate(_time: number, moving: boolean, state: PlayerAction, tool: Tool) {
      const dt = state.dt ?? 1 / 60;
      if (lastTool !== tool) {
        fireTime = Infinity;
        lastTool = tool;
      } else if (lastSerial !== undefined && lastSerial !== state.shotSerial)
        fireTime = 0;
      lastSerial = state.shotSerial;
      let move = moving ? (state.running ? "Running" : "Walking") : "Idle_3";
      if (state.jumping) {
        move = "Regular_Jump";
        jumpTime += dt;
      } else jumpTime = 0;
      lower.play(
        move,
        dt,
        state.jumping ? Math.min(0.999, jumpTime / 0.8) : undefined,
      );
      const selected = combatClip(tool, state, fireTime);
      upper.play(selected.name, 0, selected.progress);
      fireTime += dt;
      root.userData.playerClip = move;
      root.userData.combatClip = selected.name;
    },
  };
}

/** Full cached player for the inventory paper doll; independent bones, shared immutable art. */
export function createInventoryPlayer() {
  const root = asset ? clone(asset.root) : createSurvivor("base").root;
  const mixer = asset ? new THREE.AnimationMixer(root) : undefined;
  const idle = asset?.clips.find((c) => c.name === "Idle_3");
  if (idle) mixer!.clipAction(idle).play();
  return { root, update: (dt: number) => mixer?.update(dt) };
}
