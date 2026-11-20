import { createNpcHitbox, loadNpcImage } from "./npc-image";
import { createNpc, NPC_KINDS } from "./npc-models";
import { createSurvivor } from "./survivor-models";
import { createBuildingModel } from "./building-models";
import {
  doorAngles,
  doorTargets,
  doorPosition,
  animateDoors,
  toggleDoor,
  containingBuilding,
  resetDoors,
} from "./building-layout";
import { WEAPONS, canShoot, type WeaponKind, type Tool } from "./weapons";
import {
  newEnemy,
  updateEnemy,
  damageEnemy,
  segmentHitsPlayer,
  ENEMY_TYPES,
} from "./enemy";
import { createFirstPersonRig, createWeapon } from "./actor-models";
import { openActorPreview } from "./actor-preview";
import * as THREE from "three";
import {
  BUILDINGS,
  LOOT,
  TREES,
  ROAD,
  START,
  MAP_SIZE,
  BUILD_LIMIT,
  COST,
  riverX,
  roadDistance,
  inTown,
  movePlayer,
  snapPiece,
  placementReason,
  canRemove,
  readSave,
  type Piece,
  type PieceKind,
} from "./world";
import "./style.css";
const $ = <T extends HTMLElement = HTMLElement>(q: string) =>
  document.querySelector<T>(q)!;
$("#app").innerHTML = `
<canvas id="world" aria-label="Street Survival first-person 3D world"></canvas>
<div id="hud" hidden>
  <header><div class="brand">STREET<span>SURVIVAL</span><small>FIRST-PERSON · SMALL WORLD</small></div><div class="location"><b id="zone">THE BLOCK</b><span id="coordinates"></span></div><button id="pause-button" aria-label="Pause game">||</button></header>
  <div id="damage-flash" aria-hidden="true"></div><div id="enemy-status"></div><div id="scope-overlay" hidden aria-hidden="true"></div><div id="crosshair" aria-hidden="true">+</div><div id="toast" role="status" aria-live="polite"></div>
  <div id="hint"><b id="hint-title"></b><span id="hint-text"></span></div>
  <div id="build-panel" hidden><div class="panel-heading"><b>BUILD YOUR PLACE</b><span id="budget"></span></div><div id="pieces">${(["floor", "wall", "doorway", "storage"] as PieceKind[]).map((k, i) => `<button data-piece="${k}"><small>0${i + 1}</small><b>${k}</b><span>${COST[k]} wood</span></button>`).join("")}</div><p id="placement"></p><div class="build-actions"><button id="rotate">↻ Rotate</button><button id="remove">Dismantle</button><button id="place">Place piece</button></div></div>
  <div id="mobile-controls"><div id="joystick" aria-label="Movement joystick"><div id="stick"></div><span>MOVE</span></div><div class="mobile-actions"><button id="aim">AIM</button><button id="run" aria-label="Toggle sprint">RUN</button><button id="interact">USE</button><button id="jump">JUMP</button><button id="fire">FIRE</button></div><span id="look-help">DRAG RIGHT SIDE TO LOOK</span></div>
  <footer><div class="status"><span class="dot"></span><b id="health">HEALTH 100</b><span id="wood"></span></div><div class="tools"><button id="hand-tool" class="selected">1 <b>HANDS</b></button><button id="pistol-tool">2 <b>PISTOL</b></button><button id="smg-tool">3 <b>SMG</b></button><button id="rifle-tool">4 <b>RIFLE</b></button><button id="sniper-tool">5 <b>SNIPER</b></button><button id="build-tool">B <b>BUILD</b></button></div><div class="save-status">LOCAL PROTOTYPE <span id="fps"></span></div></footer>
</div>
<div id="menu" class="overlay"><div class="menu-card"><span class="eyebrow">A NEW PERSPECTIVE</span><h1>STREET<br><em>SURVIVAL</em></h1><p>A small town. Open country.<br>A fresh start in first person.</p><div class="menu-tags"><span>128 × 128 m</span><span>3D WORLD</span><span>10,000 WOOD</span></div><button id="start" class="primary">ENTER THE BLOCK <span>↗</span></button><p class="controls desktop-copy">WASD move · Mouse look · Shift run · Space jump<br>E search · 1–5 equip · Q / right mouse aim<br>B build · 1–4 pieces · R rotate · Del remove · Esc pause</p><p class="controls touch-copy">Left thumb to move. Drag the right side to look.<br>Use the buttons to search, build, and equip.</p><p class="controls encounter-guide">TEST ENEMIES · Lookout: southwest · Police: northwest · SWAT: northeast</p><small class="save-note">Single-player prototype · Building saves on this device.<br>Your previous online characters and world are preserved separately.</small><button id="view-models">VIEW PLAYER & WEAPONS</button><button id="reset">Reset local prototype</button></div></div>
<div id="defeated" class="overlay" hidden><div class="menu-card"><h2>YOU WERE SHOT DOWN</h2><p>Your buildings and wood are safe.</p><button id="respawn" class="primary">RESPAWN AT THE BLOCK</button></div></div><div id="unavailable" class="overlay" hidden><div class="menu-card"><h2>3D graphics unavailable</h2><p>This browser couldn’t start WebGL. Try an updated browser with hardware acceleration enabled.</p></div></div>`;
const touch =
  matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
document.body.classList.toggle("touch", touch);
const SAVE_KEY = "street-survival:3d-prototype:v1";
let save = readSave(null),
  saveAvailable = true;
try {
  save = readSave(localStorage.getItem(SAVE_KEY));
} catch {
  saveAvailable = false;
}
function persist() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    saveAvailable = false;
    toast("Device storage unavailable · progress lasts for this session");
  }
}
function toast(message: string) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3200);
}
let toastTimer: ReturnType<typeof setTimeout>;
const canvas = $<HTMLCanvasElement>("#world");
let renderer: THREE.WebGLRenderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  });
} catch {
  $("#unavailable").hidden = false;
  $("#menu").hidden = true;
  throw Error("WebGL could not initialize");
}
renderer.setPixelRatio(Math.min(devicePixelRatio, touch ? 1.25 : 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb7d8db);
scene.fog = new THREE.Fog(0xb7d8db, 48, 115);
const camera = new THREE.PerspectiveCamera(
  72,
  innerWidth / innerHeight,
  0.07,
  135,
);
camera.rotation.order = "YXZ";
scene.add(camera);
scene.add(new THREE.HemisphereLight(0xe8f6ff, 0x809166, 2.5));
const sun = new THREE.DirectionalLight(0xffe4bb, 2.6);
sun.position.set(-30, 55, 20);
scene.add(sun);
const materials = new Map<number, THREE.MeshStandardMaterial>();
const material = (color: number) => {
  if (!materials.has(color))
    materials.set(
      color,
      new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0 }),
    );
  return materials.get(color)!;
};
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
function box(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: number,
) {
  const mesh = new THREE.Mesh(boxGeo, material(color));
  mesh.position.set(x, y, z);
  mesh.scale.set(w, h, d);
  parent.add(mesh);
  return mesh;
}
function cylinder(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  r: number,
  h: number,
  color: number,
  sides = 7,
) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, h, sides),
    material(color),
  );
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}
function sign(
  text: string,
  w: number,
  h: number,
  color = "#f5e8cb",
  background = "#314942",
) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = "#b8aa7c";
  ctx.lineWidth = 7;
  ctx.strokeRect(5, 5, 502, 118);
  ctx.fillStyle = color;
  ctx.font = "bold 44px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 67, 470);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: texture }),
  );
}
// All terrain shares a single lightweight mesh; scenery uses simple original 3D geometry.
box(scene, 0, -0.35, 0, 128, 0.6, 128, 0x7f995c);
const water = new THREE.Mesh(
  new THREE.PlaneGeometry(13, 150),
  material(0x5eabba),
);
water.rotation.x = -Math.PI / 2;
water.position.set(48, -0.035, 0);
scene.add(water);
// River banks follow a gentle curve, rather than a rectangular water strip.
const waterShape = new THREE.Shape();
for (let i = 0; i <= 64; i++) {
  const z = -64 + i * 2,
    x = riverX(z) - 3.3;
  if (i) waterShape.lineTo(x, -z);
  else waterShape.moveTo(x, -z);
}
for (let i = 64; i >= 0; i--) {
  const z = -64 + i * 2;
  waterShape.lineTo(riverX(z) + 3.3, -z);
}
waterShape.closePath();
scene.remove(water);
water.geometry.dispose();
const river = new THREE.Mesh(
  new THREE.ShapeGeometry(waterShape),
  material(0x5eabba),
);
river.rotation.x = -Math.PI / 2;
river.position.y = 0.015;
scene.add(river);
function ribbon(
  points: readonly { x: number; z: number }[],
  width: number,
  y: number,
  color: number,
) {
  const vertices: number[] = [],
    indices: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const before = points[Math.max(0, i - 1)],
      after = points[Math.min(points.length - 1, i + 1)],
      dx = after.x - before.x,
      dz = after.z - before.z,
      len = Math.hypot(dx, dz),
      nx = ((-dz / len) * width) / 2,
      nz = ((dx / len) * width) / 2;
    vertices.push(
      points[i].x + nx,
      y,
      points[i].z + nz,
      points[i].x - nx,
      y,
      points[i].z - nz,
    );
    if (i < points.length - 1) {
      const n = i * 2;
      indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  scene.add(new THREE.Mesh(geo, material(color)));
}
ribbon(ROAD, 9, 0.035, 0xbfc0aa);
ribbon(ROAD, 6, 0.055, 0x515c60);
for (let i = 1; i < ROAD.length; i++) {
  const a = ROAD[i - 1],
    b = ROAD[i],
    d = Math.hypot(b.x - a.x, b.z - a.z),
    angle = -Math.atan2(b.z - a.z, b.x - a.x);
  for (let t = 1; t < d; t += 4) {
    const mark = box(
      scene,
      a.x + ((b.x - a.x) * t) / d,
      0.067,
      a.z + ((b.z - a.z) * t) / d,
      1.8,
      0.018,
      0.09,
      0xdcd5b0,
    );
    mark.rotation.y = angle;
  }
}
// Bridge has a continuous road deck with visible rails on both sides.
box(scene, 47, 0.05, 7, 13, 0.12, 6, 0x656d6a);
for (const z of [3.8, 10.2]) {
  box(scene, 47, 0.8, z, 13, 0.15, 0.12, 0xd8d4bb);
  for (let x = 41; x <= 53; x += 2)
    box(scene, x, 0.42, z, 0.15, 0.85, 0.15, 0x8b9791);
}
const buildingModels = BUILDINGS.map((b, index) => {
  const model = createBuildingModel(index, boxGeo, sign);
  model.root.position.set(b.x, 0, b.z);
  scene.add(model.root);
  return model;
});
// Soft painted contact shadows, batched with all tree trunks and crowns.
const contactCanvas = document.createElement("canvas");
contactCanvas.width = contactCanvas.height = 64;
const contactCtx = contactCanvas.getContext("2d")!,
  fade = contactCtx.createRadialGradient(32, 32, 8, 32, 32, 32);
fade.addColorStop(0, "#fff8");
fade.addColorStop(1, "#fff0");
contactCtx.fillStyle = fade;
contactCtx.fillRect(0, 0, 64, 64);
const contacts = [
  ...TREES.map((t) => ({ x: t.x, z: t.z, width: 4, depth: 4 })),
  ...BUILDINGS.map((b) => ({ ...b, width: b.width + 3, depth: b.depth + 3 })),
];
const shadow = new THREE.InstancedMesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({
    color: 0x233f31,
    map: new THREE.CanvasTexture(contactCanvas),
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  }),
  contacts.length,
);
const shadowDummy = new THREE.Object3D();
shadowDummy.rotation.x = -Math.PI / 2;
contacts.forEach((p, i) => {
  shadowDummy.position.set(p.x, 0.025, p.z);
  shadowDummy.scale.set(p.width, p.depth, 1);
  shadowDummy.updateMatrix();
  shadow.setMatrixAt(i, shadowDummy.matrix);
});
scene.add(shadow);
const trunks = new THREE.InstancedMesh(
  new THREE.CylinderGeometry(0.24, 0.32, 2.4, 6),
  material(0x786550),
  TREES.length,
);
const crowns = new THREE.InstancedMesh(
  new THREE.IcosahedronGeometry(1.75, 0),
  material(0x4d7950),
  TREES.length * 2,
);
const dummy = new THREE.Object3D();
TREES.forEach((t, i) => {
  dummy.position.set(t.x, 1.2 * t.scale, t.z);
  dummy.scale.setScalar(t.scale);
  dummy.updateMatrix();
  trunks.setMatrixAt(i, dummy.matrix);
  dummy.position.y = 3.3 * t.scale;
  dummy.scale.set(1.1 * t.scale, 1.2 * t.scale, t.scale);
  dummy.updateMatrix();
  crowns.setMatrixAt(i * 2, dummy.matrix);
  dummy.position.set(t.x + 0.6 * t.scale, 4.5 * t.scale, t.z);
  dummy.scale.setScalar(t.scale);
  dummy.updateMatrix();
  crowns.setMatrixAt(i * 2 + 1, dummy.matrix);
});
scene.add(trunks, crowns);
const rocks = new THREE.InstancedMesh(
  new THREE.IcosahedronGeometry(1, 0),
  material(0x92978b),
  38,
);
for (let i = 0; i < 38; i++) {
  const side = i % 4,
    t = (i / 38) * 128 - 64;
  dummy.position.set(
    side === 0 ? -63 : side === 1 ? 63 : t,
    1.2,
    side === 2 ? -63 : side === 3 ? 63 : t,
  );
  dummy.scale.set(2.8 + (i % 3), 2 + (i % 4), 3.3);
  dummy.rotation.set(0.2 * i, 0.6 * i, 0);
  dummy.updateMatrix();
  rocks.setMatrixAt(i, dummy.matrix);
}
scene.add(rocks);
// Street furniture makes the little settlement readable without oversized sprites.
for (const [x, z] of [
  [-27, 8],
  [29, 2],
  [-9, -5],
  [10, 7],
]) {
  cylinder(scene, x, 2.2, z, 0.09, 4.4, 0x56655d);
  box(scene, x + 0.5, 4.45, z, 1.15, 0.12, 0.15, 0x56655d);
  box(scene, x + 1, 4.3, z, 0.5, 0.16, 0.3, 0xe5dfb8);
}
for (const x of [-3, 9]) {
  box(scene, x, 0.55, -3.8, 2, 0.15, 0.6, 0x8f7557);
  for (const dx of [-0.7, 0.7])
    box(scene, x + dx, 0.25, -3.8, 0.1, 0.55, 0.5, 0x56655d);
}
const lootMeshes: THREE.Group[] = [];
LOOT.forEach((c, index) => {
  const g = new THREE.Group();
  g.position.set(c.x, 0, c.z);
  g.userData.loot = index;
  scene.add(g);
  lootMeshes.push(g);
  box(g, 0, c.height / 2, 0, c.width, c.height, c.depth, c.color);
  box(
    g,
    0,
    c.height + 0.035,
    0,
    c.width + 0.07,
    0.09,
    c.depth + 0.07,
    0x344d4b,
  );
  for (const x of [-c.width * 0.32, c.width * 0.32])
    box(
      g,
      x,
      c.height / 2,
      c.depth / 2 + 0.018,
      0.07,
      c.height,
      0.04,
      0xc7c5a6,
    );
  const badge = sign(
    "T" + c.tier + " · SUPPLIES",
    Math.min(c.width, 0.9),
    0.22,
    "#fff5c5",
    "#3c615b",
  );
  badge.position.set(0, c.height * 0.65, c.depth / 2 + 0.045);
  g.add(badge);
});
const heading = sign("THE BLOCK  /  COUNTRYSIDE →", 7, 0.8);
heading.position.set(0, 3.2, 26);
heading.rotation.y = Math.PI;
scene.add(heading);
for (const x of [-3, 3]) box(scene, x, 1.5, 26, 0.1, 3, 0.1, 0x6b796a);
const shotObstacles: THREE.Object3D[] = [
  trunks,
  crowns,
  rocks,
  ...buildingModels.map((m) => m.root),
];
// A simple target range supports testing the visible pistol and shot feedback.
const targets: THREE.Object3D[] = [];
for (const x of [-7, -3, 1]) {
  cylinder(scene, x, 1.1, 36, 0.06, 2.2, 0x7d725b);
  const target = cylinder(scene, x, 2, 36, 0.55, 0.12, 0xc7b99a, 16);
  target.rotation.x = Math.PI / 2;
  target.userData.target = true;
  targets.push(target);
  const bull = cylinder(scene, x, 2, 35.92, 0.18, 0.025, 0xb4674f, 12);
  bull.rotation.x = Math.PI / 2;
}
// Batch static box geometry by material to keep phone draw calls low.
scene.updateMatrixWorld(true);
const batches = new Map<
  string,
  { mat: THREE.Material; meshes: THREE.Mesh[]; building?: number }
>();
const interiorBatches: { building: number; mesh: THREE.InstancedMesh }[] = [];
scene.traverse((o) => {
  if (
    !(o instanceof THREE.Mesh) ||
    o.geometry !== boxGeo ||
    o.userData.dynamicDoor
  )
    return;
  const mat = o.material as THREE.Material,
    building = o.userData.interiorBuilding as number | undefined,
    key = mat.uuid + ":" + (building ?? "world");
  if (!batches.has(key)) batches.set(key, { mat, meshes: [], building });
  batches.get(key)!.meshes.push(o);
});
for (const { mat, meshes, building } of batches.values()) {
  const batch = new THREE.InstancedMesh(boxGeo, mat, meshes.length);
  meshes.forEach((mesh, i) => {
    batch.setMatrixAt(i, mesh.matrixWorld);
    mesh.removeFromParent();
  });
  scene.add(batch);
  shotObstacles.push(batch);
  if (building !== undefined) {
    batch.computeBoundingBox();
    interiorBatches.push({ building, mesh: batch });
  }
}
const construction = new THREE.Group();
scene.add(construction);
function pieceModel(p: Omit<Piece, "id">, preview = false) {
  const g = new THREE.Group();
  g.position.set(p.x, 0, p.z);
  g.rotation.y = (p.rotation * Math.PI) / 2;
  if (p.kind === "floor") {
    box(g, 0, 0.09, 0, 2, 0.18, 2, 0xb3a17c);
    for (const x of [-0.65, 0, 0.65])
      box(g, x, 0.185, 0, 0.025, 0.012, 1.96, 0x85785e);
  }
  if (p.kind === "wall") {
    box(g, 0, 1.4, 0, 2, 2.5, 0.16, 0xc6b38b);
    for (const x of [-0.9, 0, 0.9])
      box(g, x, 1.4, 0.1, 0.08, 2.5, 0.06, 0x8d795c);
  }
  if (p.kind === "doorway") {
    for (const x of [-0.78, 0.78]) box(g, x, 1.4, 0, 0.44, 2.5, 0.16, 0xc6b38b);
    box(g, 0, 2.45, 0, 2, 0.4, 0.16, 0x9c8664);
  }
  if (p.kind === "storage") {
    box(g, 0, 0.6, 0, 1, 0.8, 0.8, 0x97754c);
    box(g, 0, 1.02, 0, 1.05, 0.08, 0.85, 0x675844);
    for (const x of [-0.32, 0.32])
      box(g, x, 0.6, 0.42, 0.08, 0.8, 0.05, 0xcfb78b);
  }
  if (preview)
    g.traverse((o) => {
      if (o instanceof THREE.Mesh) o.material = previewMaterial;
    });
  return g;
}
function rebuildConstruction() {
  for (const batch of [...construction.children]) {
    construction.remove(batch);
    if (batch instanceof THREE.InstancedMesh) batch.dispose();
  }
  const groups = new Map<
    THREE.Material,
    { matrix: THREE.Matrix4; id: string }[]
  >();
  for (const p of save.pieces) {
    const model = pieceModel(p);
    model.updateMatrixWorld(true);
    model.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const mat = o.material as THREE.Material;
      if (!groups.has(mat)) groups.set(mat, []);
      groups.get(mat)!.push({ matrix: o.matrixWorld.clone(), id: p.id });
    });
  }
  for (const [mat, parts] of groups) {
    const batch = new THREE.InstancedMesh(boxGeo, mat, parts.length);
    parts.forEach((part, i) => batch.setMatrixAt(i, part.matrix));
    batch.userData.pieceIds = parts.map((part) => part.id);
    construction.add(batch);
  }
  construction.updateMatrixWorld(true);
}
rebuildConstruction();
const previewMaterial = new THREE.MeshBasicMaterial({
  color: 0x99dcba,
  transparent: true,
  opacity: 0.52,
  depthWrite: false,
});
let preview: THREE.Group | undefined,
  selected: PieceKind = "floor",
  rotation = 0,
  build = false,
  tool: Tool = "hands";
let candidate: Omit<Piece, "id"> | undefined,
  reason = "";
let player = { ...START },
  yaw = 0,
  pitch = -0.03,
  playing = false,
  vertical = 0,
  verticalSpeed = 0,
  run = false;
const keys = new Set<string>(),
  joystick = { x: 0, y: 0 };
let movePointer: number | undefined,
  lookPointer: number | undefined,
  lastLook = { x: 0, y: 0 };
const raycaster = new THREE.Raycaster(),
  ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
  hitPoint = new THREE.Vector3();
let viewModel = createFirstPersonRig();
const weaponRigs = new Map<WeaponKind, ReturnType<typeof createFirstPersonRig>>(
  [["pistol", viewModel]],
);
let aiming = false;
viewModel.setAspect(camera.aspect);
camera.add(viewModel.root);
const body = createSurvivor("base");
body.head.visible = false;
body.arms.forEach((arm) => (arm.visible = false));
scene.add(body.root);
let muzzle = viewModel.flash;
const muzzlePosition = new THREE.Vector3();
const enemies = NPC_KINDS.map((kind) => {
  const enemy = newEnemy(kind, save.pieces),
    actor = createNpc(kind, (text, w, h) =>
      sign(text, w, h, "#ffffff", "#202735"),
    ),
    weapon = createWeapon(kind === "swat" ? "rifle" : "pistol");
  actor.arms[1].rotation.x = 1;
  weapon.root.position.set(0.24, 1.07, -0.44);
  actor.root.add(weapon.root);
  scene.add(actor.root);
  actor.root.position.set(enemy.x, 0, enemy.z);
  const flash = new THREE.Mesh(
    new THREE.ConeGeometry(0.04, 0.13, 5),
    new THREE.MeshBasicMaterial({ color: 0xffa45d }),
  );
  flash.rotation.x = -Math.PI / 2;
  weapon.muzzle.add(flash);
  flash.visible = false;
  const aim = new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({
      color: 0xe8866a,
      transparent: true,
      opacity: 0.5,
    }),
  );
  scene.add(aim);
  aim.frustumCulled = false;
  aim.visible = false;
  const hitbox = createNpcHitbox();
  scene.add(hitbox);
  return {
    enemy,
    actor,
    weapon,
    flash,
    aim,
    hitbox,
    flashTime: 0,
    imageRig: undefined as Awaited<ReturnType<typeof loadNpcImage>> | undefined,
    imageLoading: false,
    retryImageAfter: 0,
  };
});
const enemy = enemies[0].enemy; // Retain the original easy-enemy read-only diagnostic.
const bulletGeometry = new THREE.SphereGeometry(0.045, 5, 3),
  bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffc176 });
const enemyBullets: {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  damage: number;
}[] = [];
const coverRay = new THREE.Raycaster();
let health = 100,
  damageFlash = 0,
  firePointer: number | undefined;
function coverDistance(from: THREE.Vector3, to: THREE.Vector3) {
  const direction = to.clone().sub(from),
    distance = direction.length();
  coverRay.set(from, direction.normalize());
  coverRay.far = distance;
  return (
    coverRay.intersectObjects(
      [...shotObstacles, ...construction.children],
      true,
    )[0]?.distance ?? Infinity
  );
}
function clearBullets() {
  for (const b of enemyBullets) scene.remove(b.mesh);
  enemyBullets.length = 0;
}
function respawn() {
  health = 100;
  player = { ...START };
  vertical = verticalSpeed = 0;
  for (const unit of enemies)
    Object.assign(unit.enemy, newEnemy(unit.enemy.kind, save.pieces));
  clearBullets();
  $("#defeated").hidden = true;
  updateHud();
  start();
}
$("#respawn").addEventListener("click", respawn);
function enemyFrame(dt: number) {
  for (const unit of enemies) {
    const {
      enemy,
      actor: enemyActor,
      weapon: enemyWeapon,
      flash: enemyFlash,
      aim: enemyAim,
    } = unit;
    const from = new THREE.Vector3(enemy.x, 1.4, enemy.z),
      to = new THREE.Vector3(player.x, 1.1 + vertical, player.z);
    const visible =
      Math.hypot(enemy.x - player.x, enemy.z - player.z) < 24 &&
      coverDistance(from, to) >= from.distanceTo(to) - 0.05;
    if (
      !unit.imageRig &&
      !unit.imageLoading &&
      clock > unit.retryImageAfter &&
      Math.hypot(enemy.x - player.x, enemy.z - player.z) < 38
    ) {
      unit.imageLoading = true;
      void loadNpcImage(enemy.kind)
        .then((model) => {
          enemyWeapon.root.removeFromParent();
          const oldMeshes: THREE.Mesh[] = [];
          enemyActor.root.traverse((o) => {
            if (o instanceof THREE.Mesh) oldMeshes.push(o);
          });
          for (const mesh of oldMeshes) {
            mesh.geometry.dispose();
            mesh.removeFromParent();
          }
          enemyActor.root.clear();
          enemyActor.root.add(model.root, enemyWeapon.root);
          unit.imageRig = model;
        })
        .catch(() => {
          unit.retryImageAfter = clock + 10;
        })
        .finally(() => {
          unit.imageLoading = false;
        });
    }
    const shot = updateEnemy(enemy, player, save.pieces, dt, visible);
    enemyActor.root.visible =
      enemy.health > 0 &&
      Math.hypot(enemy.x - player.x, enemy.z - player.z) < 38;
    enemyActor.root.position.set(enemy.x, 0, enemy.z);
    enemyActor.root.rotation.y = enemy.yaw;
    const moving =
      enemy.state === "chase" &&
      Math.hypot(enemy.x - player.x, enemy.z - player.z) > 11;
    if (unit.imageRig) unit.imageRig.animate(moving, dt);
    else {
      enemyActor.legs[0].rotation.x = moving ? Math.sin(clock * 8) * 0.3 : 0;
      enemyActor.legs[1].rotation.x = -enemyActor.legs[0].rotation.x;
    }
    unit.hitbox.position.set(enemy.x, 0, enemy.z);
    unit.hitbox.rotation.y = enemy.yaw;
    unit.hitbox.updateMatrixWorld(true);
    enemyActor.root.updateMatrixWorld(true);
    const muzzlePoint = enemyWeapon.muzzle.getWorldPosition(
      new THREE.Vector3(),
    );
    enemyAim.visible = enemy.state === "aim";
    if (enemyAim.visible)
      enemyAim.geometry.setFromPoints([
        muzzlePoint,
        new THREE.Vector3(enemy.target.x, 1.05 + vertical, enemy.target.z),
      ]);
    if (shot) {
      const direction = new THREE.Vector3(shot.x, 1.1 + vertical, shot.z)
        .sub(muzzlePoint)
        .normalize();
      const mesh = new THREE.Mesh(bulletGeometry, bulletMaterial);
      mesh.position.copy(muzzlePoint);
      scene.add(mesh);
      enemyBullets.push({
        mesh,
        velocity: direction.multiplyScalar(18),
        life: 2,
        damage: ENEMY_TYPES[enemy.kind].damage,
      });
      unit.flashTime = 0.07;
    }
    enemyFlash.visible = unit.flashTime > 0;
    unit.flashTime = Math.max(0, unit.flashTime - dt);
  }
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i],
      a = b.mesh.position.clone(),
      end = a.clone().addScaledVector(b.velocity, dt);
    b.life -= dt;
    const blocked = coverDistance(a, end) <= a.distanceTo(end);
    if (!blocked && segmentHitsPlayer(a, end, player, vertical)) {
      health = Math.max(0, health - b.damage);
      damageFlash = 0.25;
      toast("Enemy hit you · find cover or keep moving");
      b.life = 0;
    }
    b.mesh.position.copy(end);
    if (blocked || b.life <= 0) {
      scene.remove(b.mesh);
      enemyBullets.splice(i, 1);
    }
  }
  damageFlash = Math.max(0, damageFlash - dt);
  const opacity = String(damageFlash > 0 ? 0.6 : 0);
  if ($("#damage-flash").style.opacity !== opacity)
    $("#damage-flash").style.opacity = opacity;
  const nearby = enemies
    .filter(
      (u) =>
        u.enemy.health > 0 &&
        Math.hypot(u.enemy.x - player.x, u.enemy.z - player.z) < 23,
    )
    .sort(
      (a, b) =>
        Number(b.enemy.state === "aim") - Number(a.enemy.state === "aim"),
    );
  const warning = nearby[0]?.enemy;
  const status = warning
    ? ENEMY_TYPES[warning.kind].name.toUpperCase() +
      (warning.state === "aim" ? " AIMING · MOVE OR FIND COVER" : " NEARBY")
    : "";
  if ($("#enemy-status").textContent !== status)
    $("#enemy-status").textContent = status;
  if (health <= 0) {
    pause();
    $("#menu").hidden = true;
    $("#defeated").hidden = false;
  }
}

const tracerGeometry = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(),
  new THREE.Vector3(),
]);
const tracer = new THREE.Line(
  tracerGeometry,
  new THREE.LineBasicMaterial({
    color: 0xffd897,
    transparent: true,
    opacity: 0.85,
  }),
);
scene.add(tracer);
tracer.frustumCulled = false;
tracer.visible = false;
let lastDiagnostics = -1000;
let needsRender = true;
let recoilRemaining = 0,
  flashRemaining = 0,
  shotSerial = 0;
let lastHitDoor = -1;
let lastShot = 0,
  clock = 0,
  lastHud = 0,
  lastFrame = performance.now(),
  frameCount = 0,
  fpsAt = performance.now(),
  fps = 0;
function toggleBuild() {
  build = !build;
  setAim(false);
  $("#build-panel").hidden = !build;
  $("#build-tool").classList.toggle("selected", build);
  if (preview) {
    scene.remove(preview);
    preview = undefined;
  }
  updateHud();
}
function setAim(value: boolean) {
  aiming = value && tool !== "hands" && !build;
  camera.fov = aiming && tool !== "hands" ? WEAPONS[tool].zoom : 72;
  camera.updateProjectionMatrix();
  $("#scope-overlay").hidden = !(aiming && tool === "sniper");
  $("#aim").classList.toggle("selected", aiming);
}
function equip(next: Tool) {
  if (build) toggleBuild();
  setAim(false);
  firePointer = undefined;
  $("#fire").classList.remove("held");
  viewModel.root.visible = false;
  if (next !== "hands") {
    let rig = weaponRigs.get(next);
    if (!rig) {
      rig = createFirstPersonRig(next);
      weaponRigs.set(next, rig);
      camera.add(rig.root);
    }
    viewModel = rig;
  }
  viewModel.root.visible = true;
  viewModel.setAspect(camera.aspect);
  viewModel.equip(next !== "hands");
  muzzle = viewModel.flash;
  recoilRemaining = flashRemaining = 0;
  tool = next;
  for (const name of ["hands", "pistol", "smg", "rifle", "sniper"])
    $("#" + (name === "hands" ? "hand" : name) + "-tool").classList.toggle(
      "selected",
      next === name,
    );
}
function resetInput() {
  setAim(false);
  keys.clear();
  firePointer = undefined;
  $("#fire").classList.remove("held");
  joystick.x = joystick.y = 0;
  movePointer = lookPointer = undefined;
  $("#stick").style.transform = "translate(-50%,-50%)";
}
function pause() {
  playing = false;
  resetInput();
  $("#menu").hidden = false;
  $("#start").innerHTML = "RESUME EXPLORING <span>↗</span>";
  if (document.pointerLockElement) document.exitPointerLock();
}
function start() {
  playing = true;
  $("#hud").hidden = false;
  $("#menu").hidden = true;
  lastFrame = performance.now();
  if (!touch) canvas.requestPointerLock?.();
  if (!saveAvailable)
    toast("Storage unavailable · progress lasts for this session");
  else toast("Explore the town. Build beyond the streets.");
}
$("#start").addEventListener("click", start);
$("#view-models").addEventListener("click", () => {
  pause();
  openActorPreview();
});
$("#pause-button").addEventListener("click", pause);
$("#reset").addEventListener("click", () => {
  if (
    !confirm(
      "Reset only this device’s 3D prototype, including its buildings? Your previous online game is not affected.",
    )
  )
    return;
  save = readSave(null);
  health = 100;
  resetDoors();
  for (const unit of enemies)
    Object.assign(unit.enemy, newEnemy(unit.enemy.kind, save.pieces));
  clearBullets();
  rebuildConstruction();
  player = { ...START };
  yaw = 0;
  pitch = -0.03;
  persist();
  updateHud();
  toast("Local prototype reset");
});
$("#build-tool").addEventListener("click", toggleBuild);
$("#hand-tool").addEventListener("click", () => equip("hands"));
$("#pistol-tool").addEventListener("click", () => equip("pistol"));
for (const kind of ["smg", "rifle", "sniper"] as WeaponKind[])
  $("#" + kind + "-tool").addEventListener("click", () => equip(kind));
$("#aim").addEventListener("click", () => setAim(!aiming));
for (const button of document.querySelectorAll<HTMLButtonElement>(
  "[data-piece]",
))
  button.addEventListener("click", () => {
    selected = button.dataset.piece as PieceKind;
    rebuildPreview();
    updateHud();
  });
function rebuildPreview() {
  if (preview) scene.remove(preview);
  preview = undefined;
}
$("#rotate").addEventListener("click", () => {
  rotation = (rotation + 1) % 4;
  rebuildPreview();
});
function place() {
  if (!playing || !build) return;
  updatePreview();
  if (!candidate) return;
  reason = placementReason(candidate, player, save.pieces, save.wood);
  if (reason) return toast(reason);
  const p = { ...candidate, id: crypto.randomUUID() };
  save.pieces.push(p);
  save.wood -= COST[p.kind];
  rebuildConstruction();
  persist();
  updateHud();
  toast(
    p.kind === "floor"
      ? "Floor placed · add walls along its edges"
      : `${p.kind === "doorway" ? "Doorway" : selected} placed`,
  );
}
function aimRay() {
  camera.rotation.set(pitch, yaw, 0);
  camera.updateMatrixWorld(true);
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
}
function aimedPiece() {
  aimRay();
  const hits = raycaster.intersectObjects(construction.children, true);
  const hit = hits.find((h) => h.distance < 8);
  return hit
    ? save.pieces.find(
        (p) => p.id === hit.object.userData.pieceIds[hit.instanceId!],
      )
    : undefined;
}
function remove() {
  if (!playing) return;
  const p = aimedPiece();
  if (!p) return toast("Aim at one of your pieces within 8 m");
  if (!canRemove(p, save.pieces))
    return toast("Remove attached walls and storage first");
  save.pieces = save.pieces.filter((s) => s.id !== p.id);
  rebuildConstruction();
  save.wood += COST[p.kind];
  persist();
  updateHud();
  toast("Piece removed · wood returned");
}
$("#place").addEventListener("click", place);
$("#remove").addEventListener("click", remove);
function nearestLoot() {
  let distance = 3.4,
    index = -1;
  LOOT.forEach((c, i) => {
    const d = Math.hypot(c.x - player.x, c.z - player.z);
    if (d < distance) {
      index = i;
      distance = d;
    }
  });
  return index;
}
function nearestDoor() {
  let nearest = -1,
    distance = 2.4;
  for (let i = 0; i < BUILDINGS.length; i++) {
    const p = doorPosition(i),
      d = Math.hypot(player.x - p.x, player.z - p.z);
    if (d >= distance) continue;
    const target = new THREE.Vector3(p.x, 1.3, p.z),
      from = new THREE.Vector3(player.x, 1.65 + vertical, player.z);
    coverRay.set(from, target.clone().sub(from).normalize());
    coverRay.far = from.distanceTo(target) + 0.15;
    const hit = coverRay.intersectObjects(
      [...shotObstacles, ...construction.children],
      true,
    )[0];
    if (
      hit &&
      hit.object.userData.doorIndex !== i &&
      hit.distance < from.distanceTo(target) - 0.1
    )
      continue;
    nearest = i;
    distance = d;
  }
  return nearest;
}
function interact() {
  if (!playing) return;
  const door = nearestDoor();
  if (door >= 0) {
    toggleDoor(door);
    updateHud();
    return toast(
      (doorTargets[door] ? "Opening " : "Closing ") +
        BUILDINGS[door].name +
        " door",
    );
  }
  const i = nearestLoot();
  if (i < 0) return toast("Move closer to a marked supply crate");
  if (save.opened.includes(i))
    return toast("This supply crate has been searched");
  const wood = 20 + LOOT[i].tier * 25;
  save.wood += wood;
  save.opened.push(i);
  persist();
  updateHud();
  toast(`T${LOOT[i].tier} supply crate · +${wood} wood`);
}
function jump() {
  if (playing && vertical === 0) verticalSpeed = 4.8;
}
function fire() {
  if (!playing || health <= 0) return;
  if (build) return place();
  if (tool === "hands")
    return toast("Equip a weapon with 2–5 or the weapon buttons");
  const weapon = WEAPONS[tool];
  const now = performance.now();
  if (!canShoot(tool, now, lastShot)) return;
  lastShot = now;
  recoilRemaining = 1;
  flashRemaining = 0.055;
  shotSerial++;
  muzzle.visible = true;
  aimRay();
  const hits = raycaster
    .intersectObjects(
      [
        ...targets,
        ...construction.children,
        ...lootMeshes,
        ...shotObstacles,
        ...enemies.filter((u) => u.enemy.health > 0).map((u) => u.hitbox),
      ],
      true,
    )
    .filter((hit) => hit.distance <= weapon.range);
  lastHitDoor = hits[0]?.object.userData.doorIndex ?? -1;
  const end =
    hits[0]?.point || raycaster.ray.at(weapon.range, new THREE.Vector3());
  viewModel.root.updateMatrixWorld(true);
  const start = viewModel.gun.muzzle.getWorldPosition(muzzlePosition);
  tracer.geometry.setFromPoints([start, end]);
  tracer.visible = true;
  const hitEnemy =
    hits[0] &&
    enemies.find(
      (u) => u.enemy.health > 0 && u.hitbox.getObjectById(hits[0].object.id),
    );
  if (hitEnemy) {
    const enemy = hitEnemy.enemy;
    damageEnemy(enemy, weapon.damage);
    toast(
      enemy.health <= 0
        ? "Enemy down"
        : "Enemy hit · " + enemy.health + " health",
    );
  } else if (hits[0]?.object.userData.target) toast("Target hit");
}
$("#interact").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  interact();
});
$("#interact").addEventListener("click", (e) => {
  if (e.detail === 0) interact();
});
$("#jump").addEventListener("click", jump);
const fireButton = $("#fire");
let fireLook = { x: 0, y: 0 };
fireButton.addEventListener("pointerdown", (e) => {
  if (!playing || firePointer !== undefined) return;
  e.preventDefault();
  firePointer = e.pointerId;
  fireLook = { x: e.clientX, y: e.clientY };
  fireButton.setPointerCapture(e.pointerId);
  fireButton.classList.add("held");
  fire();
});
fireButton.addEventListener("pointermove", (e) => {
  if (!touch || firePointer !== e.pointerId || !playing) return;
  yaw -= (e.clientX - fireLook.x) * 0.005 * (camera.fov / 72);
  pitch = THREE.MathUtils.clamp(
    pitch - (e.clientY - fireLook.y) * 0.005 * (camera.fov / 72),
    -1.35,
    1.35,
  );
  fireLook = { x: e.clientX, y: e.clientY };
});
fireButton.addEventListener("click", (e) => {
  if (e.detail === 0) fire();
});
function releaseFire(e: PointerEvent) {
  if (e.pointerId !== firePointer) return;
  firePointer = undefined;
  fireButton.classList.remove("held");
}
for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
  fireButton.addEventListener(event, (e) => releaseFire(e as PointerEvent));
window.addEventListener("pointerup", (e) => {
  releaseFire(e);
  if (!touch && e.button === 2) setAim(false);
});
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
window.addEventListener("pointercancel", releaseFire);
$("#run").addEventListener("click", () => {
  run = !run;
  $("#run").classList.toggle("selected", run);
});
window.addEventListener("keydown", (e) => {
  if (
    [
      "Space",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Tab",
    ].includes(e.code)
  )
    e.preventDefault();
  if (!playing) return;
  keys.add(e.code);
  if (e.repeat) return;
  if (e.code === "KeyB") toggleBuild();
  if (e.code === "KeyE") interact();
  if (e.code === "KeyR") {
    rotation = (rotation + 1) % 4;
    rebuildPreview();
  }
  if (build && ["Digit1", "Digit2", "Digit3", "Digit4"].includes(e.code)) {
    selected = (["floor", "wall", "doorway", "storage"] as PieceKind[])[
      Number(e.code.slice(-1)) - 1
    ];
    rebuildPreview();
  } else {
    if (e.code === "Digit1") equip("hands");
    if (e.code === "Digit2") equip("pistol");
    if (e.code === "Digit3") equip("smg");
    if (e.code === "Digit4") equip("rifle");
    if (e.code === "Digit5") equip("sniper");
  }
  if (e.code === "KeyQ") setAim(!aiming);
  if (e.code === "Space") jump();
  if (e.code === "Delete") remove();
  if (e.code === "Escape") pause();
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", pause);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
document.addEventListener("pointerlockchange", () => {
  if (!touch && !document.pointerLockElement && playing) pause();
});
document.addEventListener("mousemove", (e) => {
  if (document.pointerLockElement === canvas && playing) {
    yaw -= e.movementX * 0.0024 * (camera.fov / 72);
    pitch = THREE.MathUtils.clamp(
      pitch - e.movementY * 0.0024 * (camera.fov / 72),
      -1.35,
      1.35,
    );
  }
});
canvas.addEventListener("mousedown", (e) => {
  if (touch || !playing) return;
  if (e.button === 2) {
    setAim(true);
    return;
  }
  if (e.button !== 0) return;
  if (document.pointerLockElement !== canvas) {
    canvas.requestPointerLock?.();
    return;
  }
  firePointer = -1;
  fire();
});
window.addEventListener("mouseup", (e) => {
  if (touch) return;
  if (e.button === 2) setAim(false);
  if (e.button === 0 && firePointer === -1) {
    firePointer = undefined;
    fireButton.classList.remove("held");
  }
});
const joystickElement = $("#joystick");
function moveStick(e: PointerEvent) {
  const b = joystickElement.getBoundingClientRect(),
    dx = e.clientX - (b.x + b.width / 2),
    dy = e.clientY - (b.y + b.height / 2),
    length = Math.hypot(dx, dy),
    limit = b.width * 0.34,
    scale = length > limit ? limit / length : 1;
  joystick.x = (dx * scale) / limit;
  joystick.y = (dy * scale) / limit;
  $("#stick").style.transform =
    `translate(calc(-50% + ${dx * scale}px),calc(-50% + ${dy * scale}px))`;
}
joystickElement.addEventListener("pointerdown", (e) => {
  if (!playing || movePointer !== undefined) return;
  e.preventDefault();
  movePointer = e.pointerId;
  joystickElement.setPointerCapture(e.pointerId);
  moveStick(e);
});
joystickElement.addEventListener("pointermove", (e) => {
  if (movePointer === e.pointerId) moveStick(e);
});
for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
  joystickElement.addEventListener(event, (e) => {
    if (movePointer !== (e as PointerEvent).pointerId) return;
    movePointer = undefined;
    joystick.x = joystick.y = 0;
    $("#stick").style.transform = "translate(-50%,-50%)";
  });
canvas.addEventListener("pointerdown", (e) => {
  if (!touch || !playing || lookPointer !== undefined) return;
  lookPointer = e.pointerId;
  lastLook = { x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (lookPointer !== e.pointerId || !playing) return;
  yaw -= (e.clientX - lastLook.x) * 0.005 * (camera.fov / 72);
  pitch = THREE.MathUtils.clamp(
    pitch - (e.clientY - lastLook.y) * 0.005 * (camera.fov / 72),
    -1.35,
    1.35,
  );
  lastLook = { x: e.clientX, y: e.clientY };
});
for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
  canvas.addEventListener(event, (e) => {
    if (lookPointer === (e as PointerEvent).pointerId) lookPointer = undefined;
  });
window.addEventListener("resize", () => {
  needsRender = true;
  camera.aspect = innerWidth / innerHeight;
  viewModel.setAspect(camera.aspect);
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio, touch ? 1.25 : 1.5));
  renderer.setSize(innerWidth, innerHeight);
  resetInput();
});
canvas.addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  pause();
  toast("Graphics interrupted. Reload to restore the world.");
});
function updateHud() {
  $("#health").textContent = "HEALTH " + health;
  $("#wood").textContent = `WOOD ${save.wood.toLocaleString()}`;
  $("#budget").textContent = `${save.pieces.length} / ${BUILD_LIMIT}`;
  const inside = containingBuilding(player);
  $("#zone").textContent =
    inside >= 0
      ? BUILDINGS[inside].name
      : inTown(player)
        ? "THE BLOCK"
        : roadDistance(player) < 5
          ? "OUTBOUND ROAD"
          : "OPEN MEADOW";
  $("#coordinates").textContent =
    `${Math.round(player.x)} E · ${Math.round(player.z)} S`;
  $("#fps").textContent = `${fps} FPS`;
  for (const b of document.querySelectorAll<HTMLButtonElement>("[data-piece]"))
    b.classList.toggle("selected", b.dataset.piece === selected);
  const near = nearestLoot(),
    door = nearestDoor(),
    p = aimedPiece();
  $("#hint-title").textContent = build
    ? "BUILD MODE"
    : door >= 0
      ? BUILDINGS[door].name + " DOOR"
      : near >= 0
        ? LOOT[near].name
        : p
          ? "YOUR " + p.kind.toUpperCase()
          : "";
  $("#hint-text").textContent = build
    ? "Aim down · 1–4 select · R rotate · Click / PLACE to build"
    : door >= 0
      ? "E / USE · " + (doorTargets[door] ? "Close door" : "Open door")
      : near >= 0
        ? save.opened.includes(near)
          ? "SEARCHED"
          : "E / USE · Search supplies"
        : p
          ? "Build mode → Dismantle to remove"
          : "";
}
function updatePreview() {
  if (!build || !playing) {
    if (preview) preview.visible = false;
    return;
  }
  aimRay();
  const hit = raycaster.ray.intersectPlane(ground, hitPoint);
  if (!hit || hit.distanceTo(camera.position) > 11) {
    candidate = undefined;
    reason = "Look down at nearby ground";
    if (preview) preview.visible = false;
  } else {
    candidate = snapPiece({ x: hit.x, z: hit.z }, selected, rotation);
    reason = placementReason(candidate, player, save.pieces, save.wood);
    if (!preview) {
      preview = pieceModel(candidate, true);
      scene.add(preview);
    }
    preview.position.set(candidate.x, 0, candidate.z);
    preview.rotation.y = (rotation * Math.PI) / 2;
    preview.visible = true;
    previewMaterial.color.set(reason ? 0xe5806b : 0x94e4bb);
  }
  $("#placement").textContent =
    reason ||
    `${selected.toUpperCase()} · ${COST[selected]} wood · Ready to place`;
  $<HTMLButtonElement>("#place").disabled = !!reason;
}
const interiorFrustum = new THREE.Frustum(),
  interiorView = new THREE.Matrix4();
function frame(now: number) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  clock += dt;
  if (!playing && !needsRender) return;
  needsRender = false;
  if (playing) {
    animateDoors(dt, [
      player,
      ...enemies.filter((u) => u.enemy.health > 0).map((u) => u.enemy),
    ]);
    buildingModels.forEach((model, i) => {
      model.door.rotation.y = doorAngles[i];
      model.door.updateMatrixWorld(true);
    });
    let forward =
      Number(keys.has("KeyW") || keys.has("ArrowUp")) -
      Number(keys.has("KeyS") || keys.has("ArrowDown")) -
      joystick.y;
    let right =
      Number(keys.has("KeyD") || keys.has("ArrowRight")) -
      Number(keys.has("KeyA") || keys.has("ArrowLeft")) +
      joystick.x;
    const length = Math.hypot(forward, right);
    if (length > 1) {
      forward /= length;
      right /= length;
    }
    const speed =
      run || keys.has("ShiftLeft") || keys.has("ShiftRight") ? 7 : 4.5;
    player = movePlayer(
      player,
      (-Math.sin(yaw) * forward + Math.cos(yaw) * right) * speed * dt,
      (-Math.cos(yaw) * forward - Math.sin(yaw) * right) * speed * dt,
      save.pieces,
    );
    if (vertical > 0 || verticalSpeed > 0) {
      verticalSpeed -= 12 * dt;
      vertical = Math.max(0, vertical + verticalSpeed * dt);
      if (vertical === 0) verticalSpeed = 0;
    }
    enemyFrame(dt);
    camera.position.set(
      player.x,
      1.65 + vertical + (length > 0.1 ? Math.sin(clock * 9) * 0.025 : 0),
      player.z,
    );
    camera.rotation.set(pitch, yaw, 0);
    if (firePointer !== undefined && tool !== "hands" && !build) fire();
    const recoil =
      tool !== "hands" ? recoilRemaining * WEAPONS[tool].recoil : 0;
    viewModel.animate(clock, length > 0.1, recoil);
    recoilRemaining = Math.max(0, recoilRemaining - dt / 0.15);
    body.root.position.set(player.x, vertical, player.z);
    body.root.rotation.y = yaw;
    body.legs[0].rotation.x = length > 0.1 ? Math.sin(clock * 9) * 0.3 : 0;
    body.legs[1].rotation.x = -body.legs[0].rotation.x;
    updatePreview();
    if (now - lastHud > 160) {
      updateHud();
      lastHud = now;
    }
  } else {
    body.root.position.set(player.x, vertical, player.z);
    body.root.rotation.y = yaw;
    camera.position.set(player.x, 1.65 + vertical, player.z);
    camera.rotation.set(pitch, yaw, 0);
  }
  camera.updateMatrixWorld(true);
  interiorView.multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse,
  );
  interiorFrustum.setFromProjectionMatrix(interiorView);
  for (const entry of interiorBatches) {
    const b = BUILDINGS[entry.building];
    entry.mesh.visible =
      Math.abs(player.x - b.x) < b.width / 2 + 8 &&
      Math.abs(player.z - b.z) < b.depth / 2 + 8 &&
      interiorFrustum.intersectsBox(entry.mesh.boundingBox!);
  }
  muzzle.visible = tracer.visible = flashRemaining > 0;
  if (playing) flashRemaining = Math.max(0, flashRemaining - dt);
  if (now - fpsAt >= 1000) {
    fps = Math.round((frameCount * 1000) / (now - fpsAt));
    frameCount = 0;
    fpsAt = now;
  }
  frameCount++;
  renderer.render(scene, camera);
  if (
    tool !== "hands" &&
    viewModel.gun.slide.position.z > 0 &&
    canvas.dataset.recoilRendered !== String(shotSerial)
  )
    canvas.dataset.recoilRendered = String(shotSerial);
  // Read-only diagnostics update at a bounded rate, without per-frame HUD mutations.
  if (now - lastDiagnostics < 120) return;
  lastDiagnostics = now;
  canvas.dataset.position = `${player.x.toFixed(3)},${player.z.toFixed(3)}`;
  canvas.dataset.yaw = yaw.toFixed(3);
  canvas.dataset.pitch = pitch.toFixed(3);
  canvas.dataset.drawCalls = String(renderer.info.render.calls);
  canvas.dataset.triangles = String(renderer.info.render.triangles);
  canvas.dataset.mapSize = String(MAP_SIZE);
  canvas.dataset.shots = String(shotSerial);
  canvas.dataset.health = String(health);
  canvas.dataset.enemies = JSON.stringify(
    enemies.map((u) => ({
      kind: u.enemy.kind,
      visual: u.imageRig ? "blender" : u.imageLoading ? "loading" : "fallback",
      x: u.enemy.x,
      z: u.enemy.z,
      health: u.enemy.health,
      state: u.enemy.state,
      shots: u.enemy.shots,
      visible: u.actor.root.visible,
    })),
  );
  canvas.dataset.enemy = JSON.stringify({
    x: enemy.x,
    z: enemy.z,
    health: enemy.health,
    state: enemy.state,
    shots: enemy.shots,
  });
  canvas.dataset.firing = String(firePointer !== undefined);
  canvas.dataset.inside = String(containingBuilding(player));
  canvas.dataset.visibleInteriors = JSON.stringify([
    ...new Set(
      interiorBatches
        .filter((entry) => entry.mesh.visible)
        .map((entry) => entry.building),
    ),
  ]);
  canvas.dataset.doors = JSON.stringify(doorAngles);
  canvas.dataset.lastHitDoor = String(lastHitDoor);
  canvas.dataset.nearestDoor = String(nearestDoor());
  canvas.dataset.equipped = tool;
  canvas.dataset.aiming = String(aiming);
  canvas.dataset.fov = String(camera.fov);
  canvas.dataset.actorModels = "rounded-stick-player,detailed-pistol";
  canvas.dataset.recoil = viewModel.gun.slide.position.z.toFixed(4);
  canvas.dataset.movement = `${joystick.x.toFixed(2)},${joystick.y.toFixed(2)}`;
}
updateHud();
requestAnimationFrame(frame);
