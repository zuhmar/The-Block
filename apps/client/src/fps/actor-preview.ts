import { WEAPON_RENDER_URL } from "./blender-weapons";
import {
  loadStreetReview,
  disposeReview,
  IMAGE_REFERENCE_URL,
  IMAGE_MODEL_URLS,
  type ImageModelKind,
} from "./street-review";
import { createNpc } from "./npc-models";
import { WEAPONS, type WeaponKind } from "./weapons";
import * as THREE from "three";
import { createPistol, createWeapon } from "./actor-models";
import {
  createSurvivor,
  OUTFIT_NAMES,
  type ClothingSlot,
} from "./survivor-models";
function npcLabel(text: string, w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#202735";
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 40px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 34, 240);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: texture }),
  );
}
export function openActorPreview() {
  if (document.querySelector("#actor-preview")) return;
  const overlay = document.createElement("div");
  overlay.id = "actor-preview";
  overlay.className = "overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Player and weapon 3D models");
  overlay.innerHTML =
    '<div class="actor-card"><div class="actor-heading"><div><span class="eyebrow">ORIGINAL 3D MODELS</span><h2>YOUR SURVIVOR</h2></div><button id="close-actors" aria-label="Close model preview">CLOSE</button></div><canvas id="actor-canvas" aria-label="Rotatable player and weapon models"></canvas><div class="actor-options image-options"><button id="show-meshy">MESHY BASE</button><button id="show-image-base">IMAGE BASE</button><button id="show-street-v2">IMAGE STREET</button><button id="show-image-reinforced">IMAGE MILITARY</button><button id="show-image-armored">IMAGE ARMOR</button></div><div class="actor-options"><button id="show-player" class="selected">BARE BASE</button><button id="show-street">STREET</button><button id="show-reinforced">REINFORCED</button><button id="show-armored">ARMORED</button><button id="show-lookout">LOOKOUT</button><button id="show-police">POLICE</button><button id="show-swat">SWAT</button><button id="show-pistol">PISTOL</button><button id="show-smg">SMG</button><button id="show-rifle">RIFLE</button><button id="show-sniper">SNIPER</button></div><div id="clothing-slots" class="actor-options"><label><input type="checkbox" data-slot="headwear" checked> Headwear</label><label><input type="checkbox" data-slot="torso" checked> Torso</label><label><input type="checkbox" data-slot="legs" checked> Legs</label><label><input type="checkbox" data-slot="footwear" checked> Footwear</label></div><div id="review-motion" class="actor-options" hidden><button data-motion="still" class="selected">STILL</button><button data-motion="idle">IDLE</button><button data-motion="walk">WALK</button><button data-motion="grip">HAND GRIP</button></div><div id="meshy-motion" class="actor-options" hidden><label>ANIMATION <select id="meshy-animation" aria-label="Meshy animation"></select></label></div><p id="actor-description">Black stick figure · Rounded limbs · Low-ready pistol</p><a id="image-reference" target="_blank" rel="noopener">FOUR-CHARACTER REFERENCE IMAGE</a><small>Drag to rotate · Lightweight geometry for phones</small></div>';
  document.body.append(overlay);
  overlay.querySelector<HTMLAnchorElement>("#image-reference")!.href =
    IMAGE_REFERENCE_URL;
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
  scene.background = new THREE.Color(0xd2cdc5);
  scene.add(new THREE.HemisphereLight(0xeef6ff, 0x6e7180, 2.2));
  const light = new THREE.DirectionalLight(0xffebcd, 4);
  light.position.set(-3, 5, 4);
  scene.add(light);
  const rim = new THREE.DirectionalLight(0xd7e5ff, 1.5);
  rim.position.set(3, 3, -3);
  scene.add(rim);
  const camera = new THREE.PerspectiveCamera(
    38,
    canvas.clientWidth / canvas.clientHeight,
    0.01,
    20,
  );
  const characters = {
    player: createSurvivor("base"),
    street: createSurvivor("street"),
    reinforced: createSurvivor("reinforced"),
    armored: createSurvivor("armored"),
    lookout: createNpc("lookout", npcLabel),
    police: createNpc("police", npcLabel),
    swat: createNpc("swat", npcLabel),
  };
  const weapon = createPistol();
  const weapons = {
    pistol: weapon,
    smg: createWeapon("smg"),
    rifle: createWeapon("rifle"),
    sniper: createWeapon("sniper"),
  };
  scene.add(
    ...Object.values(characters).map((c) => c.root),
    ...Object.values(weapons).map((w) => w.root),
  );
  // Preview materials have their own lifecycle; closing the viewer cannot dispose live-game materials.
  const previewMaterials = new Map<THREE.Material, THREE.Material>();
  for (const root of [
    ...Object.values(characters).map((c) => c.root),
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
    new THREE.MeshStandardMaterial({ color: 0x8d8981, roughness: 0.8 }),
  );
  base.position.y = -0.04;
  scene.add(base);
  let mode = "player",
    yaw = 0.35,
    drag: number | undefined,
    lastX = 0,
    closed = false,
    dirty = true;
  let review: Awaited<ReturnType<typeof loadStreetReview>> | undefined;
  let reviewGeneration = 0;
  const reviewButtons = {
    meshy: "show-meshy",
    base: "show-image-base",
    street: "show-street-v2",
    reinforced: "show-image-reinforced",
    armored: "show-image-armored",
    lookout: "show-lookout",
    police: "show-police",
    swat: "show-swat",
  };
  const reviewMode = (kind: ImageModelKind) =>
    kind === "street" ? "street-v2" : "image-" + kind;
  let activeReviewKind: ImageModelKind | undefined;
  let motion = "still",
    lastAnimationFrame = performance.now();
  function setMotion(next: string) {
    motion = next;
    review?.mixer.stopAllAction();
    if (review) {
      review.root.traverse((o) => {
        if (o instanceof THREE.SkinnedMesh) o.skeleton.pose();
      });
      const clip = review.clips.find((c) => c.name === next);
      if (clip) review.mixer.clipAction(clip).reset().play();
    }
    for (const button of overlay.querySelectorAll<HTMLButtonElement>(
      "[data-motion]",
    ))
      button.classList.toggle("selected", button.dataset.motion === next);
    lastAnimationFrame = performance.now();
    dirty = true;
  }
  function setReviewSlot(slot: string, visible: boolean) {
    review?.root.traverse((o) => {
      if (o.userData.clothingSlot === slot) o.visible = visible;
    });
  }
  async function selectReview(kind: ImageModelKind = "street") {
    select("street");
    const ticket = ++reviewGeneration;
    mode = reviewMode(kind);
    const isNpc = kind === "lookout" || kind === "police" || kind === "swat";
    const referenceLink =
      overlay.querySelector<HTMLAnchorElement>("#image-reference")!;
    const isMeshy = kind === "meshy" || isNpc;
    referenceLink.href = isMeshy ? IMAGE_MODEL_URLS[kind] : IMAGE_REFERENCE_URL;
    referenceLink.textContent = isMeshy
      ? "DOWNLOAD ANIMATED MODEL"
      : "FOUR-CHARACTER REFERENCE IMAGE";
    activeReviewKind = kind;
    overlay.classList.add("reviewing");
    for (const c of Object.values(characters)) c.root.visible = false;
    overlay.querySelector("#show-street")!.classList.remove("selected");
    overlay.querySelector("#" + reviewButtons[kind])!.classList.add("selected");
    overlay.querySelector<HTMLElement>("#review-motion")!.hidden = isMeshy;
    overlay.querySelector<HTMLElement>("#meshy-motion")!.hidden = !isMeshy;
    if (isMeshy) yaw = 0.3;
    overlay.querySelector<HTMLElement>("#clothing-slots")!.hidden =
      kind === "base" || isMeshy;
    camera.position.set(0, 1.45, 3.5);
    camera.lookAt(0, 1.0, 0);
    const caption =
      kind === "meshy"
        ? "Your Meshy character · Movement and combat animations"
        : isNpc
          ? "Meshy " + kind.toUpperCase() + " · Movement and combat animations"
          : "Image rebuild · " + kind.toUpperCase() + " · Fresh Blender model";
    function configureMeshy() {
      if (!isMeshy || !review) return;
      const select =
        overlay.querySelector<HTMLSelectElement>("#meshy-animation")!;
      select.replaceChildren(
        ...["still", ...review.clips.map((c) => c.name)].map((name) => {
          const option = document.createElement("option");
          option.value = name;
          option.textContent = name.replaceAll("_", " ");
          return option;
        }),
      );
      select.value = "Idle_3";
      setMotion("Idle_3");
    }
    overlay.querySelector("#actor-description")!.textContent = caption;
    if (review?.kind === kind) {
      review.root.visible = true;
      configureMeshy();
      for (const input of overlay.querySelectorAll<HTMLInputElement>(
        "[data-slot]",
      ))
        setReviewSlot(input.dataset.slot!, true);
      dirty = true;
      return;
    }
    if (review) {
      review.mixer.stopAllAction();
      review.mixer.uncacheRoot(review.root);
      review.root.removeFromParent();
      disposeReview(review.root);
      review = undefined;
    }
    overlay.querySelector("#actor-description")!.textContent =
      "Loading image rebuild…";
    try {
      const loaded = await loadStreetReview(kind);
      if (closed || ticket !== reviewGeneration) {
        disposeReview(loaded.root);
        return;
      }
      review = loaded;
      scene.add(review.root);
      if (isMeshy) configureMeshy();
      else setMotion(motion);
      for (const input of overlay.querySelectorAll<HTMLInputElement>(
        "[data-slot]",
      ))
        setReviewSlot(input.dataset.slot!, input.checked);
      overlay.querySelector("#actor-description")!.textContent = caption;
      dirty = true;
    } catch {
      if (!closed && ticket === reviewGeneration) {
        overlay.querySelector("#actor-description")!.textContent =
          "Couldn’t load the model. Tap its image button to retry.";
        dirty = true;
      }
    }
  }
  function select(kind: keyof typeof characters | WeaponKind) {
    mode = kind;
    activeReviewKind = undefined;
    ++reviewGeneration;
    overlay.classList.remove("reviewing");
    if (review) review.root.visible = false;
    setMotion("still");
    overlay.querySelector<HTMLElement>("#review-motion")!.hidden = true;
    overlay.querySelector<HTMLElement>("#meshy-motion")!.hidden = true;
    for (const id of Object.values(reviewButtons))
      overlay.querySelector("#" + id)!.classList.remove("selected");
    const isPlayer = kind in characters;
    const referenceLink =
      overlay.querySelector<HTMLAnchorElement>("#image-reference")!;
    referenceLink.href = isPlayer ? IMAGE_REFERENCE_URL : WEAPON_RENDER_URL;
    referenceLink.textContent = isPlayer
      ? "FOUR-CHARACTER REFERENCE IMAGE"
      : "OPEN BLENDER WEAPON RENDER";
    base.visible = isPlayer;
    for (const [key, c] of Object.entries(characters))
      c.root.visible = key === kind;
    overlay.querySelector<HTMLElement>("#clothing-slots")!.hidden =
      !isPlayer || kind === "player";
    for (const input of overlay.querySelectorAll<HTMLInputElement>(
      "[data-slot]",
    )) {
      input.checked = true;
      for (const c of Object.values(characters))
        c.setSlot(input.dataset.slot as ClothingSlot, true);
    }
    for (const [key, w] of Object.entries(weapons))
      w.root.visible = key === kind;
    yaw = isPlayer ? Math.PI + 0.35 : -0.7;
    for (const key of [
      "player",
      "street",
      "reinforced",
      "armored",
      "lookout",
      "police",
      "swat",
      "pistol",
      "smg",
      "rifle",
      "sniper",
    ])
      overlay
        .querySelector("#show-" + key)!
        .classList.toggle("selected", key === kind);
    overlay.querySelector("#actor-description")!.textContent = isPlayer
      ? characters[kind as keyof typeof characters].root.userData.description ||
        OUTFIT_NAMES[
          characters[kind as keyof typeof characters]
            .outfit as keyof typeof OUTFIT_NAMES
        ]
      : WEAPONS[kind as WeaponKind].name +
        " · Original 3D model · Drag to inspect";
    if (isPlayer) {
      camera.position.set(0, 1.05, 3.4);
      camera.lookAt(0, 0.9, 0);
    } else {
      const bounds = new THREE.Box3().setFromObject(
          weapons[kind as WeaponKind].root,
        ),
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
  for (const kind of Object.keys(reviewButtons) as ImageModelKind[])
    overlay
      .querySelector("#" + reviewButtons[kind])!
      .addEventListener("click", () => void selectReview(kind));
  for (const button of overlay.querySelectorAll<HTMLButtonElement>(
    "[data-motion]",
  ))
    button.addEventListener("click", () => setMotion(button.dataset.motion!));
  overlay
    .querySelector<HTMLSelectElement>("#meshy-animation")!
    .addEventListener("change", (e) =>
      setMotion((e.target as HTMLSelectElement).value),
    );
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
  for (const kind of [
    "street",
    "reinforced",
    "armored",
    "smg",
    "rifle",
    "sniper",
  ] as const)
    overlay
      .querySelector("#show-" + kind)!
      .addEventListener("click", () => select(kind));
  for (const input of overlay.querySelectorAll<HTMLInputElement>("[data-slot]"))
    input.addEventListener("change", () => {
      for (const c of Object.values(characters))
        c.setSlot(input.dataset.slot as ClothingSlot, input.checked);
      setReviewSlot(input.dataset.slot!, input.checked);
      dirty = true;
    });
  const previous = document.activeElement as HTMLElement | null;
  function close() {
    if (closed) return;
    closed = true;
    for (const w of Object.values(weapons)) {
      w.root.userData.weaponDisposed = true;
      disposeReview(w.root);
    }
    observer.disconnect();
    window.removeEventListener("keydown", keydown, true);
    if (review) {
      review.mixer.stopAllAction();
      review.mixer.uncacheRoot(review.root);
      review.root.removeFromParent();
      disposeReview(review.root);
    }
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    (base.material as THREE.Material).dispose();
    for (const mat of previewMaterials.values()) {
      if (mat instanceof THREE.MeshBasicMaterial) mat.map?.dispose();
      mat.dispose();
    }
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
        ...overlay.querySelectorAll<HTMLElement>(
          "button, input:not([disabled])",
        ),
      ].filter((button) => button.getClientRects().length > 0);
      const index = buttons.indexOf(document.activeElement as HTMLElement),
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
    const now = performance.now();
    if (activeReviewKind && review && motion !== "still") {
      review.mixer.update(Math.min((now - lastAnimationFrame) / 1000, 0.05));
      dirty = true;
    }
    lastAnimationFrame = now;
    const weaponState = Object.values(weapons)
      .map((w) => w.root.userData.weaponSource)
      .join(",");
    if (canvas.dataset.weaponSources !== weaponState) {
      canvas.dataset.weaponSources = weaponState;
      dirty = true;
    }
    if (!dirty) return;
    dirty = false;
    for (const c of Object.values(characters)) c.root.rotation.y = yaw;
    if (review) review.root.rotation.y = yaw;
    for (const w of Object.values(weapons)) w.root.rotation.y = yaw;
    renderer.render(scene, camera);
    canvas.dataset.model = mode;
    canvas.dataset.reviewLoaded = String(
      !!review && review.kind === activeReviewKind,
    );
    canvas.dataset.reviewKind = activeReviewKind || "";
    canvas.dataset.motion = motion;
    canvas.dataset.reviewClips = JSON.stringify(
      review?.clips.map((c) => c.name) || [],
    );
    canvas.dataset.reviewTime = String(review?.mixer.time || 0);
    canvas.dataset.reviewArmPose =
      review?.root
        .getObjectByName("mixamorigLeftArm")
        ?.quaternion.toArray()
        .join(",") || "";
    canvas.dataset.handPose =
      review?.root.getObjectByName("finger0R")?.quaternion.x.toFixed(4) || "";
    canvas.dataset.bonePose =
      review?.root.getObjectByName("shinL")?.quaternion.x.toFixed(4) || "";
    canvas.dataset.hiddenSlots = [
      ...overlay.querySelectorAll<HTMLInputElement>("[data-slot]"),
    ]
      .filter((i) => !i.checked)
      .map((i) => i.dataset.slot)
      .join(",");
    canvas.dataset.drawCalls = String(renderer.info.render.calls);
    canvas.dataset.triangles = String(renderer.info.render.triangles);
    canvas.dataset.rotation = yaw.toFixed(3);
  }
  (overlay.querySelector("#close-actors") as HTMLButtonElement).focus();
  draw();
}
