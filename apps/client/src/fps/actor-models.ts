import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
const black = new THREE.MeshStandardMaterial({
  color: 0x171b1d,
  roughness: 0.38,
});
const sole = new THREE.MeshStandardMaterial({
  color: 0x292f31,
  roughness: 0.7,
});
const steel = new THREE.MeshStandardMaterial({
  color: 0x59646a,
  metalness: 0.65,
  roughness: 0.36,
});
const darkSteel = new THREE.MeshStandardMaterial({
  color: 0x29343a,
  metalness: 0.55,
  roughness: 0.45,
});
const grip = new THREE.MeshStandardMaterial({
  color: 0x242a2b,
  roughness: 0.88,
});
const detail = new THREE.MeshStandardMaterial({
  color: 0xa6afb0,
  metalness: 0.6,
  roughness: 0.3,
});
const sight = new THREE.MeshStandardMaterial({
  color: 0xded8aa,
  roughness: 0.6,
});
function cube(
  g: THREE.Group,
  name: string,
  p: number[],
  size: number[],
  mat: THREE.Material,
  radius = 0.004,
) {
  const m = new THREE.Mesh(
    new RoundedBoxGeometry(
      size[0],
      size[1],
      size[2],
      1,
      Math.min(radius, ...size.map((n) => n / 3)),
    ),
    mat,
  );
  m.name = name;
  m.position.fromArray(p);
  g.add(m);
  return m;
}
function ball(
  g: THREE.Group,
  name: string,
  p: number[],
  r: number,
  scale = [1, 1, 1],
  mat = black,
) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 6), mat);
  m.name = name;
  m.position.fromArray(p);
  m.scale.fromArray(scale);
  g.add(m);
  return m;
}
function limb(
  g: THREE.Group,
  name: string,
  a: number[],
  b: number[],
  r: number,
  mat = black,
) {
  const from = new THREE.Vector3().fromArray(a),
    to = new THREE.Vector3().fromArray(b),
    delta = to.clone().sub(from);
  const m = new THREE.Mesh(
    new THREE.CapsuleGeometry(r, Math.max(0.001, delta.length()), 3, 8),
    mat,
  );
  m.position.copy(from.add(to).multiplyScalar(0.5));
  m.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    delta.normalize(),
  );
  m.name = name;
  g.add(m);
  return m;
}
// Bake fixed parts by material, retaining separate movable slide and limb groups.
function batch(g: THREE.Group) {
  const groups = new Map<THREE.Material, THREE.BufferGeometry[]>();
  g.updateMatrixWorld(true);
  for (const child of [...g.children]) {
    if (!(child instanceof THREE.Mesh)) continue;
    child.updateMatrix();
    const transformed = child.geometry.clone().applyMatrix4(child.matrix);
    const geometry = transformed.index
      ? transformed.toNonIndexed()
      : transformed;
    const mat = child.material as THREE.Material;
    if (!groups.has(mat)) groups.set(mat, []);
    groups.get(mat)!.push(geometry);
    g.remove(child);
    child.geometry.dispose();
  }
  for (const [mat, geometries] of groups) {
    const geometry = mergeGeometries(geometries)!;
    geometries.forEach((g) => g.dispose());
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.name = g.name + "-surface";
    g.add(mesh);
  }
}
export function createPistol() {
  const root = new THREE.Group();
  root.name = "street-pistol";
  const frame = new THREE.Group();
  frame.name = "pistol-frame";
  root.add(frame);
  cube(
    frame,
    "frame",
    [0, -0.025, -0.045],
    [0.034, 0.035, 0.19],
    darkSteel,
    0.007,
  );
  const handle = cube(
    frame,
    "rubber-grip",
    [0, -0.082, 0.026],
    [0.034, 0.105, 0.047],
    grip,
    0.008,
  );
  handle.rotation.x = -0.18;
  cube(
    frame,
    "magazine-base",
    [0, -0.136, 0.035],
    [0.04, 0.011, 0.051],
    darkSteel,
  );
  // A front strut and lower rail leave the trigger opening visible from either side.
  cube(
    frame,
    "trigger-guard-front",
    [0, -0.065, -0.066],
    [0.032, 0.043, 0.006],
    darkSteel,
  );
  cube(
    frame,
    "guard-base",
    [0, -0.087, -0.035],
    [0.032, 0.006, 0.066],
    darkSteel,
  );
  const trigger = cube(
    frame,
    "trigger",
    [0, -0.055, -0.031],
    [0.009, 0.027, 0.012],
    detail,
  );
  trigger.rotation.x = -0.3;
  for (const y of [-0.06, -0.075, -0.09, -0.105]) {
    const z = 0.026 + 0.0245 * Math.cos(-0.18) + (y + 0.082) * Math.sin(-0.18);
    const rib = cube(
      frame,
      "grip-rib",
      [0, y, z],
      [0.035, 0.003, 0.003],
      sole,
      0.001,
    );
    rib.rotation.x = -0.18;
  }
  cube(
    frame,
    "slide-release",
    [-0.021, -0.014, 0.008],
    [0.005, 0.008, 0.025],
    detail,
    0.002,
  );
  const slide = new THREE.Group();
  slide.name = "pistol-slide";
  root.add(slide);
  cube(slide, "slide", [0, 0.008, -0.047], [0.042, 0.037, 0.218], steel, 0.006);
  cube(
    slide,
    "ejection-port",
    [0.021, 0.018, -0.025],
    [0.002, 0.014, 0.041],
    darkSteel,
    0.001,
  );
  cube(
    slide,
    "rear-sight",
    [0, 0.032, 0.042],
    [0.038, 0.012, 0.012],
    darkSteel,
    0.002,
  );
  for (const x of [-0.011, 0.011])
    cube(
      slide,
      "rear-sight-dot",
      [x, 0.034, 0.05],
      [0.004, 0.004, 0.002],
      sight,
      0.001,
    );
  cube(
    slide,
    "front-sight",
    [0, 0.033, -0.136],
    [0.006, 0.012, 0.011],
    sight,
    0.002,
  );
  for (const x of [-0.022, 0.022])
    for (let z = 0.006; z <= 0.045; z += 0.009)
      cube(
        slide,
        "slide-serration",
        [x, 0.009, z],
        [0.002, 0.023, 0.003],
        darkSteel,
        0.001,
      );
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.011, 0.11, 12),
    darkSteel,
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.004, -0.117);
  barrel.name = "barrel";
  frame.add(barrel);
  const bore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0065, 0.0065, 0.002, 12),
    black,
  );
  bore.rotation.x = Math.PI / 2;
  bore.position.set(0, 0.004, -0.173);
  bore.name = "muzzle-bore";
  frame.add(bore);
  batch(frame);
  batch(slide);
  const muzzle = new THREE.Object3D();
  muzzle.name = "muzzle";
  muzzle.position.set(0, 0.004, -0.176);
  root.add(muzzle);
  return { root, slide, muzzle };
}
export function createStickPlayer() {
  const root = new THREE.Group();
  root.name = "black-stick-player";
  const torso = new THREE.Group();
  torso.name = "torso";
  root.add(torso);
  limb(torso, "spine", [0, 0.87, 0], [0, 1.36, 0], 0.115);
  ball(torso, "shoulders", [0, 1.29, 0], 0.145, [1.55, 0.6, 0.85]);
  limb(torso, "neck", [0, 1.37, 0], [0, 1.49, 0], 0.058);
  ball(torso, "hips", [0, 0.89, 0], 0.105, [1.45, 0.85, 1]);
  batch(torso);
  const head = new THREE.Group();
  head.name = "head";
  root.add(head);
  ball(head, "round-head", [0, 1.65, 0], 0.215, [1, 1.08, 0.95]);
  batch(head);
  const legs: THREE.Group[] = [];
  const arms: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.name = side < 0 ? "left-leg" : "right-leg";
    leg.position.set(side * 0.105, 0.87, 0);
    root.add(leg);
    legs.push(leg);
    limb(leg, "thigh", [0, 0, 0], [side * 0.022, -0.39, 0.018], 0.065);
    limb(
      leg,
      "shin",
      [side * 0.022, -0.39, 0.018],
      [side * 0.03, -0.74, 0],
      0.055,
    );
    ball(
      leg,
      "foot",
      [side * 0.03, -0.805, -0.055],
      0.075,
      [1, 0.65, 1.65],
      sole,
    );
    batch(leg);
    const arm = new THREE.Group();
    arm.name = side < 0 ? "left-arm" : "right-arm";
    arm.position.set(side * 0.205, 1.29, 0);
    root.add(arm);
    arms.push(arm);
    limb(arm, "upper-arm", [0, 0, 0], [side * 0.085, -0.26, 0.018], 0.048);
    limb(
      arm,
      "forearm",
      [side * 0.085, -0.26, 0.018],
      [side * 0.035, -0.49, -0.018],
      0.043,
    );
    ball(arm, "hand", [side * 0.035, -0.51, -0.018], 0.056, [0.8, 1.1, 0.9]);
    batch(arm);
  }
  const handSocket = new THREE.Object3D();
  handSocket.name = "right-hand-socket";
  handSocket.position.set(0.24, 0.755, -0.018);
  handSocket.rotation.x = -Math.PI / 2;
  root.add(handSocket);
  return { root, head, torso, legs, arms, handSocket };
}
export function createFirstPersonRig() {
  const root = new THREE.Group();
  root.name = "first-person-rig";
  const gun = createPistol();
  gun.root.position.set(0.18, -0.19, -0.48);
  root.add(gun.root);
  const hands = new THREE.Group();
  hands.name = "relaxed-hands";
  root.add(hands);
  for (const side of [-1, 1]) {
    limb(
      hands,
      "rounded-forearm",
      [side * 0.29, -0.43, -0.22],
      [side * 0.22, -0.31, -0.48],
      0.038,
    );
    ball(
      hands,
      "closed-hand",
      [side * 0.22, -0.29, -0.51],
      0.045,
      [0.85, 0.9, 1.2],
    );
    for (let i = 0; i < 3; i++)
      limb(
        hands,
        "curled-finger",
        [side * 0.22 + (i - 1) * 0.014, -0.275, -0.528],
        [side * 0.22 + (i - 1) * 0.014, -0.3, -0.55],
        0.009,
      );
  }
  batch(hands);
  const armed = new THREE.Group();
  armed.name = "pistol-hands";
  root.add(armed);
  limb(
    armed,
    "right-forearm",
    [0.29, -0.43, -0.2],
    [0.18, -0.29, -0.43],
    0.038,
  );
  ball(armed, "right-palm", [0.18, -0.265, -0.445], 0.041, [0.9, 1.05, 0.7]);
  for (let i = 0; i < 3; i++)
    limb(
      armed,
      "gripping-finger",
      [0.158, -0.24 - i * 0.015, -0.455],
      [0.202, -0.24 - i * 0.015, -0.464],
      0.009,
    );
  // The support hand cups the gripping hand, clear of the trigger and barrel.
  limb(
    armed,
    "left-forearm",
    [-0.26, -0.43, -0.2],
    [0.12, -0.29, -0.43],
    0.036,
  );
  ball(armed, "support-palm", [0.135, -0.27, -0.458], 0.038, [0.8, 0.85, 0.8]);
  limb(
    armed,
    "support-thumb",
    [0.132, -0.245, -0.459],
    [0.15, -0.226, -0.47],
    0.011,
  );
  batch(armed);
  const flash = new THREE.Mesh(
    new THREE.ConeGeometry(0.035, 0.12, 5),
    new THREE.MeshBasicMaterial({ color: 0xffda83 }),
  );
  flash.name = "muzzle-flash";
  flash.rotation.x = -Math.PI / 2;
  flash.position.z = -0.035;
  gun.muzzle.add(flash);
  flash.visible = false;
  function equip(pistol: boolean) {
    gun.root.visible = armed.visible = pistol;
    hands.visible = !pistol;
  }
  function animate(time: number, moving: boolean, recoil: number) {
    root.position.y = moving
      ? Math.sin(time * 9) * 0.008
      : Math.sin(time * 1.7) * 0.002;
    root.position.x = moving ? Math.cos(time * 4.5) * 0.006 : 0;
    gun.root.position.z = -0.48 + recoil * 0.025;
    gun.root.rotation.x = recoil * 0.13;
    gun.slide.position.z = recoil * 0.022;
    armed.position.z = recoil * 0.018;
    armed.rotation.x = recoil * 0.035;
  }
  function setAspect(aspect: number) {
    const offset = aspect < 0.8 ? -0.085 : 0;
    gun.root.position.x = 0.18 + offset;
    armed.position.x = offset;
  }
  equip(false);
  return { root, gun, flash, equip, animate, setAspect };
}
