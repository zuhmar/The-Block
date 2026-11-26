import {
  isCityApartments,
  apartmentDoors,
  apartmentDoorState,
  apartmentDoorPoint,
} from "./city-apartments-layout";
import { isMart, martState, martDoorPoint } from "./block-mart-layout";
import {
  jailGate,
  jailGateNearby,
  animateJailGate,
} from "./jail-ground-layout";
import { COMPACT, JAIL_BRIDGE, RESOURCE_PARKS } from "./compact-plan";
import { configureCompactCity, migrateCompactSave } from "./compact-city";
import {
  newSurvival,
  settleUpkeep,
  inPlot,
  purchasePlot,
  payUpkeep,
  leaseStatus,
} from "./survival-state";
import { createHousingPlots, housingPlacementReason } from "./housing";
import { createHousingView } from "./housing-view";
import { createSurvivalDialog } from "./survival-ui";
import { dropCarriedOnDeath } from "./full-loot";
import { scavengeRewards, handcraft, LOOT_COOLDOWN_MS } from "./survival-loot";
import type { EnemyKind } from "./enemy";
import { labEncounters, type LabNpcModel, type LabTier } from "./lab-enemies";
import {
  loadLabNpc,
  warmLabNpcModels,
  type LabAnimationState,
} from "./lab-npc-image";
import { NORTH_LAB, inNorthLab, isNorthBuilding } from "./north-lab-layout";
import { northLabModel } from "./north-lab-model";
import { buildingEnabled } from "./building-layout";
import {
  storageSpec,
  storageSize,
  STORAGE_SPECS,
  type StorageSize,
} from "./storage-spec";
import { storageModel } from "./storage-models";
import { emptyStorage, transferStorage } from "./storage";
import { createStorageDialog } from "./storage-ui";
import {
  STATIONS,
  isStationKind,
  startProduction,
  collectProduction,
  cancelProduction,
  advanceProduction,
  missingIngredients,
  ingredientEntries,
} from "./crafting";
import { stationModel, craftingSources } from "./crafting-models";
import { createStationDialog } from "./crafting-ui";
import {
  GameSound,
  FootstepClock,
  spatialSound,
  type SoundName,
} from "./sound";
import { ammoFor, isBulletAmmo } from "./ammo";
import { bulletModel, rocketModel, ammoSources } from "./ammo-models";
import { advanceInventoryReload } from "./ammo-loadout";
import {
  emptyInventory,
  migrateInventory,
  ensureStarterAmmo,
  itemIcon,
  countItem,
  roomFor,
  addItem,
  takeItem,
  selectedItem,
  isResource,
  isHarvestTool,
  isGun,
  itemTool,
  itemName,
  cleanHotbar,
  withdrawStack,
  dropStack,
  pickupDrop,
  useSelected,
  type WorldDrop,
} from "./inventory";
import { createInventoryDialog, itemMarkup } from "./inventory-ui";
import { createDroppedItems, createHeldResource } from "./inventory-art";
import { createCoast } from "./coast-view";
import { coastLimits } from "./coast";
import { inHarbor } from "./harbor-layout";
import { harborModel } from "./harbor-model";
import { createHarvestView } from "./harvest-view";
import { ResourceWorld } from "./resource-world";
import { createNatureRenderer } from "./nature-models";
import { GATHER_TYPES, type GatherKind } from "./resource-state";
import { damageStructuresWithC4 } from "./structure-damage";
import {
  STRUCTURE_MATERIALS,
  structureMaterial,
  structureHealth,
  maxStructureHealth,
  type StructureMaterial,
} from "./structure-health";
import { blastOccluded } from "./explosion-visibility";
import {
  advanceProjectile,
  blastDamage,
  BLAST,
  type Projectile,
  type ChargeKind,
} from "./explosives";
import { inWestQuarter } from "./west-quarter";
import { binModel, jailGroundModel } from "./street-furniture";
import {
  COMPOUND,
  COMPOUND_BARRIERS,
  COMPOUND_PATROLS,
  inCompound,
  type PatrolSpec,
} from "./military-compound";
import { lootChestModel, lootChestSources } from "./loot-chests";
import { woodBuildingModel, woodBuildingSources } from "./wood-buildings";
import {
  newWeaponState,
  spendRound,
  beginReload,
  cancelReload,
  MELEE,
} from "./weapon-state";
import { createNpcHitbox, loadNpcImage } from "./npc-image";
import { createNpc, NPC_KINDS } from "./npc-models";
import { createPlayerViewRig, createPlayerBody } from "./meshy-player";
import { loadBlenderBuilding } from "./blender-buildings";
import {
  doorAngles,
  doorTargets,
  doorPosition,
  animateDoors,
  toggleDoor,
  frontOf,
  buildingDoorOffset,
  containingBuilding,
  buildingStories,
  STORY_HEIGHT,
  resetDoors,
} from "./building-layout";
import {
  WEAPONS,
  explosiveKind,
  canShoot,
  type WeaponKind,
  type Tool,
} from "./weapons";
import {
  newEnemy,
  updateEnemy,
  damageEnemy,
  segmentHitsPlayer,
  ENEMY_TYPES,
} from "./enemy";
import { createWeapon } from "./actor-models";
import { openActorPreview } from "./actor-preview";
import * as THREE from "three";
import {
  BUILDINGS,
  LOOT,
  setResourceCollisionProvider,
  ROADS,
  CITY_RING,
  configureWestRoad,
  pavedWidth,
  lootReward,
  START,
  MAP_SIZE,
  BUILD_LIMIT,
  COST,
  pieceCost,
  dismantleRefund,
  riverX,
  roadDistance,
  inTown,
  blocked,
  movePlayer,
  snapPiece,
  placementReason,
  canRemove,
  readSave,
  pieceBase,
  surfaceHeight,
  ceilingHeight,
  snapOnStructure,
  advancePlayerDoor,
  type Piece,
  type PieceKind,
} from "./world";
import "./style.css";
import "./theme.css";
const $ = <T extends HTMLElement = HTMLElement>(q: string) =>
  document.querySelector<T>(q)!;
$("#app").innerHTML = `
<canvas id="world" aria-label="Street Survival first-person 3D world"></canvas>
<div id="hud" hidden>
  <header><div class="brand">STREET<span>SURVIVAL</span><small>FIRST-PERSON · OPEN WORLD</small></div><div class="location"><b id="zone">THE BLOCK</b><span id="coordinates"></span></div><button id="inventory-button" aria-label="Open inventory">BAG <small>I</small></button><button id="housing-button" aria-label="Land, upkeep and hand crafting">LAND <small>H</small></button><button id="build-tool">BUILD <small>B</small></button><button id="pause-button" aria-label="Pause game">||</button></header>
  <div id="damage-flash" aria-hidden="true"></div><div id="enemy-status"></div><div id="scope-overlay" hidden aria-hidden="true"></div><div id="crosshair" aria-hidden="true">+</div><div id="toast" role="status" aria-live="polite"></div>
  <div id="resource-wallet" aria-label="Gathered resources"><span>ROCK <b id="rock-count">0</b></span><span>SULFUR <b id="sulfur-count">0</b></span><span>METAL <b id="metal-count">0</b></span></div>
  <div id="hint"><b id="hint-title"></b><span id="hint-text"></span><span id="structure-health-label" hidden></span><meter id="structure-health-bar" min="0" max="100" value="100" aria-label="Structure health" hidden></meter></div>
  <div id="build-panel" hidden><div class="panel-heading"><b>BUILD YOUR PLACE</b><span id="budget"></span></div><div id="build-materials" aria-label="Building material">${Object.entries(
    STRUCTURE_MATERIALS,
  )
    .map(
      ([key, tier]) =>
        `<button data-build-material="${key}" class="${key === "wood" ? "selected" : ""}" aria-pressed="${key === "wood"}">${tier.name}<small>${tier.maxHealth} HP</small></button>`,
    )
    .join(
      "",
    )}</div><div id="pieces">${(["floor", "wall", "doorway", "storage", "foundation", "door", "workbench", "furnace"] as PieceKind[]).map((k, i) => `<button data-piece="${k}"><small>0${i + 1}</small><b>${isStationKind(k) ? `<img src="/assets/crafting/station-${k}.png" alt="">${STATIONS[k].name}` : k}</b><span>${COST[k]} wood</span></button>`).join("")}</div><div id="storage-sizes" hidden aria-label="Storage chest size">${Object.entries(
    STORAGE_SPECS,
  )
    .map(
      ([size, spec]) =>
        `<button data-storage-size="${size}" aria-pressed="${size === "small"}"><img src="/assets/player-storage/chest-${size}.png" alt=""><b>${spec.name}</b><span>${spec.slots} slots</span></button>`,
    )
    .join(
      "",
    )}</div><p id="placement"></p><div class="build-actions"><button id="rotate">↻ Rotate</button><button id="remove">Dismantle</button><button id="place">Place piece</button></div></div>
  <div id="mobile-controls"><div id="joystick" aria-label="Movement joystick"><div id="stick"></div><span>MOVE</span></div><div class="mobile-actions"><button id="aim">AIM</button><button id="run" aria-label="Toggle sprint">RUN</button><button id="interact">USE</button><button id="jump">JUMP</button><button id="fire">FIRE</button><button id="gather" hidden>GATHER</button></div><span id="look-help">DRAG RIGHT SIDE TO LOOK</span></div>
  <div id="weapon-status"><img id="ammo-icon" alt="" hidden><span id="ammo"></span><button id="detonate" hidden aria-label="Detonate placed C4">DETONATE <small>G</small></button><button id="reload" aria-label="Reload weapon">RELOAD <small>R</small></button></div>
  <footer><div class="status"><span class="dot"></span><b id="health">HEALTH 100</b><span id="wood"></span><span id="cash-count"></span></div><div class="tools" aria-label="Five hand slots">${Array.from({ length: 5 }, (_, i) => `<button id="hotbar-${i}" data-hand-slot="${i}"><small>${i + 1}</small><b>EMPTY</b></button>`).join("")}</div><div class="save-status">LOCAL PROTOTYPE <span id="fps"></span></div></footer>
</div>
<div id="menu" class="overlay" role="dialog" aria-modal="true" aria-labelledby="menu-title"><div class="menu-card"><div class="menu-edition"><span class="edition-mark" aria-hidden="true">SS</span><span>THE BLOCK / OPEN WORLD SURVIVAL</span></div><span class="eyebrow">MAKE THESE STREETS YOURS</span><h1 id="menu-title"><span>STREET</span><em>SURVIVAL</em></h1><p class="menu-intro">Get out of jail. Loot. Craft. Survive.<br>Own your corner of the city.</p><div class="menu-tags"><span>EXPLORE</span><span>BUILD & CRAFT</span><span>SURVIVE</span></div><button id="start" class="primary">ENTER THE BLOCK <span aria-hidden="true">↗</span></button><div class="sound-settings"><button id="sound-mute" type="button" aria-label="Mute sound effects">SOUND ON</button><label for="sound-volume">EFFECTS VOLUME <output id="sound-level">60%</output><input id="sound-volume" type="range" min="0" max="100" step="5" value="60" aria-label="Sound effects volume"></label></div><div class="menu-secondary"><button id="view-models">CHARACTERS & GEAR</button><button id="reset">RESET WORLD</button></div><details class="menu-help"><summary>HOW TO PLAY</summary><p class="controls desktop-copy">WASD move · Mouse look · Shift run · Space jump<br>E search / gather / use stations · 1–5 hand slots · I / Tab inventory<br>Q / right mouse aim · R reload · G detonate C4 · M mute<br>H land / upkeep / tools · B build · 1–8 pieces · R rotate · V chest size · T material · Del remove · Esc pause</p><p class="controls touch-copy">Left thumb to move. Drag the right side to look.<br>Use LAND for plots, upkeep and tool crafting. BAG opens inventory; BUILD places structures.<br>Hold CHOP / MINE to gather. Tap USE near doors, loot and crafting stations.</p><p class="controls encounter-guide">Leave jail across the bridge. Explore connected city blocks, the military block, laboratory and harbor.</p></details><small class="save-note">Single-player · Progress saves on this device.<br>Your previous online characters and world are preserved separately.</small></div><div class="menu-art-caption" aria-hidden="true"><span>STAY SHARP. BUILD SOMETHING.</span><b>WELCOME TO THE BLOCK.</b></div></div>
<div id="defeated" class="overlay" hidden><div class="menu-card"><h2>YOU DIED</h2><p>Your carried items and cash are dropped where you died. Your home and upkeep remain.</p><button id="respawn" class="primary">RELEASE FROM JAIL</button></div></div><div id="unavailable" class="overlay" hidden><div class="menu-card"><h2>3D graphics unavailable</h2><p>This browser couldn’t start WebGL. Try an updated browser with hardware acceleration enabled.</p></div></div>`;
const touch =
  matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
document.body.classList.toggle("touch", touch);
const sound = new GameSound(),
  footsteps = new FootstepClock();
function syncSoundControls() {
  const settings = sound.getSettings(),
    silent = settings.muted || settings.volume === 0;
  const button = $<HTMLButtonElement>("#sound-mute");
  button.textContent = silent ? "SOUND OFF" : "SOUND ON";
  button.setAttribute("aria-pressed", String(settings.muted));
  button.setAttribute(
    "aria-label",
    silent ? "Unmute sound effects" : "Mute sound effects",
  );
  $<HTMLInputElement>("#sound-volume").value = String(
    Math.round(settings.volume * 100),
  );
  $("#sound-level").textContent = Math.round(settings.volume * 100) + "%";
  canvas.dataset.audio = JSON.stringify(sound.diagnostics());
}
$("#sound-mute").addEventListener("click", () => {
  sound.toggleMute();
  syncSoundControls();
  void sound.unlock().then(syncSoundControls);
});
$("#sound-volume").addEventListener("input", (e) => {
  sound.setVolume(Number((e.target as HTMLInputElement).value) / 100);
  syncSoundControls();
});
$("#sound-volume").addEventListener("change", () => {
  void sound
    .unlock()
    .then(() => sound.play("ui-open", { ui: true, gain: 0.2 }));
});
window.addEventListener(
  "pointerdown",
  () => {
    if (playing || inventoryOpen) void sound.unlock();
  },
  { passive: true },
);
function playAt(
  name: SoundName,
  source: { x: number; z: number },
  gain = 0.7,
  reach = 90,
) {
  const spatial = spatialSound(player, yaw, source, reach);
  sound.play(name, { ...spatial, gain: gain * spatial.gain });
}

const SAVE_KEY = "street-survival:3d-prototype:v1";
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let hadSavedGame = false;
let save = readSave(null),
  saveAvailable = true;
try {
  const raw = localStorage.getItem(SAVE_KEY);
  hadSavedGame = !!raw;
  save = readSave(raw);
  if (
    raw &&
    save.survival?.mapVersion !== 2 &&
    !localStorage.getItem("street-survival:pre-compact-city:v1")
  )
    localStorage.setItem("street-survival:pre-compact-city:v1", raw);
} catch {
  saveAvailable = false;
}
if (!hadSavedGame) {
  save.wood = 0;
  save.resources = { rock: 0, sulfur: 0, metal: 0 };
  save.inventory = emptyInventory();
  save.inventory.ammoVersion = 1;
}
save.survival ??= newSurvival();
const survival = () => save.survival!;
save.inventory ??= migrateInventory(save.wood, save.resources);
ensureStarterAmmo(save.inventory);
function inventory() {
  return save.inventory!;
}
function syncCarry() {
  save.wood = countItem(inventory(), "wood");
  save.resources = {
    rock: countItem(inventory(), "rock"),
    sulfur: countItem(inventory(), "sulfur"),
    metal: countItem(inventory(), "metal"),
  };
}
syncCarry();
let legacyMapPreserved = false;
const restoreLegacy = configureCompactCity();
try {
  const migrated = structuredClone(save);
  migrateCompactSave(migrated);
  save = migrated;
} catch {
  legacyMapPreserved = true;
  restoreLegacy();
  configureWestRoad(save.pieces);
}

if (!survival().plots.length)
  survival().plots = createHousingPlots(save.pieces);
for (const id of settleUpkeep(survival(), Date.now()).cleared) {
  const plot = survival().plots.find((p) => p.id === id);
  if (plot) save.pieces = save.pieces.filter((p) => !inPlot(p, plot));
}
// Old searched caches become available again after one cooldown.
for (const id of save.opened)
  survival().lootReadyAt[id] ??= Date.now() + LOOT_COOLDOWN_MS;

const resourceWorld = new ResourceWorld(() => save.pieces, save.harvest);
function reserveOwnedLand() {
  const plot = survival().plots.find((p) => p.id === survival().lease?.plotId);
  resourceWorld.reserveLand(
    (p, r) => !plot || !inPlot(p, plot, -r),
    Date.now(),
  );
}
reserveOwnedLand();

save.resources ??= { rock: 0, sulfur: 0, metal: 0 };
setResourceCollisionProvider((p, feet, build, radius) =>
  resourceWorld.blocked(p, feet, build, radius),
);
function persist() {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  storeCurrentGun();
  syncCarry();
  droppedItems.sync(inventory().drops);
  save.harvest = resourceWorld.snapshot();
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify(save, (key, value) =>
        key === "doorAngle" ? undefined : value,
      ),
    );
  } catch {
    saveAvailable = false;
    toast("Device storage unavailable · progress lasts for this session");
  }
}
function persistSoon() {
  storeCurrentGun();
  if (saveTimer === undefined)
    saveTimer = setTimeout(() => {
      saveTimer = undefined;
      persist();
    }, 200);
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
const coast = createCoast();
scene.add(coast.root);
const harbor = harborModel();
scene.add(harbor.root, harbor.proxy);
const northLab = northLabModel();
scene.add(northLab.root, northLab.proxy);
const droppedItems = createDroppedItems();
scene.add(droppedItems.root);
droppedItems.sync(inventory().drops);
// River banks follow a gentle curve, rather than a rectangular water strip.
const waterShape = new THREE.Shape();
let riverNorth = -250,
  riverSouth = 250;
for (let i = 0; i < 8; i++) {
  riverNorth = coastLimits(riverX(riverNorth)).north;
  riverSouth = coastLimits(riverX(riverSouth)).south;
}
const channel = Array.from({ length: 257 }, (_, i) => {
  const z = riverNorth + ((riverSouth - riverNorth) * i) / 256;
  return { x: riverX(z), z };
});
channel.forEach((p, i) =>
  i ? waterShape.lineTo(p.x - 3.3, -p.z) : waterShape.moveTo(p.x - 3.3, -p.z),
);
for (const p of channel.slice().reverse()) waterShape.lineTo(p.x + 3.3, -p.z);
waterShape.closePath();
const river = new THREE.Mesh(
  new THREE.ShapeGeometry(waterShape),
  coast.waterMaterial,
);
river.rotation.x = -Math.PI / 2;
river.position.y = 0.015;
river.visible = !COMPACT.active;
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
for (const ROAD of ROADS) {
  ribbon(ROAD, pavedWidth(ROAD), 0.035, 0xbfc0aa);
  ribbon(ROAD, ROAD === CITY_RING ? 3.6 : 6, 0.055, 0x515c60);
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
}
// The prison's only road connection crosses the water channel.
if (COMPACT.active) {
  for (const park of RESOURCE_PARKS)
    box(
      scene,
      park.x,
      -0.015,
      park.z,
      park.width,
      0.025,
      park.depth,
      park.kind === "tree" ? 0x779358 : 0x8b8980,
    );
} else {
  box(scene, 47, 0.05, 7, 13, 0.12, 6, 0x656d6a);
  for (const z of [3.8, 10.2]) {
    box(scene, 47, 0.8, z, 13, 0.15, 0.12, 0xd8d4bb);
    for (let x = 41; x <= 53; x += 2)
      box(scene, x, 0.42, z, 0.15, 0.85, 0.15, 0x8b9791);
  }
}
const buildingModels = BUILDINGS.map((b, index) => {
  const model = loadBlenderBuilding(index, boxGeo, sign);
  model.root.position.set(b.x, 0, b.z);
  model.shotRoot.position.set(b.x, 0, b.z);
  model.shotRoot.updateMatrixWorld(true);
  model.root.visible = buildingEnabled(b);
  scene.add(model.root);
  return model;
});
// Permanent-building contact shadows only; gatherable models have no baked ground patches.
const contactCanvas = document.createElement("canvas");
contactCanvas.width = contactCanvas.height = 64;
const contactCtx = contactCanvas.getContext("2d")!,
  fade = contactCtx.createRadialGradient(32, 32, 8, 32, 32, 32);
fade.addColorStop(0, "#fff8");
fade.addColorStop(1, "#fff0");
contactCtx.fillStyle = fade;
contactCtx.fillRect(0, 0, 64, 64);
const contacts = [
  ...BUILDINGS.filter(buildingEnabled).map((b) => ({
    ...b,
    width: b.width + 3,
    depth: b.depth + 3,
  })),
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
const nature = createNatureRenderer(resourceWorld);
nature.update(START, 0);
scene.add(nature.root, nature.cover);
// Street furniture makes the little settlement readable without oversized sprites.
for (const [x, z] of [
  [-27, 8],
  [29, 2],
  [-10, -9],
  [10, 9],
]) {
  cylinder(scene, x, 2.2, z, 0.09, 4.4, 0x56655d);
  box(scene, x + 0.5, 4.45, z, 1.15, 0.12, 0.15, 0x56655d);
  box(scene, x + 1, 4.3, z, 0.5, 0.16, 0.3, 0xe5dfb8);
}
const jailGrounds = jailGroundModel();
scene.add(jailGrounds.root, jailGrounds.proxy);
// Keep cheap shot-cover boxes separate from the detailed visual meshes.
const lootMeshes: THREE.Group[] = [];
LOOT.forEach((c, index) => {
  const visual =
    c.kind === "trash" ? binModel(c.model!) : lootChestModel(c.tier);
  const g = new THREE.Group();
  g.position.set(c.x, c.y ?? 0, c.z);
  g.userData.loot = index;
  scene.add(g);
  const proxy = new THREE.Group();
  proxy.position.copy(g.position);
  const cover = box(
    proxy,
    0,
    c.height / 2,
    0,
    c.width,
    c.height,
    c.depth,
    c.color,
  );
  cover.visible = false;
  scene.add(proxy);
  lootMeshes.push(proxy);
  if (visual) {
    g.add(visual);
  } else {
    box(g, 0, c.height / 2, 0, c.width, c.height, c.depth, c.color);
    box(g, 0, c.height, 0, c.width, 0.07, c.depth, 0x344d4b);
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
  }
});
const heading = sign(
  COMPACT.active
    ? "JAIL ISLAND / CITY BLOCKS →"
    : "JAIL DISTRICT / COUNTRYSIDE →",
  7,
  0.8,
);
heading.position.set(COMPACT.active ? 6 : 12, 3.2, COMPACT.active ? -74 : 26);
heading.rotation.y = Math.PI;
scene.add(heading);
for (const x of [9, 15])
  box(
    scene,
    COMPACT.active ? x - 6 : x,
    1.5,
    COMPACT.active ? -74 : 26,
    0.1,
    3,
    0.1,
    0x6b796a,
  );
const portSign = sign("SOUTH HARBOR ↓", 5, 0.7);
portSign.position.set(-10, 2.8, 35);
portSign.rotation.y = Math.PI;
scene.add(portSign);
const officeSign = sign("SOUTH HARBOR · PORT OFFICE", 3.4, 0.45);
officeSign.position.set(-111, 2.9, COMPACT.active ? 141.19 : 201.19);
scene.add(officeSign);
const shotObstacles: THREE.Object3D[] = [
  jailGrounds.proxy,
  coast.surface,
  nature.cover,
  harbor.proxy,
  northLab.proxy,
  ...buildingModels
    .filter((_, i) => buildingEnabled(BUILDINGS[i]))
    .map((m) => m.shotRoot),
];
// A simple target range supports testing the visible pistol and shot feedback.
const targets: THREE.Object3D[] = [];
for (const x of COMPACT.active ? [] : [-7, -3, 1]) {
  cylinder(scene, x, 1.1, 36, 0.06, 2.2, 0x7d725b);
  const target = cylinder(scene, x, 2, 36, 0.55, 0.12, 0xc7b99a, 16);
  target.rotation.x = Math.PI / 2;
  target.userData.target = true;
  targets.push(target);
  const bull = cylinder(scene, x, 2, 35.92, 0.18, 0.025, 0xb4674f, 12);
  bull.rotation.x = Math.PI / 2;
}
// The new compound uses the same inexpensive static batching as the town.
box(
  scene,
  (COMPOUND.minX + COMPOUND.maxX) / 2,
  0.012,
  (COMPOUND.minZ + COMPOUND.maxZ) / 2,
  COMPOUND.maxX - COMPOUND.minX,
  0.025,
  COMPOUND.maxZ - COMPOUND.minZ,
  0x999d87,
);
for (const barrier of COMPOUND_BARRIERS) {
  if (barrier.height < 1) {
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 4; col++)
        box(
          scene,
          barrier.x + (col - 1.5) * 0.48 + (row % 2) * 0.06,
          0.15 + row * 0.3,
          barrier.z,
          0.48,
          0.28,
          0.95,
          0x9d956e,
        );
    continue;
  }
  const horizontal = barrier.width > barrier.depth,
    length = horizontal ? barrier.width : barrier.depth;
  for (const y of [0.3, 2.4])
    box(
      scene,
      barrier.x,
      y,
      barrier.z,
      horizontal ? length : 0.12,
      0.11,
      horizontal ? 0.12 : length,
      0x5f6e6c,
    );
  for (let n = 0; n <= length; n += 1.2)
    box(
      scene,
      barrier.x + (horizontal ? n - length / 2 : 0),
      1.25,
      barrier.z + (horizontal ? 0 : n - length / 2),
      0.065,
      2.5,
      0.065,
      0x72817b,
    );
  for (let n = 0; n <= length; n += 4)
    box(
      scene,
      barrier.x + (horizontal ? n - length / 2 : 0),
      1.3,
      barrier.z + (horizontal ? 0 : n - length / 2),
      0.16,
      2.6,
      0.16,
      0x43534f,
    );
}
for (const sourceX of [64, 112]) {
  const x = sourceX + (COMPACT.active ? -176 : 0),
    z = COMPACT.active ? -33 : 7;
  for (const dz of [-4, 4]) box(scene, x, 2.2, z + dz, 0.3, 4.4, 0.3, 0x43534f);
  box(scene, x, 4.3, z, 0.35, 0.25, 8.4, 0x43534f);
  const marker = sign(
    sourceX === 64 ? "MILITARY BLOCK" : "COMPOUND EXIT",
    5,
    0.65,
    "#eee8cd",
    "#3e5140",
  );
  marker.position.set(x - 0.22, 3.75, z);
  marker.rotation.y = -Math.PI / 2;
  scene.add(marker);
}
for (const [oldX, oldZ] of [
  [65, -20],
  [111, -20],
  [65, 34],
  [111, 34],
]) {
  const x = oldX + (COMPACT.active ? -176 : 0),
    z = oldZ + (COMPACT.active ? -40 : 0);
  box(scene, x, 2.5, z, 0.14, 5, 0.14, 0x4f6259);
  box(scene, x, 5, z, 0.8, 0.2, 0.5, 0xe0d6ae);
}
for (const b of BUILDINGS.filter((b) => b.type.startsWith("military-"))) {
  const front = frontOf(b),
    start = b.z + buildingDoorOffset(b),
    end = (front > 0 ? 2.5 : 11.5) + (COMPACT.active ? -40 : 0);
  box(
    scene,
    b.x,
    0.033,
    (start + end) / 2,
    2,
    0.012,
    Math.abs(end - start),
    0xb9b8a0,
  );
}
// Batch static box geometry by material to keep phone draw calls low.
scene.updateMatrixWorld(true);
const batches = new Map<
  string,
  { mat: THREE.Material; meshes: THREE.Mesh[]; building?: number }
>();
const interiorBatches: {
  building: number;
  mesh: THREE.Mesh;
  bounds: THREE.Box3;
}[] = [];
scene.traverse((o) => {
  if (
    !(o instanceof THREE.Mesh) ||
    o.geometry !== boxGeo ||
    !o.visible ||
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
    interiorBatches.push({
      building,
      mesh: batch,
      bounds: new THREE.Box3().setFromObject(batch),
    });
  }
}
// Blender furniture is already merged by material; cull its world-space bounds.
for (const model of buildingModels)
  if (model.source === "blender")
    model.root.traverse((o) => {
      if (o instanceof THREE.Mesh && o.userData.interiorBuilding !== undefined)
        interiorBatches.push({
          building: o.userData.interiorBuilding,
          mesh: o,
          bounds: new THREE.Box3().setFromObject(o),
        });
    });
const construction = new THREE.Group();
scene.add(construction);
function pieceModel(p: Omit<Piece, "id">, preview = false) {
  const g = new THREE.Group();
  g.position.set(p.x, pieceBase(p, save.pieces), p.z);
  g.rotation.y = (p.rotation * Math.PI) / 2;
  const tier = structureMaterial(p);
  const imported = isStationKind(p.kind)
    ? stationModel(p.kind)
    : p.kind === "storage"
      ? storageModel(p)
      : tier === "wood"
        ? woodBuildingModel(p.kind)
        : undefined;
  if (imported) g.add(imported);
  if (!imported && isStationKind(p.kind)) {
    const station = STATIONS[p.kind];
    box(
      g,
      0,
      station.height / 2,
      0,
      station.width,
      station.height,
      station.depth,
      p.kind === "furnace" ? 0x887b6a : 0x586a3e,
    );
  }
  if (!imported && p.kind === "foundation")
    box(g, 0, 0.25, 0, 2, 0.5, 2, 0xb78b4e);
  if (!imported && p.kind === "door")
    box(g, 0.54, 1.03, 0, 1.08, 2.06, 0.1, 0xb78b4e);
  if (!imported && p.kind === "floor") {
    box(g, 0, 0.09, 0, 2, 0.18, 2, 0xb3a17c);
    for (const x of [-0.65, 0, 0.65])
      box(g, x, 0.185, 0, 0.025, 0.012, 1.96, 0x85785e);
  }
  if (!imported && p.kind === "wall") {
    box(g, 0, 1.25, 0, 2, 2.5, 0.16, 0xc6b38b);
    for (const x of tier === "stone" ? [] : [-0.9, 0, 0.9])
      box(g, x, 1.25, 0.1, 0.08, 2.5, 0.06, 0x8d795c);
  }
  if (!imported && p.kind === "doorway") {
    for (const x of [-0.78, 0.78])
      box(g, x, 1.25, 0, 0.44, 2.5, 0.16, 0xc6b38b);
    box(g, 0, 2.3, 0, 2, 0.4, 0.16, 0x9c8664);
  }
  if (!imported && p.kind === "storage") {
    const spec = storageSpec(p);
    box(
      g,
      0,
      spec.height / 2,
      0,
      spec.width,
      spec.height,
      spec.depth,
      0xcc792b,
    );
    box(g, 0, spec.height - 0.04, 0, spec.width, 0.08, spec.depth, 0xb56523);
    for (const x of [-spec.width * 0.29, spec.width * 0.29])
      box(
        g,
        x,
        spec.height / 2,
        spec.depth / 2 + 0.006,
        0.075,
        spec.height,
        0.015,
        0x393a45,
      );
  }
  if (tier !== "wood" && !isStationKind(p.kind))
    g.traverse((o) => {
      if (o instanceof THREE.Mesh)
        o.material = material(STRUCTURE_MATERIALS[tier].color);
    });
  if (tier === "stone" && p.kind === "wall")
    for (const z of [-0.087, 0.087])
      for (const y of [0.5, 1, 1.5, 2])
        box(g, 0, y, z, 1.97, 0.018, 0.012, 0x4f5958);
  if (preview)
    g.traverse((o) => {
      if (o instanceof THREE.Mesh) o.material = previewMaterial;
    });
  return g;
}
const constructionArt = new THREE.Group();
scene.add(constructionArt);
const builtDoors = new Map<
  string,
  { hinge: THREE.Group; proxy: THREE.Group }
>();
const buildProxyMaterial = new THREE.MeshBasicMaterial();
function buildProxy(p: Piece) {
  const root = new THREE.Group();
  root.userData.pieceId = p.id;
  root.position.set(p.x, pieceBase(p, save.pieces), p.z);
  root.rotation.y = (p.rotation * Math.PI) / 2;
  function part(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ) {
    const mesh = new THREE.Mesh(boxGeo, buildProxyMaterial);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.visible = false;
    mesh.userData.pieceId = p.id;
    root.add(mesh);
  }
  if (p.kind === "doorway") {
    for (const x of [-0.78, 0.78]) part(x, 1.25, 0, 0.44, 2.5, 0.16);
    part(0, 2.3, 0, 2, 0.4, 0.16);
  } else if (p.kind === "door") {
    root.position.x += -0.54 * Math.cos(root.rotation.y);
    root.position.z += 0.54 * Math.sin(root.rotation.y);
    root.position.y += 0.02;
    root.rotation.y += p.doorAngle ?? (p.open ? -Math.PI / 2 : 0);
    part(0.54, 1.03, 0, 1.08, 2.06, 0.1);
  } else if (p.kind === "wall") part(0, 1.25, 0, 2, 2.5, 0.16);
  else if (p.kind === "foundation") part(0, 0.25, 0, 2, 0.5, 2);
  else if (p.kind === "floor") part(0, 0.09, 0, 2, 0.18, 2);
  else if (isStationKind(p.kind)) {
    const station = STATIONS[p.kind];
    part(
      0,
      station.height / 2,
      0,
      station.width,
      station.height,
      station.depth,
    );
  } else {
    const spec = storageSpec(p);
    part(0, spec.height / 2, 0, spec.width, spec.height, spec.depth);
  }
  return root;
}
function rebuildConstruction() {
  for (const old of constructionArt.children)
    if (old instanceof THREE.InstancedMesh) old.dispose();
  constructionArt.clear();
  construction.clear();
  builtDoors.clear();
  const groups = new Map<
    THREE.BufferGeometry,
    Map<THREE.Material, { matrix: THREE.Matrix4; id: string }[]>
  >();
  for (const p of save.pieces) {
    const proxy = buildProxy(p);
    construction.add(proxy);
    const model = pieceModel(p);
    if (p.kind === "door") {
      const parent = new THREE.Group();
      parent.position.copy(model.position);
      parent.rotation.copy(model.rotation);
      const hinge = new THREE.Group();
      hinge.position.set(-0.54, 0.02, 0);
      parent.add(hinge);
      model.position.set(0, 0, 0);
      model.rotation.set(0, 0, 0);
      hinge.add(model);
      hinge.rotation.y = p.doorAngle ?? (p.open ? -Math.PI / 2 : 0);
      constructionArt.add(parent);
      builtDoors.set(p.id, { hinge, proxy });
      continue;
    }
    model.updateMatrixWorld(true);
    model.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const mat = o.material as THREE.Material;
      if (!groups.has(o.geometry)) groups.set(o.geometry, new Map());
      const materials = groups.get(o.geometry)!;
      if (!materials.has(mat)) materials.set(mat, []);
      materials.get(mat)!.push({ matrix: o.matrixWorld.clone(), id: p.id });
    });
  }
  for (const [geometry, materials] of groups)
    for (const [mat, parts] of materials) {
      const batch = new THREE.InstancedMesh(geometry, mat, parts.length);
      parts.forEach((p, i) => batch.setMatrixAt(i, p.matrix));
      constructionArt.add(batch);
    }
  construction.updateMatrixWorld(true);
  constructionArt.updateMatrixWorld(true);
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
let buildMaterial: StructureMaterial = "wood";
let buildStorageSize: StorageSize = "small";
let candidate: Omit<Piece, "id"> | undefined,
  reason = "";
let player = { ...START },
  yaw = COMPACT.active ? Math.PI : 0,
  pitch = -0.03,
  playing = false,
  inventoryOpen = false,
  resumeAfterInventory = false,
  equippedItemId: string | undefined,
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
let viewModel = createPlayerViewRig();
const weaponRigs = new Map<WeaponKind, ReturnType<typeof createPlayerViewRig>>([
  ["pistol", viewModel],
]);
let aiming = false;
viewModel.setAspect(camera.aspect);
const viewScene = new THREE.Scene();
const viewCamera = new THREE.PerspectiveCamera(72, camera.aspect, 0.025, 10);
viewScene.add(viewCamera);
viewScene.add(new THREE.HemisphereLight(0xffffff, 0x526b54, 2));
const viewLight = new THREE.DirectionalLight(0xffecd2, 2.5);
viewLight.position.set(-2, 3, 2);
viewScene.add(viewLight);
renderer.autoClear = false;
renderer.info.autoReset = false;
viewCamera.add(viewModel.root);
const body = createPlayerBody();
scene.add(body.root);
let muzzle = viewModel.flash;
const muzzlePosition = new THREE.Vector3();
const encounters: {
  id: string;
  kind: EnemyKind;
  patrol: PatrolSpec | undefined;
  labModel?: LabNpcModel;
  labTier?: LabTier;
  weapon?: "pistol" | "rifle" | "lmg";
}[] = [
  ...NPC_KINDS.map((kind) => ({
    id: kind + "-town",
    kind,
    patrol: undefined as PatrolSpec | undefined,
  })),
  ...COMPOUND_PATROLS.map((patrol) => ({
    id: patrol.id,
    kind: "swat" as const,
    patrol,
  })),
  ...labEncounters(),
];
const enemies = encounters.map(
  ({ kind, patrol, id, labModel, labTier, weapon: chosenWeapon }) => {
    const enemy = newEnemy(kind, save.pieces, patrol),
      actor = createNpc(kind, (text, w, h) =>
        sign(text, w, h, "#ffffff", "#202735"),
      ),
      weaponKind = chosenWeapon ?? (kind === "swat" ? "rifle" : "pistol"),
      weapon = createWeapon(weaponKind);
    actor.arms[1].rotation.x = 1;
    weapon.root.position.set(0.24, 1.07, -0.44);
    actor.root.add(weapon.root);
    scene.add(actor.root);
    actor.root.position.set(enemy.x, 0, enemy.z);
    actor.root.visible = false;
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
    hitbox.position.set(enemy.x, 0, enemy.z);
    hitbox.updateMatrixWorld(true);
    return {
      id,
      patrol,
      labModel,
      labTier,
      weaponKind,
      previousHealth: enemy.health,
      enemy,
      actor,
      weapon,
      flash,
      aim,
      hitbox,
      flashTime: 0,
      moving: false,
      imageRig: undefined as
        | (
            | Awaited<ReturnType<typeof loadNpcImage>>
            | Awaited<ReturnType<typeof loadLabNpc>>
          )
        | undefined,
      imageLoading: false,
      retryImageAfter: 0,
    };
  },
);
const enemy = enemies[0].enemy; // Retain the original easy-enemy read-only diagnostic.
const bulletGeometry = new THREE.SphereGeometry(0.045, 5, 3),
  bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffc176 });
const enemyBullets: {
  mesh: THREE.Object3D;
  velocity: THREE.Vector3;
  life: number;
  damage: number;
}[] = [];
const coverRay = new THREE.Raycaster();
let health = survival().dead ? 0 : 100,
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
  cancelHarvest();
  survival().dead = false;
  health = 100;
  loadout = newWeaponState();
  equippedItemId = undefined;
  reconcileEquipment();
  clearExplosives();
  punchRemaining = punchCooldown = 0;
  player = { ...START };
  yaw = COMPACT.active ? Math.PI : 0;
  pitch = -0.03;
  vertical = verticalSpeed = 0;
  for (const unit of enemies)
    Object.assign(
      unit.enemy,
      newEnemy(unit.enemy.kind, save.pieces, unit.patrol),
    );
  clearBullets();
  $("#defeated").hidden = true;
  persist();
  updateHud();
  start();
}
$("#respawn").addEventListener("click", respawn);
const inReleaseArea = () =>
  Math.hypot(player.x - START.x, player.z - START.z) < 8;
function recordDeath() {
  if (health > 0) return;
  storeCurrentGun();
  cancelReload(loadout);
  cancelHarvest();
  if (
    dropCarriedOnDeath(inventory(), survival(), {
      x: player.x,
      z: player.z,
      y: vertical,
    })
  ) {
    equippedItemId = undefined;
    reconcileEquipment();
    persist();
  }
  if (survivalOpen) closeSurvival(false);
  if (inventoryOpen) closeInventory();
  if (stationOpen) closeStation(false);
  punchRemaining = 0;
  playing = false;
  resetInput();
  sound.setPaused(true);
  $("#menu").hidden = true;
  $("#defeated").hidden = false;
  if (document.pointerLockElement) document.exitPointerLock();
}

function enemyFrame(dt: number) {
  if (
    NORTH_LAB.enabled &&
    Math.hypot(player.x - NORTH_LAB.x, player.z - NORTH_LAB.z) < 130
  )
    warmLabNpcModels();
  for (const unit of enemies) {
    const {
      enemy,
      actor: enemyActor,
      weapon: enemyWeapon,
      flash: enemyFlash,
      aim: enemyAim,
    } = unit;
    if (
      unit.labModel &&
      Math.hypot(enemy.x - player.x, enemy.z - player.z) > 65
    ) {
      enemyActor.root.visible = false;
      enemyAim.visible = false;
      enemyFlash.visible = false;
      if (enemy.health <= 0) updateEnemy(enemy, player, save.pieces, dt, false);
      continue;
    }
    const enemySurface = surfaceHeight(
      enemy,
      save.pieces,
      enemyActor.root.position.y + 0.75,
    );
    const from = new THREE.Vector3(enemy.x, enemySurface + 1.4, enemy.z),
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
      void (
        unit.labModel ? loadLabNpc(unit.labModel) : loadNpcImage(enemy.kind)
      )
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
          enemyActor.root.add(model.root);
          if (model.attachWeapon) model.attachWeapon(enemyWeapon.root);
          else enemyActor.root.add(enemyWeapon.root);
          unit.imageRig = model;
        })
        .catch((error: unknown) => {
          console.warn("NPC model could not load", unit.id, error);
          unit.retryImageAfter = clock + 10;
        })
        .finally(() => {
          unit.imageLoading = false;
        });
    }
    const beforeX = enemy.x,
      beforeZ = enemy.z;
    const shot = updateEnemy(enemy, player, save.pieces, dt, visible);
    enemyActor.root.visible =
      (enemy.health > 0 || (!!unit.labModel && enemy.timer < 1.3)) &&
      Math.hypot(enemy.x - player.x, enemy.z - player.z) < 38;
    enemyActor.root.position.set(
      enemy.x,
      surfaceHeight(enemy, save.pieces, enemyActor.root.position.y + 0.75),
      enemy.z,
    );
    enemyActor.root.rotation.y = enemy.yaw;
    const moving = Math.hypot(enemy.x - beforeX, enemy.z - beforeZ) > 0.0001;
    unit.moving = moving;
    if (unit.imageRig) {
      if (unit.labModel)
        (
          unit.imageRig.animate as (
            moving: boolean,
            dt: number,
            shot: boolean,
            state: LabAnimationState,
          ) => void
        )(moving, dt, Boolean(shot), {
          reloading: enemy.state === "reload",
          down: enemy.health <= 0,
          hit: enemy.health < unit.previousHealth && enemy.health > 0,
          running: moving && enemy.state !== "patrol",
        });
      else unit.imageRig.animate(moving, dt, Boolean(shot));
    } else {
      enemyActor.legs[0].rotation.x = moving ? Math.sin(clock * 8) * 0.3 : 0;
      enemyActor.legs[1].rotation.x = -enemyActor.legs[0].rotation.x;
    }
    unit.previousHealth = enemy.health;
    enemyWeapon.root.visible = enemy.health > 0;
    unit.hitbox.position.set(
      enemy.x,
      surfaceHeight(enemy, save.pieces, enemyActor.root.position.y + 0.75),
      enemy.z,
    );
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
      const mesh =
        bulletModel(unit.weaponKind) ??
        new THREE.Mesh(bulletGeometry, bulletMaterial);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
      playAt(unit.weaponKind, enemy, 0.65);
      mesh.position.copy(muzzlePoint);
      scene.add(mesh);
      enemyBullets.push({
        mesh,
        velocity: direction.multiplyScalar(18),
        life: 2,
        damage: enemy.patrol?.combat?.damage ?? ENEMY_TYPES[enemy.kind].damage,
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
    if (
      !blocked &&
      !inReleaseArea() &&
      segmentHitsPlayer(a, end, player, vertical)
    ) {
      health = Math.max(0, health - b.damage);
      damageFlash = 0.25;
      sound.play("hurt", { gain: 0.6, interval: 0.15 });
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
    ? (nearby[0].labTier
        ? { easy: "Lab worker", medium: "Lab security", hard: "Lab enforcer" }[
            nearby[0].labTier!
          ]
        : ENEMY_TYPES[warning.kind].name
      ).toUpperCase() +
      (warning.state === "aim" ? " AIMING · MOVE OR FIND COVER" : " NEARBY")
    : "";
  if ($("#enemy-status").textContent !== status)
    $("#enemy-status").textContent = status;
  if (health <= 0) {
    recordDeath();
  }
}

const bulletVisuals: {
  model: THREE.Object3D;
  velocity: THREE.Vector3;
  remaining: number;
}[] = [];
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
let lastHitBuildPiece = "";
let lastEmptyNotice = -Infinity;
let loadout = newWeaponState();
const lastExplosiveUse: Partial<Record<ChargeKind, number>> = {};
let detonationRemaining = 0,
  reloadRequested = false;
let reloadSoundStage = 0;
let useRemaining = 0,
  explosiveLatch = false,
  projectileSerial = 0,
  explosionSerial = 0;
let pendingUse:
  | {
      kind: ChargeKind;
      point?: THREE.Vector3;
      normal?: THREE.Vector3;
      attachedPieceId?: string;
    }
  | undefined;
const projectiles: Projectile[] = [],
  projectileModels = new Map<number, THREE.Object3D>();
const blastEffects: { mesh: THREE.Mesh; life: number; radius: number }[] = [];
const flightRay = new THREE.Raycaster();
function disposeProjectile(model: THREE.Object3D) {
  if (model.userData.ownedProjectile)
    model.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
}
function clearExplosives() {
  for (const model of projectileModels.values()) {
    disposeProjectile(model);
    scene.remove(model);
  }
  projectileModels.clear();
  projectiles.length = 0;
  pendingUse = undefined;
  reloadRequested = false;
  useRemaining = 0;
  detonationRemaining = 0;
  explosiveLatch = false;
  for (const effect of blastEffects) {
    scene.remove(effect.mesh);
    effect.mesh.geometry.dispose();
    (effect.mesh.material as THREE.Material).dispose();
  }
  blastEffects.length = 0;
}
function explosiveObstacles() {
  return [
    ...shotObstacles,
    ...lootMeshes,
    ...construction.children,
    ...enemies.filter((u) => u.enemy.health > 0).map((u) => u.hitbox),
  ];
}
function useExplosive(kind: ChargeKind) {
  if (
    explosiveLatch ||
    !canShoot(kind, performance.now(), lastExplosiveUse[kind] ?? -Infinity)
  )
    return;
  if (projectiles.length >= 8) {
    explosiveLatch = true;
    toast("Limit · 8 active explosives");
    return;
  }
  const available =
    kind === "rocket"
      ? countItem(inventory(), "rockets")
      : selectedItem(inventory())?.kind === kind
        ? selectedItem(inventory())!.quantity
        : 0;
  if (!available) {
    notifyInventory(
      "No " + (kind === "rocket" ? "rockets" : itemName(kind)) + " carried",
    );
    return;
  }
  if (kind !== "rocket")
    loadout.rounds[kind] = Math.min(WEAPONS[kind].magazineSize, available);
  if (loadout.rounds[kind] <= 0) {
    toast("Empty · R / RELOAD");
    return;
  }
  let point: THREE.Vector3 | undefined,
    normal: THREE.Vector3 | undefined,
    attachedPieceId: string | undefined;
  if (kind === "c4") {
    aimRay();
    const hit = raycaster
      .intersectObjects([...shotObstacles, ...construction.children], true)
      .find((h) => h.distance <= 3);
    if (!hit) {
      toast("Aim at a nearby wall or ground to place C4");
      return;
    }
    attachedPieceId = hit.object.userData.pieceId;
    point = hit.point.clone().addScaledVector(raycaster.ray.direction, -0.09);
    normal = hit.face?.normal
      .clone()
      .transformDirection(hit.object.matrixWorld);
  }
  explosiveLatch = true;
  lastExplosiveUse[kind] = performance.now();
  pendingUse = { kind, point, normal, attachedPieceId };
  useRemaining = 0.8;
  recoilRemaining = 0;
}
function spawnExplosive(
  kind: ChargeKind,
  point?: THREE.Vector3,
  normal?: THREE.Vector3,
  attachedPieceId?: string,
) {
  if (kind === "c4" && point && camera.position.distanceTo(point) > 3.3) {
    toast("Move closer to place C4");
    return;
  }
  if (kind === "rocket" && !countItem(inventory(), "rockets")) return;
  if (kind !== "rocket" && selectedItem(inventory())?.kind !== kind) return;
  if (!spendRound(loadout, kind)) return;
  if (kind === "rocket") takeItem(inventory(), "rockets", 1);
  else useSelected(inventory());
  persist();
  shotSerial++;
  sound.play(
    kind === "rocket"
      ? "rocket-launch"
      : kind === "grenade"
        ? "grenade-throw"
        : "c4-place",
    { gain: 0.8 },
  );
  if (kind === "rocket") {
    recoilRemaining = 1;
    flashRemaining = 0.055;
  }
  const direction = camera.getWorldDirection(new THREE.Vector3());
  const start = camera.position.clone().addScaledVector(direction, 0.35);
  const position = point ?? start,
    velocity = direction.multiplyScalar(kind === "rocket" ? 32 : 11);
  if (kind === "grenade") velocity.y += 3.2;
  const p: Projectile = {
    id: ++projectileSerial,
    kind,
    position: { x: position.x, y: position.y, z: position.z },
    velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
    fuse:
      kind === "rocket"
        ? WEAPONS.rocket.range / 32
        : kind === "grenade"
          ? 3
          : Infinity,
    settled: kind === "c4",
    ...(attachedPieceId ? { attachedPieceId } : {}),
  };
  projectiles.push(p);
  const rig = weaponRigs.get(kind);
  const visual: THREE.Object3D =
    kind === "rocket"
      ? (rocketModel() ?? new THREE.Group())
      : (rig?.gun.root.clone(true) ?? new THREE.Group());
  visual.position.copy(position);
  visual.quaternion.identity();
  visual.scale.setScalar(1);
  visual.visible = true;
  visual.traverse((o) => {
    if (o instanceof THREE.Mesh && o.geometry instanceof THREE.ConeGeometry)
      o.visible = false;
  });
  if (kind === "rocket" && !visual.userData.ammoSource) {
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.42, 12),
      new THREE.MeshStandardMaterial({ color: 0x677b43, roughness: 0.35 }),
    );
    body.rotation.x = Math.PI / 2;
    visual.add(body);
    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.055, 0.15, 12),
      new THREE.MeshStandardMaterial({ color: 0x333e46 }),
    );
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = -0.28;
    visual.add(nose);
    visual.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, -1),
      velocity.clone().normalize(),
    );
    visual.userData.ownedProjectile = true;
  }
  if (kind === "rocket" && visual.userData.ammoSource)
    visual.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      velocity.clone().normalize(),
    );
  if (kind === "c4" && normal)
    visual.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  if (kind === "rocket")
    canvas.dataset.rocketModelSource = visual.userData.ammoSource ?? "fallback";
  scene.add(visual);
  projectileModels.set(p.id, visual);
  reconcileEquipment();
  updateHud();
}
function explode(p: Projectile) {
  explosionSerial++;
  playAt("explosion", p.position, 1, 150);
  const center = new THREE.Vector3(p.position.x, p.position.y, p.position.z),
    spec = BLAST[p.kind];
  for (const u of enemies) {
    if (u.enemy.health <= 0) continue;
    const target = new THREE.Vector3(u.enemy.x, 0.9, u.enemy.z),
      distance = center.distanceTo(target);
    let damage = blastDamage(p.kind, distance);
    if (!damage) continue;
    if (
      blastOccluded(center, target, [
        ...shotObstacles,
        ...lootMeshes,
        ...construction.children,
      ])
    )
      damage = 0;
    if (damage) damageEnemy(u.enemy, damage);
  }
  const playerTarget = new THREE.Vector3(player.x, vertical + 1, player.z);
  let selfDamage = blastDamage(p.kind, center.distanceTo(playerTarget));
  if (selfDamage) {
    if (
      blastOccluded(center, playerTarget, [
        ...shotObstacles,
        ...lootMeshes,
        ...construction.children,
      ])
    )
      selfDamage = 0;
    if (inReleaseArea()) selfDamage = 0;
    health = Math.max(0, health - selfDamage);
    if (selfDamage > 0) sound.play("hurt", { gain: 0.65, interval: 0.15 });
    if (health <= 0) {
      recordDeath();
    }
  }
  if (p.kind === "c4") {
    const damage = damageStructuresWithC4(
      save.pieces,
      p.position,
      p.attachedPieceId,
      (piece, target) =>
        !blastOccluded(
          center,
          new THREE.Vector3(target.x, target.y, target.z),
          [
            ...shotObstacles,
            ...lootMeshes,
            ...construction.children.filter(
              (root) => root.userData.pieceId !== piece.id,
            ),
          ],
        ),
    );
    if (damage.damaged.length) {
      for (const id of damage.destroyed) {
        const piece = save.pieces.find((p) => p.id === id);
        if (piece?.kind === "storage")
          for (const item of piece.contents ?? [])
            if (item)
              inventory().drops.push({
                ...item,
                x: piece.x,
                z: piece.z,
                y: pieceBase(piece, save.pieces),
              });
      }
      save.pieces = damage.pieces;
      rebuildConstruction();
      persist();
    }
  }
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 12, 8),
    new THREE.MeshBasicMaterial({
      color: 0xffa447,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    }),
  );
  mesh.position.copy(center);
  scene.add(mesh);
  blastEffects.push({ mesh, life: 0.45, radius: spec.radius });
  const removed = projectileModels.get(p.id);
  if (removed) {
    disposeProjectile(removed);
    scene.remove(removed);
  }
  projectileModels.delete(p.id);
  const index = projectiles.indexOf(p);
  if (index >= 0) projectiles.splice(index, 1);
  toast(p.kind.toUpperCase() + " blast");
  updateHud();
}
function detonateC4() {
  if (!playing || health <= 0) return;
  if (projectiles.some((p) => p.kind === "c4")) {
    detonationRemaining = 0.5;
    sound.play("detonate", { gain: 0.5 });
  }
  for (const p of [...projectiles]) if (p.kind === "c4") explode(p);
}
$("#detonate").addEventListener("click", detonateC4);
function updateExplosives(dt: number) {
  detonationRemaining = Math.max(0, detonationRemaining - dt);
  if (useRemaining > 0) {
    const previous = useRemaining;
    useRemaining = Math.max(0, useRemaining - dt);
    if (previous > 0.4 && useRemaining <= 0.4 && pendingUse) {
      const use = pendingUse;
      pendingUse = undefined;
      if (health > 0 && !build && tool === use.kind)
        spawnExplosive(use.kind, use.point, use.normal, use.attachedPieceId);
    }
  }
  if (reloadRequested && useRemaining === 0) {
    reloadRequested = false;
    requestReload();
  }
  const obstacles = projectiles.some((p) => p.kind !== "c4")
    ? explosiveObstacles()
    : [];
  for (const p of [...projectiles]) {
    if (
      advanceProjectile(p, dt, (a, b) => {
        const start = new THREE.Vector3(a.x, a.y, a.z),
          end = new THREE.Vector3(b.x, b.y, b.z),
          delta = end.clone().sub(start),
          distance = delta.length();
        if (distance > 0) {
          flightRay.set(start, delta.normalize());
          flightRay.far = distance + 0.07;
          const hit = flightRay.intersectObjects(obstacles, true)[0];
          if (hit) {
            const normal = hit.face
              ? hit.face.normal
                  .clone()
                  .transformDirection(hit.object.matrixWorld)
              : new THREE.Vector3(0, 1, 0);
            return { point: hit.point, normal };
          }
        }
        const floor =
          surfaceHeight({ x: b.x, z: b.z }, save.pieces, a.y + 0.1) + 0.08;
        if (b.y < floor)
          return {
            point: { x: b.x, y: floor, z: b.z },
            normal: { x: 0, y: 1, z: 0 },
          };
        return undefined;
      })
    ) {
      explode(p);
      continue;
    }
    const visual = projectileModels.get(p.id);
    if (visual) {
      visual.position.set(p.position.x, p.position.y, p.position.z);
      if (p.kind === "grenade" && !p.settled) visual.rotation.x += dt * 6;
    }
  }
  for (let i = blastEffects.length - 1; i >= 0; i--) {
    const effect = blastEffects[i];
    effect.life -= dt;
    effect.mesh.scale.setScalar((1 - effect.life / 0.45) * effect.radius + 0.2);
    (effect.mesh.material as THREE.MeshBasicMaterial).opacity =
      Math.max(0, effect.life / 0.45) * 0.65;
    if (effect.life <= 0) {
      scene.remove(effect.mesh);
      effect.mesh.geometry.dispose();
      (effect.mesh.material as THREE.Material).dispose();
      blastEffects.splice(i, 1);
    }
  }
}

let punchRemaining = 0,
  punchCooldown = 0,
  punchLanded = false,
  punchSerial = 0;
let lastShot = 0,
  clock = 0,
  lastHud = 0,
  lastFrame = performance.now(),
  frameCount = 0,
  fpsAt = performance.now(),
  fps = 0;
const heldResource = createHeldResource();
viewCamera.add(heldResource.root);
heldResource.setAspect(camera.aspect);
const harvestView = createHarvestView();
viewCamera.add(harvestView.root);
harvestView.setAspect(camera.aspect);
let harvestAction:
    | { id: string; kind: GatherKind; elapsed: number; hit: boolean }
    | undefined,
  gatherPointer: number | undefined,
  lastHarvest: unknown = null,
  lastResourceCheck = 0,
  lastPopulation = 0;
function nearestResource() {
  aimRay();
  const nearby = resourceWorld
    .near(player, 5)
    .map((r) => nature.proxies.get(r.id))
    .filter((o): o is THREE.Mesh => !!o);
  const hit = raycaster
    .intersectObjects(nearby, true)
    .find((h) => h.distance <= 3.2);
  if (!hit) return undefined;
  const cover = raycaster.intersectObjects(
    [...shotObstacles, ...lootMeshes, ...construction.children],
    true,
  )[0];
  if (cover && cover.distance < hit.distance - 0.04) return undefined;
  const resource = resourceWorld.get(hit.object.userData.resourceId);
  return resource && resource.health > 0 ? resource : undefined;
}
function cancelHarvest() {
  harvestAction = undefined;
  gatherPointer = undefined;
  harvestView.root.visible = false;
  viewModel.root.visible = true;
}
function beginHarvest() {
  if (!playing || health <= 0 || build || loadout.reload || useRemaining > 0)
    return false;
  if (harvestAction) return true;
  const target = nearestResource();
  if (!target) return false;
  const needed =
    GATHER_TYPES[target.kind].action === "chop" ? "axe" : "pickaxe";
  if (!countItem(inventory(), needed)) {
    notifyInventory(
      "Carry an " +
        (needed === "axe" ? "axe" : "pickaxe") +
        " to gather this resource",
    );
    return false;
  }
  if (
    roomFor(inventory(), GATHER_TYPES[target.kind].resource) <
    GATHER_TYPES[target.kind].yield
  ) {
    notifyInventory("Inventory full · make room before gathering");
    return false;
  }
  setAim(false);
  harvestAction = { id: target.id, kind: target.kind, elapsed: 0, hit: false };
  sound.play("punch-swing", { gain: 0.18, pitch: 0.8 });
  viewModel.root.visible = false;
  harvestView.root.visible = true;
  return true;
}
function updateHarvest(dt: number) {
  if (harvestAction) {
    const action = harvestAction,
      config = GATHER_TYPES[action.kind];
    action.elapsed = Math.min(config.duration, action.elapsed + dt);
    if (!action.hit && action.elapsed >= config.duration * 0.55) {
      action.hit = true;
      const target = nearestResource();
      if (action.id === "air") landPunch();
      if (
        target?.id === action.id &&
        roomFor(inventory(), config.resource) < config.yield
      ) {
        notifyInventory("Inventory full · swing cancelled");
        cancelHarvest();
      } else if (target?.id === action.id && health > 0 && !build) {
        const result = resourceWorld.hit(action.id, Date.now());
        if (result) {
          const awarded = addItem(inventory(), result.resource, result.amount);
          sound.play(config.action === "chop" ? "chop" : "mine", {
            gain: 0.6,
            pitch: 0.94 + Math.random() * 0.12,
          });
          lastHarvest = {
            id: target.id,
            kind: target.kind,
            health: target.health,
            depleted: result.depleted,
            respawnAt: target.respawnAt,
            resource: result.resource,
            amount: awarded,
          };
          if (result.depleted) {
            sound.play(config.action === "chop" ? "tree-fall" : "node-break", {
              gain: 0.65,
            });
            nature.depleted(target, player);
            nature.update(player, 0);
          }
          persist();
          toast(
            `+${awarded} ${result.resource.toUpperCase()}${result.depleted ? " · depleted" : ""}`,
          );
          updateHud();
        }
      }
    }
    if (action.elapsed >= config.duration) {
      harvestAction = undefined;
      harvestView.root.visible = false;
      viewModel.root.visible = true;
    }
  }
  if (
    !harvestAction &&
    (gatherPointer !== undefined ||
      keys.has("KeyE") ||
      (tool === "hands" && firePointer !== undefined))
  )
    beginHarvest();
  if (Date.now() - lastResourceCheck > 1000) {
    lastResourceCheck = Date.now();
    if (resourceWorld.tick(Date.now(), player)) {
      nature.update(player, 0);
      persist();
    }
  }
}
const gatherButton = $<HTMLButtonElement>("#gather");
gatherButton.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  gatherPointer = e.pointerId;
  gatherButton.setPointerCapture(e.pointerId);
  beginHarvest();
});
for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
  gatherButton.addEventListener(type, (e) => {
    if (gatherPointer === (e as PointerEvent).pointerId)
      gatherPointer = undefined;
  });
gatherButton.addEventListener("click", (e) => {
  if (e.detail === 0) beginHarvest();
});
function toggleBuild() {
  cancelHarvest();
  cancelReload(loadout);
  punchRemaining = 0;
  pendingUse = undefined;
  reloadRequested = false;
  useRemaining = 0;
  build = !build;
  sound.play("equip", { gain: 0.25 });
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
  aiming =
    value &&
    tool !== "hands" &&
    tool !== "grenade" &&
    tool !== "c4" &&
    !build &&
    !loadout.reload;
  camera.fov = aiming && tool !== "hands" ? WEAPONS[tool].zoom : 72;
  camera.updateProjectionMatrix();
  $("#scope-overlay").hidden = !(aiming && tool === "sniper");
  $("#aim").classList.toggle("selected", aiming);
}
function equip(next: Tool) {
  cancelHarvest();
  cancelReload(loadout);
  punchRemaining = 0;
  pendingUse = undefined;
  reloadRequested = false;
  useRemaining = 0;
  explosiveLatch = false;
  if (build) toggleBuild();
  setAim(false);
  firePointer = undefined;
  $("#fire").classList.remove("held");
  viewModel.root.visible = false;
  if (next !== "hands") {
    let rig = weaponRigs.get(next);
    if (!rig) {
      rig = createPlayerViewRig(next);
      weaponRigs.set(next, rig);
      viewCamera.add(rig.root);
    }
    viewModel = rig;
  }
  viewModel.root.visible = true;
  viewModel.setAspect(camera.aspect);
  harvestView.setAspect(camera.aspect);
  heldResource.setAspect(camera.aspect);
  viewModel.equip(next !== "hands");
  muzzle = viewModel.flash;
  recoilRemaining = flashRemaining = 0;
  tool = next;
  sound.play("equip", { gain: 0.3 });
  refreshHotbar();
}
let inventoryNoticeAt = -Infinity;
function notifyInventory(message: string) {
  if (performance.now() - inventoryNoticeAt > 1500) {
    inventoryNoticeAt = performance.now();
    toast(message);
  }
}
function storeCurrentGun() {
  if (tool === "hands" || !isGun(tool) || !equippedItemId) return;
  const item =
    inventory().slots.find((s) => s?.id === equippedItemId) ??
    inventory().reserve.find((s) => s.id === equippedItemId) ??
    inventory().drops.find((s) => s.id === equippedItemId);
  if (item) item.magazine = loadout.rounds[tool];
}
function reconcileEquipment() {
  const item = selectedItem(inventory()),
    next = item ? itemTool(item.kind) : "hands";
  if (item?.id === equippedItemId && tool === next) return;
  storeCurrentGun();
  equip(next);
  equippedItemId = item?.id;
  if (item && isGun(item.kind))
    loadout.rounds[next as WeaponKind] =
      item.magazine ?? WEAPONS[next as WeaponKind].magazineSize;
  if (item && (item.kind === "grenade" || item.kind === "c4"))
    loadout.rounds[item.kind] = Math.min(
      item.quantity,
      WEAPONS[item.kind].magazineSize,
    );
}
function activateHand(index: number, toggle = true) {
  storeCurrentGun();
  inventory().active =
    index >= 0 && index < 5
      ? toggle && inventory().active === index
        ? -1
        : index
      : -1;
  cleanHotbar(inventory());
  reconcileEquipment();
  persist();
  updateHud();
}
function refreshHotbar() {
  const inv = inventory();
  for (let i = 0; i < 5; i++) {
    const button = $<HTMLButtonElement>("#hotbar-" + i),
      item = inv.slots.find((s) => s?.id === inv.hotbar[i]) ?? null;
    const html = `<small class="slot-number">${i + 1}</small>${itemMarkup(item)}`;
    if (button.innerHTML !== html) button.innerHTML = html;
    button.classList.toggle("selected", inv.active === i);
    button.setAttribute("aria-pressed", String(inv.active === i));
    button.setAttribute(
      "aria-label",
      `Hand ${i + 1}: ${item ? itemName(item.kind) : "Empty hands"}`,
    );
  }
}
function inventoryChanged() {
  cleanHotbar(inventory());
  reconcileEquipment();
  persist();
  updateHud();
}
const atReserve = () => Math.hypot(player.x - START.x, player.z - START.z) <= 6;
const inventoryDialog = createInventoryDialog({
  get: inventory,
  changed: inventoryChanged,
  activate: activateHand,
  health: () => health,
  atReserve,
  close: closeInventory,
  store(id) {
    void id;
    toast("Build a storage chest on your plot to store items");
    return false;
  },
  withdraw(kind) {
    if (!atReserve()) return 0;
    const n = withdrawStack(inventory(), kind);
    if (n) {
      inventoryChanged();
      sound.play("pickup", { ui: true, gain: 0.2 });
    }
    return n;
  },
  drop(id) {
    storeCurrentGun();
    let point = { x: player.x, z: player.z, y: vertical };
    for (let i = 0; i < 8; i++) {
      const a = yaw + (i * Math.PI) / 4,
        p = {
          x: player.x - Math.sin(a) * 1.8,
          z: player.z - Math.cos(a) * 1.8,
        };
      if (!blocked(p, save.pieces, vertical)) {
        const y = surfaceHeight(p, save.pieces, vertical + 0.75);
        if (Math.abs(y - vertical) < 0.75) {
          point = { ...p, y };
          break;
        }
      }
    }
    const ok = dropStack(inventory(), id, point);
    if (ok) {
      inventoryChanged();
      sound.play("pickup", { ui: true, gain: 0.2, pitch: 0.85 });
    } else notifyInventory("Too many dropped stacks nearby");
    return ok;
  },
});
let stationOpen = false,
  stationId: string | undefined,
  resumeAfterStation = false,
  productionSaveElapsed = 0,
  lastStationRender = 0;
function reachableStation(piece: Piece) {
  if (
    (!isStationKind(piece.kind) && piece.kind !== "storage") ||
    Math.hypot(piece.x - player.x, piece.z - player.z) > 3.2 ||
    (piece.kind !== "storage" &&
      Math.abs(pieceBase(piece, save.pieces) - vertical) > 1.1)
  )
    return false;
  const origin = new THREE.Vector3(player.x, vertical + 1.65, player.z),
    target = new THREE.Vector3(
      piece.x,
      pieceBase(piece, save.pieces) +
        (piece.kind === "storage" ? storageSpec(piece).height / 2 : 0.8),
      piece.z,
    );
  if (piece.kind === "storage" && origin.distanceTo(target) > 3.6) return false;
  coverRay.set(origin, target.clone().sub(origin).normalize());
  coverRay.far = origin.distanceTo(target) - 0.05;
  return !coverRay
    .intersectObjects([...shotObstacles, ...construction.children], true)
    .some((hit) => hit.object.userData.pieceId !== piece.id);
}
function nearestStation() {
  const nearby = save.pieces.filter(
    (p) =>
      (isStationKind(p.kind) || p.kind === "storage") && reachableStation(p),
  );
  if (!nearby.length) return;
  const aimed = aimedPiece();
  if (aimed && nearby.includes(aimed)) return aimed;
  return nearby.sort(
    (a, b) =>
      Math.hypot(
        a.x - player.x,
        a.z - player.z,
        pieceBase(a, save.pieces) +
          (a.kind === "storage" ? storageSpec(a).height / 2 : 0.8) -
          vertical -
          1.65,
      ) -
      Math.hypot(
        b.x - player.x,
        b.z - player.z,
        pieceBase(b, save.pieces) +
          (b.kind === "storage" ? storageSpec(b).height / 2 : 0.8) -
          vertical -
          1.65,
      ),
  )[0];
}
const storageDialog = createStorageDialog({
  inventory,
  spec: () => {
    const p = save.pieces.find((p) => p.id === stationId);
    return { size: storageSize(p ?? {}), ...storageSpec(p ?? {}) };
  },
  slots: () => {
    const p = save.pieces.find(
      (p) => p.id === stationId && p.kind === "storage",
    );
    return p ? (p.contents ??= emptyStorage(storageSize(p))) : emptyStorage();
  },
  close: () => closeStation(),
  transfer(side, index, quantity) {
    const p = save.pieces.find(
      (p) => p.id === stationId && p.kind === "storage",
    );
    if (!stationOpen || !p || !reachableStation(p)) return 0;
    storeCurrentGun();
    p.contents ??= emptyStorage(storageSize(p));
    const n =
      side === "bag"
        ? transferStorage(inventory().slots, p.contents, index, quantity)
        : transferStorage(p.contents, inventory().slots, index, quantity);
    if (n) {
      inventoryChanged();
      sound.play("pickup", { ui: true, gain: 0.25 });
    }
    return n;
  },
});
const stationDialog = createStationDialog({
  inventory,
  piece: () => save.pieces.find((p) => p.id === stationId),
  close: () => closeStation(),
  action(action, recipe) {
    const piece = save.pieces.find((p) => p.id === stationId);
    if (!piece || !reachableStation(piece)) return "Move closer to the station";
    storeCurrentGun();
    const error =
      action === "start"
        ? startProduction(piece, inventory(), recipe ?? "")
        : action === "collect"
          ? collectProduction(piece, inventory())
          : cancelProduction(piece, inventory());
    if (!error) {
      reconcileEquipment();
      persist();
      updateHud();
      sound.play(
        action === "collect"
          ? "loot"
          : action === "cancel"
            ? "pickup"
            : "reload-rack",
        { ui: true, gain: 0.3 },
      );
    }
    return error;
  },
});
function openStation(piece: Piece) {
  if (stationOpen || inventoryOpen || !playing || !reachableStation(piece))
    return;
  stationId = piece.id;
  resumeAfterStation = playing;
  storeCurrentGun();
  cancelReload(loadout);
  resetInput();
  pendingUse = undefined;
  useRemaining = 0;
  stationOpen = true;
  playing = false;
  sound.setPaused(true);
  sound.play("ui-open", { ui: true, gain: 0.2 });
  persist();
  if (document.pointerLockElement) document.exitPointerLock();
  if (piece.kind === "storage") storageDialog.open();
  else stationDialog.open();
  canvas.dataset.stationOpen = "true";
}
function closeStation(resume = true) {
  if (!stationOpen) return;
  stationDialog.close();
  storageDialog.close();
  stationOpen = false;
  stationId = undefined;
  playing = resume && resumeAfterStation && health > 0;
  persist();
  sound.setPaused(!playing);
  sound.play("ui-close", { ui: true, gain: 0.2 });
  lastFrame = performance.now();
  $("#inventory-button").focus();
  if (playing && !touch) captureMouse();
  canvas.dataset.stationOpen = "false";
}
function tickProduction(seconds: number, now: number) {
  const active = save.pieces.some((p) => p.job && p.job.remaining > 0);
  if (active) {
    const completed = advanceProduction(save.pieces, seconds);
    productionSaveElapsed += seconds;
    if (completed.length || productionSaveElapsed >= 1) {
      productionSaveElapsed = 0;
      persist();
    }
    for (const id of completed) {
      const p = save.pieces.find((p) => p.id === id);
      if (p && Math.hypot(p.x - player.x, p.z - player.z) < 10)
        sound.play("pickup", { ui: stationOpen, gain: 0.25 });
    }
  }
  if (stationOpen && now - lastStationRender > 150) {
    if (save.pieces.find((p) => p.id === stationId)?.kind !== "storage")
      stationDialog.render();
    lastStationRender = now;
    canvas.dataset.productionJobs = JSON.stringify(
      save.pieces
        .filter((p) => p.job)
        .map((p) => ({ id: p.id, kind: p.kind, ...p.job })),
    );
  }
}
function openInventory() {
  if (stationOpen) closeStation();
  if (inventoryOpen || health <= 0) return;
  resumeAfterInventory = playing;
  storeCurrentGun();
  cancelReload(loadout);
  resetInput();
  pendingUse = undefined;
  useRemaining = 0;
  inventoryOpen = true;
  canvas.dataset.inventoryOpen = "true";
  playing = false;
  persist();
  if (document.pointerLockElement) document.exitPointerLock();
  sound.setPaused(true);
  sound.play("ui-open", { ui: true, gain: 0.2 });
  inventoryDialog.open();
  canvas.dataset.audio = JSON.stringify(sound.diagnostics());
}
function closeInventory() {
  if (!inventoryOpen) return;
  inventoryDialog.close();
  inventoryOpen = false;
  canvas.dataset.inventoryOpen = "false";
  reconcileEquipment();
  persist();
  updateHud();
  playing = resumeAfterInventory && health > 0;
  sound.setPaused(!playing);
  sound.play("ui-close", { ui: true, gain: 0.2 });
  canvas.dataset.audio = JSON.stringify(sound.diagnostics());
  lastFrame = performance.now();
  $("#inventory-button").focus();
  if (playing && !touch) captureMouse();
}

let housingView = createHousingView(scene, survival());
let survivalOpen = false,
  resumeAfterSurvival = false,
  lastHousingTick = 0;
function plotSignDistance(p: { x: number; z: number; depth: number }) {
  return Math.hypot(player.x - p.x, player.z - p.z - p.depth / 2 - 1);
}
function settleHousing() {
  const result = settleUpkeep(survival(), Date.now());
  for (const id of result.cleared) {
    const plot = survival().plots.find((p) => p.id === id);
    if (plot) save.pieces = save.pieces.filter((p) => !inPlot(p, plot));
  }
  if (result.cleared.length) {
    rebuildConstruction();
  }
  if (result.forfeited) {
    reserveOwnedLand();
    toast("Plot forfeited · unpaid upkeep");
  }
  if (result.forfeited || result.cleared.length) {
    persist();
    updateHud();
    needsRender = true;
    if (survivalOpen) survivalDialog.render();
  }
}
const survivalDialog = createSurvivalDialog({
  get: survival,
  distance: plotSignDistance,
  close: () => closeSurvival(),
  buy(id) {
    settleHousing();
    const plot = survival().plots.find((p) => p.id === id);
    if (!plot || plotSignDistance(plot) > 4) return "Visit the plot sign first";
    const reason = purchasePlot(survival(), id, Date.now());
    if (reason) return reason;
    reserveOwnedLand();
    persist();
    updateHud();
    return "Plot purchased · one day of upkeep included";
  },
  pay(days) {
    settleHousing();
    const plot = survival().plots.find(
      (p) => p.id === survival().lease?.plotId,
    );
    if (!plot || plotSignDistance(plot) > 4)
      return "Visit your plot sign to pay upkeep";
    const reason = payUpkeep(survival(), days, Date.now());
    if (reason) return reason;
    persist();
    updateHud();
    return "Upkeep paid · funds protected from raids";
  },
  craft(kind) {
    storeCurrentGun();
    const next = handcraft(inventory(), kind);
    if (!next) return "Need materials and a free inventory slot";
    storeCurrentGun();
    save.inventory = next;
    inventoryChanged();
    return itemName(kind) + " crafted · bind it to a hand slot in your bag";
  },
});
function openSurvival() {
  if (health <= 0) return;
  if (stationOpen) closeStation();
  if (inventoryOpen) closeInventory();
  settleHousing();
  resumeAfterSurvival = playing;
  playing = false;
  resetInput();
  cancelHarvest();
  cancelReload(loadout);
  survivalOpen = true;
  sound.setPaused(true);
  if (document.pointerLockElement) document.exitPointerLock();
  survivalDialog.open();
}
function closeSurvival(resume = true) {
  if (!survivalOpen) return;
  survivalDialog.close();
  survivalOpen = false;
  playing = resume && resumeAfterSurvival && health > 0;
  lastFrame = performance.now();
  sound.setPaused(!playing);
  persist();
  updateHud();
  needsRender = true;
  if (playing && !touch) captureMouse();
}
$("#housing-button").addEventListener("click", openSurvival);
function nearestDrop() {
  let result: WorldDrop | undefined;
  let distance = 3.2;
  for (const d of inventory().drops) {
    const dist = Math.hypot(d.x - player.x, d.z - player.z);
    if (dist >= distance || Math.abs(d.y - vertical) > 1.1) continue;
    const from = new THREE.Vector3(player.x, vertical + 1.65, player.z),
      target = new THREE.Vector3(d.x, d.y + 0.22, d.z);
    coverRay.set(from, target.clone().sub(from).normalize());
    coverRay.far = from.distanceTo(target) - 0.08;
    if (
      coverRay.intersectObjects(
        [...shotObstacles, ...construction.children],
        true,
      ).length
    )
      continue;
    result = d;
    distance = dist;
  }
  return result;
}
function resetInput() {
  footsteps.reset();
  cancelHarvest();
  setAim(false);
  keys.clear();
  explosiveLatch = false;
  firePointer = undefined;
  $("#fire").classList.remove("held");
  joystick.x = joystick.y = 0;
  movePointer = lookPointer = undefined;
  $("#stick").style.transform = "translate(-50%,-50%)";
}
function pause() {
  if (survivalOpen) {
    closeSurvival(false);
  }
  if (stationOpen) closeStation(false);
  if (inventoryOpen) return;
  persist();
  playing = false;
  sound.setPaused(true);
  canvas.dataset.audio = JSON.stringify(sound.diagnostics());
  resetInput();
  $("#menu").hidden = false;
  $("#start").innerHTML = 'RESUME EXPLORING <span aria-hidden="true">↗</span>';
  $("#start").focus();
  if (document.pointerLockElement) document.exitPointerLock();
}
function captureMouse() {
  if (touch) return;
  void Promise.resolve(canvas.requestPointerLock?.()).catch(() => {
    if (playing && !inventoryOpen && !stationOpen) pause();
  });
}
function start() {
  settleHousing();
  if (survival().dead) {
    $("#menu").hidden = true;
    $("#hud").hidden = false;
    $("#defeated").hidden = false;
    return;
  }
  playing = true;
  sound.setPaused(false);
  void sound.unlock().then(() => {
    if (playing) sound.play("ui-open", { gain: 0.2 });
  });
  $("#hud").hidden = false;
  $("#menu").hidden = true;
  lastFrame = performance.now();
  if (!touch) captureMouse();
  if (!saveAvailable)
    toast("Storage unavailable · progress lasts for this session");
  else if (legacyMapPreserved)
    toast(
      "Original map preserved · your existing base needs a larger city parcel",
    );
  else toast("Explore the town. Buy land and keep its upkeep paid.");
}
$("#start").addEventListener("click", start);
$("#menu").addEventListener("keydown", (e) => {
  if (e.code !== "Tab" || $("#menu").hidden) return;
  const controls = [
      ...$("#menu").querySelectorAll<HTMLElement>(
        "button:not(:disabled),input:not(:disabled),summary",
      ),
    ],
    first = controls[0],
    last = controls.at(-1);
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last?.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first?.focus();
  }
});

$("#view-models").addEventListener("click", () => {
  pause();
  openActorPreview();
  document.querySelector<HTMLButtonElement>("#close-actors")?.focus();
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
  save.resources = { rock: 0, sulfur: 0, metal: 0 };
  save.wood = 0;
  save.survival = newSurvival();
  if (COMPACT.active) save.survival.mapVersion = 2;
  save.survival.plots = createHousingPlots([]);
  save.inventory = emptyInventory();
  save.inventory.ammoVersion = 1;
  syncCarry();
  equippedItemId = undefined;
  reconcileEquipment();
  resourceWorld.reset();
  reserveOwnedLand();
  housingView.dispose();
  housingView = createHousingView(scene, survival());
  nature.update(player, 0);
  cancelHarvest();
  loadout = newWeaponState();
  clearExplosives();
  punchRemaining = punchCooldown = 0;
  health = 100;
  resetDoors();
  for (const unit of enemies)
    Object.assign(
      unit.enemy,
      newEnemy(unit.enemy.kind, save.pieces, unit.patrol),
    );
  clearBullets();
  rebuildConstruction();
  player = { ...START };
  yaw = COMPACT.active ? Math.PI : 0;
  pitch = -0.03;
  persist();
  updateHud();
  toast("Local prototype reset");
});
$("#build-tool").addEventListener("click", toggleBuild);
$("#inventory-button").addEventListener("click", () =>
  inventoryOpen ? closeInventory() : openInventory(),
);
for (let i = 0; i < 5; i++)
  $("#hotbar-" + i).addEventListener("click", () => activateHand(i));
$("#aim").addEventListener("click", () => setAim(!aiming));
for (const button of document.querySelectorAll<HTMLButtonElement>(
  "[data-piece]",
))
  button.addEventListener("click", () => {
    selected = button.dataset.piece as PieceKind;
    rebuildPreview();
    updateHud();
  });
for (const button of document.querySelectorAll<HTMLButtonElement>(
  "[data-storage-size]",
))
  button.onclick = () => {
    buildStorageSize = button.dataset.storageSize as StorageSize;
    rebuildPreview();
    updateHud();
    updatePreview();
  };
function rebuildPreview() {
  if (preview) scene.remove(preview);
  preview = undefined;
}
function selectBuildMaterial(next: StructureMaterial) {
  buildMaterial = next;
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-build-material]",
  )) {
    const active = button.dataset.buildMaterial === next;
    button.classList.toggle("selected", active);
    button.setAttribute("aria-pressed", String(active));
  }
  rebuildPreview();
  updateHud();
  updatePreview();
}
for (const button of document.querySelectorAll<HTMLButtonElement>(
  "[data-build-material]",
))
  button.addEventListener("click", () =>
    selectBuildMaterial(button.dataset.buildMaterial as StructureMaterial),
  );
$("#rotate").addEventListener("click", () => {
  rotation = (rotation + 1) % 4;
  rebuildPreview();
});
function place() {
  if (!playing || !build) return;
  updatePreview();
  if (!candidate) return;
  reason =
    housingPlacementReason(survival(), candidate, save.pieces, Date.now()) ||
    placementReason(
      candidate,
      { ...player, y: vertical },
      save.pieces,
      save.wood,
    );
  if (reason) return toast(reason);
  if (isStationKind(candidate.kind)) {
    const missing = missingIngredients(
      inventory(),
      STATIONS[candidate.kind].extras,
    );
    if (missing) return toast("Need " + missing);
  }
  const p = {
    ...candidate,
    id: crypto.randomUUID(),
    health: maxStructureHealth(candidate),
  };
  save.pieces.push(p);
  sound.play(
    p.material === "stone"
      ? "build-stone"
      : p.material === "metal"
        ? "build-metal"
        : "build-wood",
    { gain: 0.65 },
  );
  takeItem(inventory(), "wood", pieceCost(p));
  if (isStationKind(p.kind))
    for (const [kind, n] of ingredientEntries(STATIONS[p.kind].extras))
      takeItem(inventory(), kind, n);
  reconcileEquipment();
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
  if (hit) {
    const cover = raycaster.intersectObjects(
      [...shotObstacles, ...lootMeshes],
      true,
    )[0];
    if (cover && cover.distance < hit.distance - 0.03) return undefined;
  }
  return hit
    ? save.pieces.find(
        (p) =>
          p.id ===
          (hit.object.userData.pieceId ??
            hit.object.userData.pieceIds?.[hit.instanceId!]),
      )
    : undefined;
}
function remove() {
  if (!playing) return;
  const p = aimedPiece();
  if (!p) return toast("Aim at one of your pieces within 8 m");
  if (!canRemove(p, save.pieces))
    return toast(
      "Remove attached doors, walls, floors, storage or stations first",
    );
  if (isStationKind(p.kind) && p.job)
    return toast("Collect or cancel this station’s job before dismantling");
  if (p.kind === "storage" && p.contents?.some(Boolean))
    return toast("Empty this storage chest before dismantling it");
  const refund = dismantleRefund(p);
  const refundInventory = structuredClone(inventory());
  if (addItem(refundInventory, "wood", refund) !== refund)
    return toast("Make room for returned wood before dismantling");
  if (isStationKind(p.kind))
    for (const [kind, n] of ingredientEntries(STATIONS[p.kind].extras)) {
      const amount = Math.floor(
        (n * structureHealth(p)) / maxStructureHealth(p),
      );
      if (amount && addItem(refundInventory, kind, amount) !== amount)
        return toast("Make room for station materials before dismantling");
    }
  save.pieces = save.pieces.filter((s) => s.id !== p.id);
  sound.play("dismantle", { gain: 0.55 });
  rebuildConstruction();
  storeCurrentGun();
  const gun = refundInventory.slots.find((s) => s?.id === equippedItemId);
  if (gun && tool !== "hands" && isGun(tool))
    gun.magazine = loadout.rounds[tool];
  save.inventory = refundInventory;
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
    if (d >= distance || Math.abs((c.y ?? 0) - vertical) > 1.1) return;
    const from = new THREE.Vector3(player.x, vertical + 1.65, player.z),
      target = new THREE.Vector3(c.x, (c.y ?? 0) + c.height * 0.5, c.z);
    coverRay.set(from, target.clone().sub(from).normalize());
    coverRay.far = from.distanceTo(target) - 0.08;
    if (
      coverRay.intersectObjects(
        [...shotObstacles, ...construction.children],
        true,
      ).length
    )
      return;
    if (d < distance) {
      index = i;
      distance = d;
    }
  });
  return index;
}
function nearestDoor() {
  if (vertical > 2.2) return -1;
  let nearest = -1,
    distance = 2.4;
  for (let i = 0; i < BUILDINGS.length; i++) {
    if (!buildingEnabled(BUILDINGS[i])) continue;
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
function nearestMartDoor() {
  if (vertical > 2.2) return undefined;
  let nearest: { i: number; id: number } | undefined,
    distance = 2.4;
  for (let i = 0; i < BUILDINGS.length; i++) {
    const b = BUILDINGS[i];
    if (!isMart(b)) continue;
    for (let id = 1; id < 3; id++) {
      const p = martDoorPoint(id, martState(i).angles[id]),
        target = new THREE.Vector3(b.x + p.x, 1.3, b.z + p.z);
      const d = Math.hypot(player.x - target.x, player.z - target.z);
      if (d >= distance) continue;
      const from = new THREE.Vector3(player.x, 1.65 + vertical, player.z);
      coverRay.set(from, target.clone().sub(from).normalize());
      coverRay.far = from.distanceTo(target) + 0.15;
      const hit = coverRay.intersectObjects(
        [...shotObstacles, ...construction.children],
        true,
      )[0];
      if (
        hit &&
        !(
          hit.object.userData.doorIndex === i &&
          hit.object.userData.martDoorId === id
        ) &&
        hit.distance < from.distanceTo(target) - 0.1
      )
        continue;
      nearest = { i, id };
      distance = d;
    }
  }
  return nearest;
}
function nearestApartmentDoor() {
  let nearest: { i: number; id: number } | undefined,
    distance = 2.4;
  BUILDINGS.forEach((b, i) => {
    if (!isCityApartments(b)) return;
    apartmentDoors.forEach((d, id) => {
      if (Math.abs(vertical - d.y) > 1) return;
      const p = apartmentDoorPoint(i, id),
        target = new THREE.Vector3(b.x + p.x, d.y + 1.3, b.z + p.z);
      const dist = Math.hypot(player.x - target.x, player.z - target.z);
      if (dist >= distance) return;
      const from = new THREE.Vector3(player.x, vertical + 1.65, player.z);
      coverRay.set(from, target.clone().sub(from).normalize());
      coverRay.far = from.distanceTo(target) + 0.15;
      const hit = coverRay.intersectObjects(
        [...shotObstacles, ...construction.children],
        true,
      )[0];
      if (
        hit &&
        !(
          hit.object.userData.doorIndex === i &&
          hit.object.userData.apartmentDoorId === id
        ) &&
        hit.distance < from.distanceTo(target) - 0.1
      )
        return;
      nearest = { i, id };
      distance = dist;
    });
  });
  return nearest;
}
function nearestBuiltDoor() {
  let nearest: Piece | undefined,
    distance = 2.4;
  for (const p of save.pieces) {
    if (p.kind !== "door") continue;
    if (Math.abs(pieceBase(p, save.pieces) - vertical) > 1.5) continue;
    const d = Math.hypot(player.x - p.x, player.z - p.z);
    if (d >= distance) continue;
    const target = new THREE.Vector3(p.x, pieceBase(p, save.pieces) + 1.1, p.z),
      from = new THREE.Vector3(player.x, vertical + 1.65, player.z);
    coverRay.set(from, target.clone().sub(from).normalize());
    coverRay.far = from.distanceTo(target) + 0.05;
    const hit = coverRay.intersectObjects(
      [...shotObstacles, ...construction.children],
      true,
    )[0];
    if (
      hit &&
      hit.object.userData.pieceId !== p.id &&
      hit.distance < from.distanceTo(target) - 0.12
    )
      continue;
    nearest = p;
    distance = d;
  }
  return nearest;
}
function interact() {
  if (!playing) return;
  const drop = nearestDrop();
  if (drop) {
    if (drop.kind === "cash") {
      if (survival().cash + drop.quantity > 1000000)
        return toast("Cash limit reached");
      survival().cash += drop.quantity;
      inventory().drops = inventory().drops.filter((d) => d.id !== drop.id);
      inventoryChanged();
      return toast("Picked up $" + drop.quantity);
    }
    const n = pickupDrop(inventory(), drop.id);
    if (!n) return toast("Inventory full");
    inventoryChanged();
    sound.play("pickup", { gain: 0.35 });
    return toast("Picked up " + n + " " + itemName(drop.kind));
  }
  const station = nearestStation();
  if (station) {
    openStation(station);
    return;
  }
  if (nearestResource()) {
    beginHarvest();
    return;
  }
  const built = nearestBuiltDoor();
  if (built) {
    built.doorAngle ??= built.open ? -Math.PI / 2 : 0;
    built.open = !built.open;
    sound.play(built.open ? "door-open" : "door-close", { gain: 0.5 });
    persist();
    updateHud();
    return toast(built.open ? "Opening wood door" : "Closing wood door");
  }
  if (jailGateNearby(player, vertical)) {
    jailGate.open = !jailGate.open;
    sound.play(jailGate.open ? "door-open" : "door-close", { gain: 0.5 });
    return toast(
      jailGate.open ? "Opening compound gates" : "Closing compound gates",
    );
  }
  const apartment = nearestApartmentDoor();
  if (apartment) {
    const s = apartmentDoorState(apartment.i);
    s.targets[apartment.id] = !s.targets[apartment.id];
    sound.play(s.targets[apartment.id] ? "door-open" : "door-close", {
      gain: 0.5,
    });
    updateHud();
    return toast(
      (s.targets[apartment.id] ? "Opening " : "Closing ") +
        apartmentDoors[apartment.id].label,
    );
  }
  const mart = nearestMartDoor();
  if (mart) {
    const s = martState(mart.i);
    s.targets[mart.id] = !s.targets[mart.id];
    sound.play(s.targets[mart.id] ? "door-open" : "door-close", { gain: 0.5 });
    updateHud();
    return toast(
      (s.targets[mart.id] ? "Opening " : "Closing ") +
        (mart.id === 1 ? "delivery" : "stockroom") +
        " door",
    );
  }
  const door = nearestDoor();
  if (door >= 0) {
    toggleDoor(door);
    sound.play(doorTargets[door] ? "door-open" : "door-close", { gain: 0.5 });
    updateHud();
    return toast(
      (doorTargets[door] ? "Opening " : "Closing ") +
        BUILDINGS[door].name +
        " door",
    );
  }
  const plot = survival().plots.find((p) => plotSignDistance(p) < 4);
  if (plot) {
    openSurvival();
    return;
  }
  const i = nearestLoot();
  if (i < 0) return toast("Move closer to a crate or trash can");
  if ((survival().lootReadyAt[i] ?? 0) > Date.now())
    return toast("Container restocking · return later");
  storeCurrentGun();
  const rewards = scavengeRewards(inventory(), i, lootReward(LOOT[i]));
  if (!rewards) return toast("Inventory full · make room before searching");
  save.inventory = rewards.inventory;
  survival().cash = Math.min(1000000, survival().cash + rewards.cash);
  survival().lootReadyAt[i] = Date.now() + LOOT_COOLDOWN_MS;
  if (!save.opened.includes(i)) save.opened.push(i);
  sound.play("loot", { gain: 0.5 });
  persist();
  updateHud();
  toast(
    `${LOOT[i].name} · supplies and $${rewards.cash} · restocks in 10 minutes`,
  );
}
function jump() {
  if (
    playing &&
    vertical <= surfaceHeight(player, save.pieces, vertical + 0.02) + 0.001
  ) {
    verticalSpeed = 4.8;
    sound.play("jump", { gain: 0.25 });
  }
}
function requestReload() {
  if (
    tool === "grenade" ||
    tool === "c4" ||
    (tool === "rocket" && !countItem(inventory(), "rockets"))
  )
    return;
  if (!playing || health <= 0 || build || tool === "hands" || harvestAction)
    return;
  if (useRemaining > 0) {
    reloadRequested = true;
    return;
  }
  const ammo = ammoFor(tool);
  if (ammo && !countItem(inventory(), ammo))
    return toast("No " + itemName(ammo) + " carried");
  if (beginReload(loadout, tool)) {
    reloadSoundStage = 1;
    sound.play("reload-out", { gain: 0.45 });
    setAim(false);
    recoilRemaining = 0;
    updateHud();
  }
}
$("#reload").addEventListener("click", requestReload);
function punch() {
  if (punchCooldown > 0) return;
  punchCooldown = MELEE.interval;
  punchRemaining = MELEE.duration;
  punchLanded = false;
  punchSerial++;
  sound.play("punch-swing", { gain: 0.4 });
}
function landPunch() {
  aimRay();
  const hit = raycaster
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
    .find((h) => h.distance <= MELEE.range);
  const unit =
    hit &&
    enemies.find(
      (u) => u.enemy.health > 0 && u.hitbox.getObjectById(hit.object.id),
    );
  if (hit) sound.play("punch-hit", { gain: 0.6 });
  if (unit) {
    damageEnemy(unit.enemy, MELEE.damage);
    toast(
      unit.enemy.health <= 0
        ? "Enemy down"
        : "Punch hit · " + unit.enemy.health + " health",
    );
  } else if (hit?.object.userData.target) toast("Target punched");
}
function fire() {
  if (!playing || health <= 0) return;
  if (inReleaseArea() && !build)
    return toast("Jail release area · weapons are disabled");
  if (build) return place();
  if (harvestAction) return;
  const held = selectedItem(inventory());
  if (
    held &&
    (isResource(held.kind) ||
      isBulletAmmo(held.kind) ||
      held.kind === "rockets")
  )
    return;
  if (tool === "hands") {
    if (held && isHarvestTool(held.kind) && !nearestResource()) {
      if (!harvestAction)
        harvestAction = {
          id: "air",
          kind: held.kind === "axe" ? "tree-broadleaf" : "node-rock",
          elapsed: 0,
          hit: false,
        };
      return;
    }
    if (nearestResource()) {
      beginHarvest();
      return;
    }
    return punch();
  }
  if (loadout.reload || useRemaining > 0) return;
  if (explosiveKind(tool)) return useExplosive(tool as ChargeKind);
  const weapon = WEAPONS[tool];
  const now = performance.now();
  if (!canShoot(tool, now, lastShot)) return;
  lastShot = now;
  if (!spendRound(loadout, tool)) {
    sound.play("empty", { gain: 0.45, interval: 0.2 });
    if (now - lastEmptyNotice > 1200) {
      toast("Empty magazine · R / RELOAD");
      lastEmptyNotice = now;
    }
    return;
  }
  sound.play(tool as SoundName, { gain: 0.8, interval: 0 });
  persistSoon();
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
  coast.splashRay(raycaster.ray, hits[0]?.distance ?? weapon.range);
  lastHitDoor = hits[0]?.object.userData.doorIndex ?? -1;
  lastHitBuildPiece = hits[0]?.object.userData.pieceId ?? "";
  const end =
    hits[0]?.point || raycaster.ray.at(weapon.range, new THREE.Vector3());
  viewModel.root.updateMatrixWorld(true);
  const start = camera.localToWorld(
    viewModel.gun.muzzle.getWorldPosition(muzzlePosition),
  );
  tracer.geometry.setFromPoints([start, end]);
  tracer.visible = true;
  const flying = bulletModel(tool);
  if (flying) {
    const direction = end.clone().sub(start).normalize();
    flying.position.copy(start);
    flying.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    canvas.dataset.lastBulletSource = "blender";
    scene.add(flying);
    bulletVisuals.push({
      model: flying,
      velocity: direction.multiplyScalar(100),
      remaining: start.distanceTo(end),
    });
    if (bulletVisuals.length > 32) scene.remove(bulletVisuals.shift()!.model);
  }
  const hitEnemy =
    hits[0] &&
    enemies.find(
      (u) => u.enemy.health > 0 && u.hitbox.getObjectById(hits[0].object.id),
    );
  if (hitEnemy) {
    const enemy = hitEnemy.enemy;
    damageEnemy(enemy, weapon.damage);
    sound.play("hit-marker", { gain: 0.3 });
    toast(
      enemy.health <= 0
        ? "Enemy down"
        : "Enemy hit · " + enemy.health + " health",
    );
  } else if (hits[0]?.object.userData.target) {
    sound.play("hit-marker", { gain: 0.18 });
    toast("Target hit");
  }
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
  if (e.detail === 0) {
    explosiveLatch = false;
    fire();
    explosiveLatch = false;
  }
});
function releaseFire(e: PointerEvent) {
  if (e.pointerId !== firePointer) return;
  firePointer = undefined;
  explosiveLatch = false;
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
  if (survivalOpen) {
    if (e.code === "Escape") {
      e.preventDefault();
      closeSurvival();
    }
    return;
  }
  if (e.code === "KeyH" && playing) {
    e.preventDefault();
    openSurvival();
    return;
  }
  if (stationOpen) {
    if (e.code === "Escape") {
      e.preventDefault();
      closeStation();
      return;
    }
    if (e.code === "KeyI") {
      e.preventDefault();
      closeStation();
      openInventory();
      return;
    }
    if (e.code !== "KeyM") return;
  }
  if (e.code === "KeyI" || (e.code === "Tab" && !inventoryOpen && playing)) {
    e.preventDefault();
    if (!e.repeat) {
      if (inventoryOpen) closeInventory();
      else if (playing) openInventory();
    }
    return;
  }
  if (e.code === "KeyM" && !(e.target instanceof HTMLInputElement)) {
    if (!e.repeat) {
      sound.toggleMute();
      syncSoundControls();
      void sound.unlock().then(syncSoundControls);
    }
    return;
  }
  if (inventoryOpen) return;
  if (e.target instanceof HTMLInputElement) return;
  if (!playing) return;
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
  keys.add(e.code);
  if (e.repeat) return;
  if (e.code === "KeyB") toggleBuild();
  if (e.code === "KeyV" && build && selected === "storage") {
    buildStorageSize = buildStorageSize === "small" ? "large" : "small";
    rebuildPreview();
    updateHud();
  }
  if (e.code === "KeyT" && build && !isStationKind(selected)) {
    const tiers = Object.keys(STRUCTURE_MATERIALS) as StructureMaterial[];
    selectBuildMaterial(
      tiers[(tiers.indexOf(buildMaterial) + 1) % tiers.length],
    );
  }
  if (e.code === "KeyE") interact();
  if (e.code === "KeyG") detonateC4();
  if (e.code === "KeyR") {
    if (build) {
      rotation = (rotation + 1) % 4;
      rebuildPreview();
    } else requestReload();
  }
  if (
    build &&
    [
      "Digit1",
      "Digit2",
      "Digit3",
      "Digit4",
      "Digit5",
      "Digit6",
      "Digit7",
      "Digit8",
    ].includes(e.code)
  ) {
    selected = (
      [
        "floor",
        "wall",
        "doorway",
        "storage",
        "foundation",
        "door",
        "workbench",
        "furnace",
      ] as PieceKind[]
    )[Number(e.code.slice(-1)) - 1];
    rebuildPreview();
  } else {
    if (/^Digit[1-5]$/.test(e.code)) activateHand(Number(e.code.slice(-1)) - 1);
  }
  if (e.code === "KeyH") activateHand(-1);

  if (e.code === "KeyQ") setAim(!aiming);
  if (e.code === "Space") jump();
  if (e.code === "Delete") remove();
  if (e.code === "Escape") pause();
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("pagehide", persist);
window.addEventListener("blur", pause);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    sound.setPaused(true);
    pause();
  }
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
    explosiveLatch = false;
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
  harvestView.setAspect(camera.aspect);
  heldResource.setAspect(camera.aspect);
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
  refreshHotbar();
  const unarmed = tool === "hands";
  $("#fire").textContent = build
    ? "PLACE"
    : unarmed
      ? "PUNCH"
      : tool === "grenade"
        ? "THROW"
        : tool === "c4"
          ? "PLACE C4"
          : "FIRE";
  $("#detonate").hidden = !projectiles.some((p) => p.kind === "c4");
  $("#weapon-status").classList.toggle(
    "has-charges",
    projectiles.some((p) => p.kind === "c4"),
  );
  $("#reload").hidden = unarmed || build || tool === "grenade" || tool === "c4";
  if (unarmed)
    $("#ammo").textContent =
      `C4 · ${projectiles.filter((p) => p.kind === "c4").length} placed`;
  $("#weapon-status").hidden =
    (unarmed || build) && !projectiles.some((p) => p.kind === "c4");
  const ammoIcon = $<HTMLImageElement>("#ammo-icon"),
    ammoKind = tool !== "hands" ? ammoFor(tool) : undefined;
  ammoIcon.hidden = !ammoKind || build;
  if (ammoKind && ammoIcon.getAttribute("src") !== itemIcon(ammoKind))
    ammoIcon.src = itemIcon(ammoKind);
  if (tool !== "hands") {
    $("#ammo").textContent = loadout.reload
      ? "RELOADING " + Math.ceil(loadout.reload.remaining * 10) / 10 + "s"
      : loadout.rounds[tool] +
        " / " +
        WEAPONS[tool].magazineSize +
        (tool === "rocket"
          ? " · " + countItem(inventory(), "rockets") + " rockets carried"
          : tool === "grenade" || tool === "c4"
            ? " · " + (selectedItem(inventory())?.quantity ?? 0) + " carried"
            : " · " + countItem(inventory(), ammoFor(tool)!) + " reserve");
    if (tool === "grenade" || tool === "c4")
      $("#ammo").textContent =
        (selectedItem(inventory())?.quantity ?? 0) +
        " " +
        itemName(tool) +
        " carried";
    $("#reload").toggleAttribute(
      "disabled",
      !!loadout.reload ||
        loadout.rounds[tool] === WEAPONS[tool].magazineSize ||
        (!!ammoKind && countItem(inventory(), ammoKind) === 0),
    );
  }
  $("#health").textContent = "HEALTH " + health;
  $("#wood").textContent = `WOOD ${save.wood.toLocaleString()}`;
  $("#cash-count").textContent = `$${survival().cash.toLocaleString()}`;
  for (const key of ["rock", "sulfur", "metal"] as const)
    $("#" + key + "-count").textContent = String(save.resources?.[key] ?? 0);
  $("#budget").textContent = `${save.pieces.length} / ${BUILD_LIMIT}`;
  canvas.dataset.buildLevels = JSON.stringify(
    save.pieces.map((p) => ({
      id: p.id,
      kind: p.kind,
      x: p.x,
      z: p.z,
      y: pieceBase(p, save.pieces),
    })),
  );
  const inside = containingBuilding(player);
  $("#zone").textContent = inHarbor(player)
    ? "SOUTH HARBOR"
    : inside >= 0
      ? BUILDINGS[inside].name
      : inNorthLab(player)
        ? "NORTH WORKS"
        : inCompound(player, 1)
          ? "FORT EAST"
          : inWestQuarter(player)
            ? "WEST QUARTER"
            : inTown(player)
              ? COMPACT.active
                ? player.z < -96
                  ? "JAIL ISLAND"
                  : "THE BLOCK"
                : "JAIL DISTRICT"
              : roadDistance(player) < 5
                ? "OUTBOUND ROAD"
                : "OPEN MEADOW";
  const floorLabel =
    inside >= 0 && buildingStories(BUILDINGS[inside]) > 1
      ? isCityApartments(BUILDINGS[inside]) && vertical >= 9.5
        ? "ROOFTOP · "
        : `FLOOR ${Math.min(buildingStories(BUILDINGS[inside]), Math.floor((vertical + 0.1) / STORY_HEIGHT) + 1)} · `
      : "";
  $("#coordinates").textContent =
    `${floorLabel}${Math.round(player.x)} E · ${Math.round(player.z)} S`;
  $("#fps").textContent = `${fps} FPS`;
  for (const b of document.querySelectorAll<HTMLButtonElement>(
    "[data-piece]",
  )) {
    b.classList.toggle("selected", b.dataset.piece === selected);
    b.querySelector("span")!.textContent = isStationKind(b.dataset.piece!)
      ? `${COST[b.dataset.piece as PieceKind]} wood · ${Object.entries(
          STATIONS[b.dataset.piece as keyof typeof STATIONS].extras,
        )
          .map(
            ([k, n]) => `${n} ${itemName(k as Parameters<typeof itemName>[0])}`,
          )
          .join(" · ")}`
      : `${pieceCost({ kind: b.dataset.piece as PieceKind, material: buildMaterial, storageSize: buildStorageSize })} wood`;
  }

  $("#build-materials").hidden = isStationKind(selected);
  $("#storage-sizes").hidden = selected !== "storage";
  for (const b of document.querySelectorAll<HTMLButtonElement>(
    "[data-storage-size]",
  )) {
    const active = b.dataset.storageSize === buildStorageSize;
    b.classList.toggle("selected", active);
    b.setAttribute("aria-pressed", String(active));
  }

  const near = nearestLoot(),
    door = nearestDoor(),
    built = nearestBuiltDoor(),
    p = aimedPiece();
  $("#hint-title").textContent = build
    ? "BUILD MODE"
    : built
      ? `YOUR ${structureMaterial(built).toUpperCase()} DOOR`
      : door >= 0
        ? BUILDINGS[door].name + " DOOR"
        : near >= 0
          ? LOOT[near].name
          : p
            ? "YOUR " + p.kind.toUpperCase()
            : "";
  $("#hint-text").textContent = build
    ? "T material · 1–8 pieces · R rotate · Aim at wall tops for upper floors"
    : built
      ? "E / USE · " + (built.open ? "Close door" : "Open door")
      : door >= 0
        ? "E / USE · " + (doorTargets[door] ? "Close door" : "Open door")
        : near >= 0
          ? (survival().lootReadyAt[near] ?? 0) > Date.now()
            ? "SEARCHED"
            : LOOT[near].kind === "trash"
              ? "E / USE · Search trash"
              : "E / USE · Search supplies"
          : p
            ? "Build mode → Dismantle to remove"
            : "";
  if (!build && jailGateNearby(player, vertical)) {
    $("#hint-title").textContent = "JAIL COMPOUND GATE";
    $("#hint-text").textContent =
      "E / USE · " + (jailGate.open ? "Close gates" : "Open gates");
  }
  const martDoor = nearestMartDoor();
  if (!build && martDoor) {
    $("#hint-title").textContent =
      martDoor.id === 1 ? "DELIVERY DOOR" : "STOCKROOM DOOR";
    $("#hint-text").textContent =
      "E / USE · " +
      (martState(martDoor.i).targets[martDoor.id] ? "Close door" : "Open door");
  }
  const apartmentDoor = nearestApartmentDoor();
  if (!build && apartmentDoor) {
    $("#hint-title").textContent = apartmentDoors[apartmentDoor.id].label;
    $("#hint-text").textContent =
      "E / USE · " +
      (apartmentDoorState(apartmentDoor.i).targets[apartmentDoor.id]
        ? "Close door"
        : "Open door");
  }
  const plotSign =
    !build && survival().plots.find((p) => plotSignDistance(p) < 4);
  if (plotSign && !built && door < 0 && near < 0) {
    $("#hint-title").textContent =
      plotSign.id.toUpperCase() +
      " · " +
      plotSign.width +
      " × " +
      plotSign.depth +
      "m";
    $("#hint-text").textContent = "E / USE · Buy land or manage upkeep";
  }
  const inspected = built ?? p;
  $("#structure-health-label").hidden = !inspected;
  $("#structure-health-bar").hidden = !inspected;
  if (inspected) {
    const hp = structureHealth(inspected),
      max = maxStructureHealth(inspected);
    $("#structure-health-label").textContent =
      `${STRUCTURE_MATERIALS[structureMaterial(inspected)].name} ${inspected.kind} · ${hp} / ${max} HP`;
    const meter = $<HTMLMeterElement>("#structure-health-bar");
    meter.max = max;
    meter.low = max * 0.33;
    meter.high = max * 0.66;
    meter.optimum = max;
    meter.value = hp;
  }
  const gatherTarget = !build ? nearestResource() : undefined;
  gatherButton.hidden = !gatherTarget;
  gatherButton.textContent = gatherTarget
    ? GATHER_TYPES[gatherTarget.kind].action === "chop"
      ? "CHOP"
      : "MINE"
    : "GATHER";
  if (gatherTarget) {
    const config = GATHER_TYPES[gatherTarget.kind];
    $("#hint-title").textContent = config.name.toUpperCase();
    $("#hint-text").textContent =
      `Hold E / ${config.action === "chop" ? "CHOP" : "MINE"} · +${config.yield} ${config.resource} per strike`;
    $("#structure-health-label").hidden = false;
    $("#structure-health-label").textContent =
      `${gatherTarget.health} / ${config.health} HP`;
    const meter = $<HTMLMeterElement>("#structure-health-bar");
    meter.hidden = false;
    meter.max = config.health;
    meter.value = gatherTarget.health;
  }
  const station = !build ? nearestStation() : undefined;
  if (station) {
    $("#hint-title").textContent = (
      station.kind === "storage"
        ? storageSpec(station).name
        : STATIONS[station.kind as keyof typeof STATIONS].name
    ).toUpperCase();
    $("#hint-text").textContent =
      "E / USE · " +
      (station.kind === "storage"
        ? `Open storage · ${storageSpec(station).slots} slots`
        : station.job
          ? station.job.remaining === 0
            ? "Collect output"
            : "Processing · open station"
          : "Open workshop");
  }
  const loose = !build ? nearestDrop() : undefined;
  if (loose) {
    $("#hint-title").textContent = itemName(loose.kind) + " ×" + loose.quantity;
    $("#hint-text").textContent = "E / USE · Pick up";
  }
}
function updatePreview() {
  if (!build || !playing) {
    if (preview) preview.visible = false;
    return;
  }
  aimRay();
  const groundHit = raycaster.ray.intersectPlane(ground, hitPoint);
  const hits = raycaster.intersectObjects(construction.children, true);
  const first = hits[0],
    firstPiece =
      first && save.pieces.find((p) => p.id === first.object.userData.pieceId);
  const wallTop =
    selected === "floor" &&
    firstPiece &&
    (firstPiece.kind === "wall" || firstPiece.kind === "doorway") &&
    first.point.y >= pieceBase(firstPiece, save.pieces) + 1.25
      ? first
      : undefined;
  const doorway =
    selected === "door" && firstPiece?.kind === "doorway" ? first : undefined;
  const chestTop =
    selected === "storage" &&
    firstPiece?.kind === "storage" &&
    first.face &&
    first.face.normal.y > 0.9
      ? first
      : undefined;
  const platform = hits.find((h) => {
    const p = save.pieces.find((p) => p.id === h.object.userData.pieceId);
    return (
      p &&
      (p.kind === "floor" || p.kind === "foundation") &&
      h.face &&
      (h.face.normal.y > 0.9 ||
        (p.y !== undefined &&
          selected !== "floor" &&
          selected !== "foundation"))
    );
  });
  const chosen = chestTop ?? wallTop ?? doorway ?? platform;
  const hit = chosen?.point ?? groundHit;
  if (!hit || hit.distanceTo(camera.position) > 11) {
    candidate = undefined;
    reason = "Aim at ground, a floor, a chest lid, or a wall top";
    if (preview) preview.visible = false;
  } else {
    const target =
      chosen &&
      save.pieces.find((p) => p.id === chosen.object.userData.pieceId);
    candidate = target
      ? snapOnStructure(hit, selected, rotation, target, save.pieces)
      : snapPiece(hit, selected, rotation);
    if (selected === "storage") candidate.storageSize = buildStorageSize;
    candidate.material = isStationKind(selected)
      ? STATIONS[selected].material
      : buildMaterial;
    reason =
      housingPlacementReason(survival(), candidate, save.pieces, Date.now()) ||
      placementReason(
        candidate,
        { ...player, y: vertical },
        save.pieces,
        save.wood,
      );
    if (!reason && isStationKind(candidate.kind)) {
      const missing = missingIngredients(
        inventory(),
        STATIONS[candidate.kind].extras,
      );
      if (missing) reason = "Need " + missing;
    }
    if (!preview) {
      preview = pieceModel(candidate, true);
      scene.add(preview);
    }
    preview.position.set(
      candidate.x,
      pieceBase(candidate, save.pieces),
      candidate.z,
    );
    if (candidate.kind === "door") {
      preview.position.x -= 0.54 * Math.cos((rotation * Math.PI) / 2);
      preview.position.z += 0.54 * Math.sin((rotation * Math.PI) / 2);
      preview.position.y += 0.02;
    }
    preview.rotation.y = (rotation * Math.PI) / 2;
    preview.visible = !(
      isStationKind(candidate.kind) && reason.includes("occupied")
    );
    previewMaterial.color.set(reason ? 0xe5806b : 0x94e4bb);
  }
  $("#placement").textContent =
    reason ||
    `${STRUCTURE_MATERIALS[buildMaterial].name} ${selected.toUpperCase()} · ${pieceCost({ kind: selected, material: buildMaterial, storageSize: buildStorageSize })} wood · Ready to place`;
  $<HTMLButtonElement>("#place").disabled = !!reason;
}
const interiorFrustum = new THREE.Frustum(),
  interiorView = new THREE.Matrix4();
function frame(now: number) {
  requestAnimationFrame(frame);
  const productionDt = Math.min(Math.max(0, (now - lastFrame) / 1000), 1);
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  clock += dt;
  if (Date.now() - lastHousingTick >= 1000) {
    lastHousingTick = Date.now();
    settleHousing();
    housingView.update(survival(), player);
  }
  coast.update(clock, playing ? player : undefined);
  jailGrounds.root.visible =
    !COMPACT.active || Math.hypot(player.x, player.z + 124) < 155;
  harbor.root.visible =
    Math.hypot(player.x + 60, player.z - (COMPACT.active ? 174 : 234)) < 165;
  northLab.root.visible =
    NORTH_LAB.enabled &&
    Math.hypot(player.x - NORTH_LAB.x, player.z - NORTH_LAB.z) < 170;
  BUILDINGS.forEach((b, i) => {
    if (COMPACT.active || isNorthBuilding(b.type))
      buildingModels[i].root.visible =
        buildingEnabled(b) && Math.hypot(player.x - b.x, player.z - b.z) < 145;
  });
  if (playing || stationOpen) tickProduction(productionDt, now);
  if (!playing && !needsRender) return;
  needsRender = false;
  if (playing) {
    recoilRemaining = Math.max(0, recoilRemaining - dt * 8);
    animateJailGate(dt, [
      player,
      ...enemies.filter((u) => u.enemy.health > 0).map((u) => u.enemy),
    ]);
    jailGrounds.update();
    animateDoors(dt, [
      { ...player, y: vertical },
      ...enemies.filter((u) => u.enemy.health > 0).map((u) => u.enemy),
    ]);
    buildingModels.forEach((model, i) => {
      if (COMPACT.active && !model.root.visible) return;
      if (model.mart) {
        model.mart.update(
          doorAngles[i],
          Math.hypot(player.x - BUILDINGS[i].x, player.z - BUILDINGS[i].z),
        );
        return;
      }
      if ("apartment" in model && model.apartment) model.apartment.update();
      if ("additionalDoors" in model)
        for (const hinge of model.additionalDoors) {
          hinge.rotation.y = doorAngles[i];
          hinge.updateMatrixWorld(true);
        }
      model.door.rotation.y = doorAngles[i];
      model.door.updateMatrixWorld(true);
      model.shotDoor.rotation.y = doorAngles[i];
      model.shotRoot.updateMatrixWorld(true);
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
    const previousPosition = { ...player },
      fallSpeed = verticalSpeed;
    player = movePlayer(
      player,
      (-Math.sin(yaw) * forward + Math.cos(yaw) * right) * speed * dt,
      (-Math.cos(yaw) * forward - Math.sin(yaw) * right) * speed * dt,
      save.pieces,
      vertical,
    );
    const surface = surfaceHeight(player, save.pieces, vertical + 0.75);
    if (vertical > surface || verticalSpeed > 0) {
      verticalSpeed -= 12 * dt;
      const ceiling = ceilingHeight(player, save.pieces, vertical) - 1.9;
      const next = vertical + verticalSpeed * dt;
      vertical = Math.max(surface, Math.min(next, ceiling));
      if (next > ceiling) verticalSpeed = Math.min(0, verticalSpeed);
      if (vertical === surface) verticalSpeed = 0;
    } else {
      vertical = surface;
      verticalSpeed = 0;
    }
    const grounded = Math.abs(vertical - surface) < 0.02 && verticalSpeed === 0;
    if (grounded && fallSpeed < -0.8)
      sound.play("land", {
        gain: Math.min(0.7, 0.2 + Math.abs(fallSpeed) * 0.05),
      });
    if (
      footsteps.advance(
        Math.hypot(
          player.x - previousPosition.x,
          player.z - previousPosition.z,
        ),
        grounded,
        speed > 5,
      )
    )
      sound.play(
        inTown(player) || roadDistance(player) < 4.5 || vertical > 0.1
          ? "step-pavement"
          : "step-grass",
        {
          gain: speed > 5 ? 0.4 : 0.28,
          pitch: 0.9 + Math.random() * 0.2,
          interval: 0.12,
        },
      );
    for (const p of save.pieces)
      if (p.kind === "door") {
        advancePlayerDoor(
          p,
          dt,
          [
            { ...player, y: vertical },
            ...enemies
              .filter((u) => u.enemy.health > 0)
              .map((u) => ({ ...u.enemy, y: u.actor.root.position.y })),
          ],
          save.pieces,
        );
        const rig = builtDoors.get(p.id);
        if (rig) {
          rig.hinge.rotation.y = p.doorAngle ?? 0;
          rig.proxy.rotation.y =
            (p.rotation * Math.PI) / 2 + (p.doorAngle ?? 0);
          rig.proxy.updateMatrixWorld(true);
        }
      }
    for (let i = bulletVisuals.length - 1; i >= 0; i--) {
      const b = bulletVisuals[i],
        travel = Math.min(b.remaining, b.velocity.length() * dt);
      b.model.position.addScaledVector(
        b.velocity,
        travel / b.velocity.length(),
      );
      b.remaining -= travel;
      if (b.remaining <= 0) {
        scene.remove(b.model);
        bulletVisuals.splice(i, 1);
      }
    }
    enemyFrame(dt);
    updateExplosives(dt);
    camera.position.set(
      player.x,
      1.65 + vertical + (length > 0.1 ? Math.sin(clock * 9) * 0.025 : 0),
      player.z,
    );
    camera.rotation.set(pitch, yaw, 0);
    updateHarvest(dt);
    nature.update(player, dt, camera);
    if (loadout.reload) {
      const progress = 1 - loadout.reload.remaining / loadout.reload.duration;
      if (progress >= 0.42 && reloadSoundStage === 1) {
        reloadSoundStage = 2;
        sound.play("reload-in", { gain: 0.45 });
      }
      if (progress >= 0.78 && reloadSoundStage === 2) {
        reloadSoundStage = 3;
        sound.play("reload-rack", { gain: 0.45 });
      }
    }
    if (advanceInventoryReload(loadout, inventory(), dt)) {
      persist();
      updateHud();
    }
    punchCooldown = Math.max(0, punchCooldown - dt);
    if (punchRemaining > 0) {
      punchRemaining = Math.max(0, punchRemaining - dt);
      if (!punchLanded && MELEE.duration - punchRemaining >= MELEE.impactAt) {
        punchLanded = true;
        if (tool === "hands" && !build && health > 0) landPunch();
      }
    }
    if (firePointer !== undefined && !build && health > 0) fire();
    const recoil =
      tool !== "hands" ? recoilRemaining * WEAPONS[tool].recoil : 0;
    const playerAction = {
      dt,
      shotSerial,
      use: useRemaining > 0 ? 1 - useRemaining / 0.8 : 0,
      detonate: detonationRemaining > 0 ? 1 - detonationRemaining / 0.5 : 0,
      running: run || keys.has("ShiftLeft") || keys.has("ShiftRight"),
      jumping:
        vertical > surfaceHeight(player, save.pieces, vertical + 0.02) + 0.01,
      punch: punchRemaining > 0 ? 1 - punchRemaining / MELEE.duration : 0,
      side: punchSerial % 2 ? -1 : 1,
      reload: loadout.reload
        ? 1 - loadout.reload.remaining / loadout.reload.duration
        : 0,
    };
    viewModel.animate(clock, length > 0.1, recoil, playerAction);
    if (harvestAction) {
      const config = GATHER_TYPES[harvestAction.kind];
      harvestView.root.visible = true;
      viewModel.root.visible = false;
      harvestView.animate(
        clock,
        length > 0.1,
        config.action,
        harvestAction.elapsed / config.duration,
        dt,
      );
    } else {
      const held = selectedItem(inventory());
      harvestView.root.visible = !!held && isHarvestTool(held.kind) && !build;
      if (harvestView.root.visible) {
        viewModel.root.visible = false;
        harvestView.animate(
          clock,
          length > 0.1,
          held!.kind === "axe" ? "chop" : "mine",
          0,
          dt,
        );
      }
    }
    const carried = selectedItem(inventory());
    heldResource.root.visible =
      !!carried &&
      (isResource(carried.kind) ||
        isBulletAmmo(carried.kind) ||
        carried.kind === "rockets") &&
      !harvestAction &&
      !build;
    if (heldResource.root.visible) {
      viewModel.root.visible = false;
      heldResource.animate(carried!.kind, clock, length > 0.1, dt);
    } else if (!harvestAction && !harvestView.root.visible)
      viewModel.root.visible = true;
    droppedItems.update(player);
    body.root.position.set(player.x, vertical, player.z);
    body.root.rotation.y = yaw;
    body.animate(clock, length > 0.1, playerAction, tool);
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
      interiorFrustum.intersectsBox(entry.bounds);
  }
  muzzle.visible = tracer.visible = flashRemaining > 0;
  if (playing) flashRemaining = Math.max(0, flashRemaining - dt);
  if (now - fpsAt >= 1000) {
    fps = Math.round((frameCount * 1000) / (now - fpsAt));
    frameCount = 0;
    fpsAt = now;
  }
  frameCount++;
  viewCamera.fov = camera.fov;
  viewCamera.aspect = camera.aspect;
  viewCamera.updateProjectionMatrix();
  renderer.info.reset();
  renderer.clear();
  renderer.render(scene, camera);
  renderer.clearDepth();
  renderer.render(viewScene, viewCamera);
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
  canvas.dataset.audio = JSON.stringify(sound.diagnostics());
  canvas.dataset.drawCalls = String(renderer.info.render.calls);
  canvas.dataset.triangles = String(renderer.info.render.triangles);
  canvas.dataset.mapSize = String(MAP_SIZE);
  canvas.dataset.inventory = JSON.stringify({
    slots: inventory().slots,
    hotbar: inventory().hotbar,
    active: inventory().active,
    reserveStacks: inventory().reserve.length,
    droppedStacks: inventory().drops.length,
  });
  canvas.dataset.heldItemSource = String(
    heldResource.root.userData.itemSource ?? "",
  );
  canvas.dataset.inventoryOpen = String(inventoryOpen);
  canvas.dataset.stationOpen = String(stationOpen);
  canvas.dataset.craftingSources = JSON.stringify(craftingSources());
  canvas.dataset.productionJobs = JSON.stringify(
    save.pieces
      .filter((p) => p.job)
      .map((p) => ({ id: p.id, kind: p.kind, ...p.job })),
  );
  canvas.dataset.ammoModels = JSON.stringify(ammoSources());
  canvas.dataset.nearestDrop = nearestDrop()?.id ?? "";
  canvas.dataset.harborSource = harbor.source;
  canvas.dataset.northLab = JSON.stringify({
    ...NORTH_LAB,
    source: northLab.source,
    buildings: BUILDINGS.filter((b) => isNorthBuilding(b.type)).length,
  });
  canvas.dataset.harborRoad = JSON.stringify(
    ROADS.filter((r) => r[r.length - 1]?.z === 207),
  );
  canvas.dataset.resourceWallet = JSON.stringify({
    wood: save.wood,
    ...save.resources,
  });
  canvas.dataset.harvestAction = harvestAction
    ? JSON.stringify({
        id: harvestAction.id,
        kind: harvestAction.kind,
        progress:
          harvestAction.elapsed / GATHER_TYPES[harvestAction.kind].duration,
      })
    : "";
  canvas.dataset.harvestModelSource = String(
    harvestView.root.userData.harvestModelSource ?? "",
  );
  canvas.dataset.harvestTool = String(
    harvestView.root.userData.harvestTool ?? "",
  );
  canvas.dataset.harvestPose = String(
    harvestView.root.userData.harvestPose ?? "",
  );
  canvas.dataset.nearestResource = nearestResource()?.id ?? "";
  canvas.dataset.lastHarvest = JSON.stringify(lastHarvest);
  canvas.dataset.nearbyResources = JSON.stringify(
    resourceWorld
      .near(player, 35)
      .filter((r) => Math.hypot(r.x - player.x, r.z - player.z) < 35)
      .slice(0, 35)
      .map((r) => ({
        id: r.id,
        kind: r.kind,
        x: r.x,
        z: r.z,
        health: r.health,
      })),
  );
  if (now - lastPopulation > 1000) {
    lastPopulation = now;
    canvas.dataset.natureSources = nature.sources();
    canvas.dataset.resourcePopulation = JSON.stringify(
      Object.keys(GATHER_TYPES).map((kind) => ({
        kind,
        total: resourceWorld.entities.filter((r) => r.kind === kind).length,
        active: resourceWorld.entities.filter(
          (r) => r.kind === kind && r.health > 0,
        ).length,
      })),
    );
  }

  canvas.dataset.shots = String(shotSerial);
  canvas.dataset.projectiles = JSON.stringify(
    projectiles.map((p) => ({
      id: p.id,
      kind: p.kind,
      ...p.position,
      fuse: p.fuse,
      settled: p.settled,
      attachedPieceId: p.attachedPieceId,
    })),
  );
  canvas.dataset.explosions = String(explosionSerial);
  canvas.dataset.detonationProgress = String(
    detonationRemaining > 0 ? 1 - detonationRemaining / 0.5 : 0,
  );
  canvas.dataset.usePose = String(viewModel.root.userData.usePose ?? "");
  canvas.dataset.weaponAction = loadout.reload
    ? "reload"
    : detonationRemaining > 0
      ? "detonate"
      : useRemaining > 0
        ? tool === "grenade"
          ? "throw"
          : tool === "c4"
            ? "place"
            : "launch"
        : recoilRemaining > 0
          ? "fire"
          : "hold";
  canvas.dataset.useProgress = String(
    useRemaining > 0 ? 1 - useRemaining / 0.8 : 0,
  );
  canvas.dataset.health = String(health);
  canvas.dataset.waterEffects = JSON.stringify(coast.waterStats());
  canvas.dataset.jailKit = jailGrounds.source;
  canvas.dataset.jailGate = JSON.stringify(jailGate);
  canvas.dataset.cityLayout = COMPACT.active
    ? "compact-island-city-v2"
    : "legacy-preserved";
  canvas.dataset.jailBridge = JSON.stringify(JAIL_BRIDGE);
  canvas.dataset.housing = JSON.stringify({
    ...survival(),
    status: leaseStatus(survival(), Date.now()),
  });
  canvas.dataset.enemies = JSON.stringify(
    enemies.map((u) => ({
      id: u.id,
      moving: u.moving,
      kind: u.enemy.kind,
      labTier: u.labTier,
      model: u.labModel,
      weapon: u.weaponKind,
      magazine: u.enemy.magazine,
      reloadRemaining: u.enemy.reloadRemaining,
      animation: u.imageRig?.root.userData.labAnimation,
      handAttached: u.weapon.root.userData.labHandAttached,
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
  canvas.dataset.tenements = JSON.stringify(
    buildingModels.flatMap((model, i) =>
      BUILDINGS[i].type === "tenement"
        ? [{ index: i, version: model.root.userData.assetVersion }]
        : [],
    ),
  );
  canvas.dataset.buildingSources = JSON.stringify(
    buildingModels.map((m) => m.source),
  );
  canvas.dataset.blockMart = JSON.stringify({
    propSet: buildingModels[0].root.userData.propSet ?? "native-blender",
    state: martState(0),
    near: nearestMartDoor(),
  });
  canvas.dataset.doors = JSON.stringify(doorAngles);
  canvas.dataset.lastHitDoor = String(lastHitDoor);
  canvas.dataset.lastHitBuildPiece = lastHitBuildPiece;
  canvas.dataset.nearestApartmentDoor = JSON.stringify(
    nearestApartmentDoor() ?? null,
  );
  canvas.dataset.apartmentDoors = JSON.stringify(
    BUILDINGS.flatMap((b, i) =>
      isCityApartments(b) ? [{ index: i, ...apartmentDoorState(i) }] : [],
    ),
  );
  canvas.dataset.nearestDoor = String(nearestDoor());
  canvas.dataset.buildModels = woodBuildingSources();
  canvas.dataset.lootModels = lootChestSources();
  canvas.dataset.lootProxyCount = String(
    lootMeshes.reduce(
      (n, g) => n + g.children.filter((c) => !c.visible).length,
      0,
    ),
  );
  canvas.dataset.nearestLoot = String(nearestLoot());
  canvas.dataset.footHeight = String(vertical);
  canvas.dataset.playerDoors = JSON.stringify(
    save.pieces
      .filter((p) => p.kind === "door")
      .map((p) => ({
        id: p.id,
        open: !!p.open,
        angle: p.doorAngle ?? (p.open ? -Math.PI / 2 : 0),
      })),
  );
  canvas.dataset.structureHealth = JSON.stringify(
    save.pieces.map((p) => ({
      id: p.id,
      kind: p.kind,
      material: structureMaterial(p),
      health: structureHealth(p),
      maxHealth: maxStructureHealth(p),
    })),
  );
  canvas.dataset.buildMaterial = buildMaterial;
  canvas.dataset.buildCandidate = JSON.stringify(candidate ?? null);
  canvas.dataset.equipped = tool;
  canvas.dataset.ammo = JSON.stringify(loadout.rounds);
  canvas.dataset.reload = loadout.reload?.kind || "";
  canvas.dataset.reloadPose = new THREE.Euler()
    .setFromQuaternion(
      viewModel.gun.root.getWorldQuaternion(new THREE.Quaternion()),
    )
    .z.toFixed(4);
  canvas.dataset.punchSide = String(punchSerial % 2 ? -1 : 1);
  canvas.dataset.reloadProgress = String(
    loadout.reload ? 1 - loadout.reload.remaining / loadout.reload.duration : 0,
  );
  canvas.dataset.punches = String(punchSerial);
  canvas.dataset.punchProgress = String(
    punchRemaining > 0 ? 1 - punchRemaining / MELEE.duration : 0,
  );
  canvas.dataset.aiming = String(aiming);
  canvas.dataset.fov = String(camera.fov);
  canvas.dataset.playerSource = body.root.userData.playerSource;
  canvas.dataset.playerMotion = body.root.userData.playerClip || "legacy";
  canvas.dataset.playerCombat = viewModel.root.userData.playerClip || "legacy";
  canvas.dataset.actorModels =
    body.root.userData.playerSource === "meshy"
      ? "meshy-shadow,blender-weapons"
      : "rounded-stick-player,detailed-pistol";
  canvas.dataset.weaponSource =
    viewModel.gun.root.userData.weaponSource || "fallback";
  canvas.dataset.recoil = viewModel.gun.slide.position.z.toFixed(4);
  canvas.dataset.movement = `${joystick.x.toFixed(2)},${joystick.y.toFixed(2)}`;
}
syncSoundControls();
activateHand(inventory().active, false);
persist();
updateHud();
requestAnimationFrame(frame);
