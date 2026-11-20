import { WEAPONS, type WeaponKind } from "./weapons";
import * as THREE from "three";
import { createStickPlayer, createPistol, createWeapon } from "./actor-models";
export function openActorPreview() {
  if (document.querySelector("#actor-preview")) return;
  const overlay = document.createElement("div");
  overlay.id = "actor-preview";
  overlay.className = "overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Player and weapon 3D models");
  overlay.innerHTML =
    '<div class="actor-card"><div class="actor-heading"><div><span class="eyebrow">ORIGINAL 3D MODELS</span><h2>YOUR SURVIVOR</h2></div><button id="close-actors" aria-label="Close model preview">CLOSE</button></div><canvas id="actor-canvas" aria-label="Rotatable player and weapon models"></canvas><div class="actor-options"><button id="show-player" class="selected">PLAYER</button><button id="show-pistol">PISTOL</button><button id="show-smg">SMG</button><button id="show-rifle">RIFLE</button><button id="show-sniper">SNIPER</button></div><p id="actor-description">Black stick figure · Rounded limbs · Low-ready pistol</p><small>Drag to rotate · Lightweight geometry for phones</small></div>';
  document.body.append(overlay);
  const canvas = overlay.querySelector<HTMLCanvasElement>("canvas")!;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "low-power",
    });
  } catch {
    overlay.remove();
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc3cbbf);
  scene.add(new THREE.HemisphereLight(0xeef6ff, 0x647c66, 3));
  const light = new THREE.DirectionalLight(0xffebcd, 4);
  light.position.set(-3, 5, 4);
  scene.add(light);
  const camera = new THREE.PerspectiveCamera(
    38,
    canvas.clientWidth / canvas.clientHeight,
    0.01,
    20,
  );
  const character = createStickPlayer(),
    carried = createPistol(),
    weapon = createPistol();
  const weapons = {
    pistol: weapon,
    smg: createWeapon("smg"),
    rifle: createWeapon("rifle"),
    sniper: createWeapon("sniper"),
  };
  character.handSocket.add(carried.root);
  scene.add(character.root, ...Object.values(weapons).map((w) => w.root));
  // Preview materials have their own lifecycle; closing the viewer cannot dispose live-game materials.
  const previewMaterials = new Map<THREE.Material, THREE.Material>();
  for (const root of [
    character.root,
    ...Object.values(weapons).map((w) => w.root),
  ])
    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const mat = o.material as THREE.Material;
      if (!previewMaterials.has(mat)) previewMaterials.set(mat, mat.clone());
      o.material = previewMaterials.get(mat)!;
    });
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.67, 0.08, 32),
    new THREE.MeshStandardMaterial({ color: 0x6b7e6e, roughness: 0.8 }),
  );
  base.position.y = -0.04;
  scene.add(base);
  let mode = "player",
    yaw = 0.35,
    drag: number | undefined,
    lastX = 0,
    closed = false,
    dirty = true;
  function select(kind: "player" | WeaponKind) {
    mode = kind;
    const isPlayer = kind === "player";
    character.root.visible = base.visible = isPlayer;
    for (const [key, w] of Object.entries(weapons))
      w.root.visible = key === kind;
    yaw = isPlayer ? 0.35 : -0.7;
    for (const key of ["player", "pistol", "smg", "rifle", "sniper"])
      overlay
        .querySelector("#show-" + key)!
        .classList.toggle("selected", key === kind);
    overlay.querySelector("#actor-description")!.textContent = isPlayer
      ? "Black stick figure · Rounded limbs · Low-ready pistol"
      : WEAPONS[kind].name + " · Original 3D model · Drag to inspect";
    if (isPlayer) {
      camera.position.set(0, 1.05, 3.4);
      camera.lookAt(0, 0.9, 0);
    } else {
      const bounds = new THREE.Box3().setFromObject(weapons[kind].root),
        center = bounds.getCenter(new THREE.Vector3()),
        size = bounds.getSize(new THREE.Vector3());
      const scale = Math.max(...size.toArray()) / 0.23;
      camera.position
        .copy(center)
        .add(new THREE.Vector3(0.34, 0.18, 0.55).multiplyScalar(scale));
      camera.lookAt(center);
    }
    dirty = true;
  }
  select("player");
  canvas.addEventListener("pointerdown", (e) => {
    drag = e.pointerId;
    lastX = e.clientX;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerId !== drag) return;
    yaw += (e.clientX - lastX) * 0.012;
    lastX = e.clientX;
    dirty = true;
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    canvas.addEventListener(type, () => (drag = undefined));
  overlay
    .querySelector("#show-player")!
    .addEventListener("click", () => select("player"));
  overlay
    .querySelector("#show-pistol")!
    .addEventListener("click", () => select("pistol"));
  for (const kind of ["smg", "rifle", "sniper"] as WeaponKind[])
    overlay
      .querySelector("#show-" + kind)!
      .addEventListener("click", () => select(kind));
  const previous = document.activeElement as HTMLElement | null;
  function close() {
    if (closed) return;
    closed = true;
    observer.disconnect();
    window.removeEventListener("keydown", keydown, true);
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    (base.material as THREE.Material).dispose();
    for (const mat of previewMaterials.values()) mat.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    overlay.remove();
    previous?.focus();
  }
  function keydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopImmediatePropagation();
      close();
    }
    if (e.key === "Tab") {
      const buttons = [
        ...overlay.querySelectorAll<HTMLButtonElement>("button"),
      ];
      const index = buttons.indexOf(
          document.activeElement as HTMLButtonElement,
        ),
        next =
          (index + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
      buttons[next].focus();
      e.preventDefault();
    }
  }
  window.addEventListener("keydown", keydown, true);
  overlay.querySelector("#close-actors")!.addEventListener("click", close);
  const observer = new ResizeObserver(() => {
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true;
  });
  observer.observe(canvas);
  function draw() {
    if (closed) return;
    requestAnimationFrame(draw);
    if (!dirty) return;
    dirty = false;
    character.root.rotation.y = yaw;
    for (const w of Object.values(weapons)) w.root.rotation.y = yaw;
    renderer.render(scene, camera);
    canvas.dataset.model = mode;
    canvas.dataset.drawCalls = String(renderer.info.render.calls);
    canvas.dataset.triangles = String(renderer.info.render.triangles);
    canvas.dataset.rotation = yaw.toFixed(3);
  }
  (overlay.querySelector("#close-actors") as HTMLButtonElement).focus();
  draw();
}
