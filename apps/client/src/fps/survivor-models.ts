import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createStickPlayer } from "./actor-models";

export const OUTFITS = ["base", "street", "reinforced", "armored"] as const;
export type Outfit = (typeof OUTFITS)[number];
export const OUTFIT_NAMES: Record<Outfit, string> = {
  base: "Bare black stick figure",
  street: "Tier 1 · Street · Burgundy hoodie & cap",
  reinforced: "Tier 2 · Reinforced · Black military outfit & helmet",
  armored: "Tier 3 · Armored · Amber plates & full-face helmet",
};
export type ClothingSlot = "headwear" | "torso" | "legs" | "footwear";
const materials = new Map<number, THREE.MeshStandardMaterial>();
function material(color: number) {
  if (!materials.has(color))
    materials.set(
      color,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.36,
        metalness: 0.08,
      }),
    );
  return materials.get(color)!;
}
const BLACK = 0x090b10,
  CHARCOAL = 0x242932,
  EDGE = 0x4b535e,
  BURGUNDY = 0x861f3d,
  CUFF = 0x50152a,
  IVORY = 0xe9dfc7,
  AMBER = 0xe9a51d;

/** Rigid articulated outfit pieces follow the existing limb pivots; no textures or skinning runtime required. */
export function createSurvivor(outfit: Outfit = "base") {
  const actor = createStickPlayer();
  actor.root.name = "survivor-" + outfit;
  actor.root.userData.outfit = outfit;
  // Approved character has a true oversized sphere and jet-black skin.
  actor.head.traverse((o) => {
    if (o instanceof THREE.Mesh) o.geometry.dispose();
  });
  actor.head.clear();
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.275, 20, 14),
    material(BLACK),
  );
  head.name = "featureless-black-head";
  head.position.y = 1.65;
  actor.head.add(head);
  actor.root.traverse((o) => {
    if (o instanceof THREE.Mesh) o.material = material(BLACK);
  });
  const slots: Record<ClothingSlot, THREE.Group[]> = {
    headwear: [],
    torso: [],
    legs: [],
    footwear: [],
  };
  function group(parent: THREE.Group, slot: ClothingSlot) {
    const g = new THREE.Group();
    g.name = outfit + "-" + slot;
    g.userData.clothingSlot = slot;
    parent.add(g);
    slots[slot].push(g);
    return g;
  }
  function mesh(
    g: THREE.Group,
    name: string,
    geometry: THREE.BufferGeometry,
    x: number,
    y: number,
    z: number,
    color: number,
  ) {
    const m = new THREE.Mesh(geometry, material(color));
    m.name = name;
    m.position.set(x, y, z);
    g.add(m);
    return m;
  }
  function box(
    g: THREE.Group,
    name: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: number,
    radius = 0.018,
  ) {
    return mesh(
      g,
      name,
      new RoundedBoxGeometry(w, h, d, 1, Math.min(radius, w / 3, h / 3, d / 3)),
      x,
      y,
      z,
      color,
    );
  }
  function oval(
    g: THREE.Group,
    name: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: number,
  ) {
    const m = mesh(g, name, new THREE.SphereGeometry(1, 12, 8), x, y, z, color);
    m.scale.set(w, h, d);
    return m;
  }
  function sleeve(
    g: THREE.Group,
    name: string,
    a: number[],
    b: number[],
    r: number,
    color: number,
  ) {
    const start = new THREE.Vector3().fromArray(a),
      end = new THREE.Vector3().fromArray(b),
      delta = end.clone().sub(start);
    const m = mesh(
      g,
      name,
      new THREE.CapsuleGeometry(r, delta.length(), 3, 10),
      0,
      0,
      0,
      color,
    );
    m.position.copy(start.add(end).multiplyScalar(0.5));
    m.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      delta.normalize(),
    );
    return m;
  }
  // Rounded mitts keep the approved hand silhouette readable outside sleeves.
  for (let i = 0; i < actor.arms.length; i++) {
    const side = i === 0 ? -1 : 1;
    oval(
      actor.arms[i],
      "rounded-black-hand",
      side * 0.035,
      -0.51,
      -0.018,
      0.065,
      0.085,
      0.062,
      BLACK,
    );
  }
  if (outfit !== "base") {
    const isStreet = outfit === "street",
      heavy = outfit === "armored",
      fabric = isStreet ? BURGUNDY : heavy ? AMBER : CHARCOAL;
    const torso = group(actor.torso, "torso");
    box(
      torso,
      isStreet
        ? "hoodie-body"
        : heavy
          ? "protective-jacket"
          : "military-field-jacket",
      0,
      1.095,
      0,
      0.39,
      0.48,
      0.275,
      fabric,
      0.05,
    );
    box(
      torso,
      "waistband",
      0,
      0.876,
      0,
      0.38,
      0.065,
      0.28,
      isStreet ? CUFF : BLACK,
    );
    if (isStreet) {
      oval(torso, "hood-down", 0, 1.34, 0.095, 0.225, 0.115, 0.14, CUFF);
      box(
        torso,
        "kangaroo-pocket",
        0,
        1.015,
        -0.153,
        0.25,
        0.135,
        0.04,
        BURGUNDY,
      );
      for (const x of [-0.072, 0.072]) {
        box(
          torso,
          "hood-drawstring",
          x,
          1.23,
          -0.148,
          0.012,
          0.15,
          0.015,
          IVORY,
          0.003,
        );
      }
      const chain = mesh(
        torso,
        "gold-chain",
        new THREE.TorusGeometry(0.1, 0.009, 4, 16, Math.PI),
        0,
        1.335,
        -0.156,
        0xd8ac40,
      );
      chain.rotation.z = Math.PI;
    } else {
      box(torso, "standing-collar", 0, 1.355, 0, 0.25, 0.095, 0.21, BLACK);
      box(
        torso,
        "jacket-zipper",
        0,
        1.11,
        -0.149,
        0.014,
        0.4,
        0.018,
        EDGE,
        0.003,
      );
      for (const side of [-1, 1]) {
        box(
          torso,
          "chest-pocket",
          side * 0.105,
          1.225,
          -0.165,
          0.12,
          0.12,
          0.045,
          heavy ? EDGE : BLACK,
        );
        box(
          torso,
          "belt-pouch",
          side * 0.135,
          0.94,
          -0.18,
          0.115,
          0.12,
          0.08,
          BLACK,
        );
        box(
          torso,
          "webbing-strap",
          side * 0.135,
          1.17,
          -0.195,
          0.035,
          0.34,
          0.025,
          EDGE,
        );
      }
      box(torso, "utility-belt", 0, 0.9, 0, 0.43, 0.06, 0.3, BLACK);
      box(torso, "belt-buckle", 0, 0.9, -0.169, 0.065, 0.055, 0.018, EDGE);
    }
    if (heavy) {
      for (let n = 0; n < 3; n++)
        box(
          torso,
          "segmented-abdomen-plate",
          0,
          0.98 + n * 0.085,
          -0.2,
          0.26 + n * 0.035,
          0.075,
          0.075,
          AMBER,
        );
      box(
        torso,
        "chest-plate-backing",
        0,
        1.275,
        -0.155,
        0.43,
        0.19,
        0.12,
        BLACK,
      );
      box(
        torso,
        "amber-chest-plate",
        0,
        1.285,
        -0.227,
        0.35,
        0.145,
        0.045,
        AMBER,
      );
    }
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1,
        arm = group(actor.arms[i], "torso"),
        leg = group(actor.legs[i], "legs"),
        shoe = group(actor.legs[i], "footwear");
      sleeve(
        arm,
        "jacket-upper-sleeve",
        [0, 0, 0],
        [side * 0.085, -0.26, 0.018],
        isStreet ? 0.082 : 0.073,
        fabric,
      );
      sleeve(
        arm,
        "jacket-lower-sleeve",
        [side * 0.085, -0.26, 0.018],
        [side * 0.035, -0.43, -0.014],
        0.067,
        fabric,
      );
      sleeve(
        arm,
        "sleeve-cuff",
        [side * 0.04, -0.43, -0.014],
        [side * 0.035, -0.47, -0.018],
        0.066,
        isStreet ? CUFF : BLACK,
      );
      if (!isStreet) {
        box(
          arm,
          "elbow-guard",
          side * 0.085,
          -0.255,
          -0.055,
          0.12,
          0.13,
          0.055,
          EDGE,
        );
        box(
          arm,
          "shoulder-guard",
          0,
          -0.025,
          -0.005,
          heavy ? 0.23 : 0.15,
          0.12,
          0.22,
          heavy ? EDGE : BLACK,
        );
        if (heavy)
          box(
            arm,
            "amber-gauntlet",
            side * 0.045,
            -0.36,
            -0.073,
            0.11,
            0.14,
            0.065,
            AMBER,
          );
      }
      sleeve(
        leg,
        "cargo-upper-leg",
        [0, -0.015, 0],
        [side * 0.022, -0.36, 0.018],
        isStreet ? 0.097 : 0.085,
        CHARCOAL,
      );
      sleeve(
        leg,
        "cargo-lower-leg",
        [side * 0.022, -0.36, 0.018],
        [side * 0.03, -0.72, 0],
        isStreet ? 0.083 : 0.073,
        CHARCOAL,
      );
      box(
        leg,
        "cargo-pocket",
        side * 0.09,
        -0.2,
        -0.01,
        0.07,
        0.17,
        0.15,
        heavy ? EDGE : isStreet ? CUFF : BLACK,
      );
      if (!isStreet)
        box(
          leg,
          "knee-pad",
          side * 0.022,
          -0.39,
          -0.075,
          0.135,
          0.155,
          0.06,
          EDGE,
        );
      if (heavy) {
        box(
          leg,
          "thigh-plate",
          side * 0.02,
          -0.18,
          -0.105,
          0.14,
          0.2,
          0.05,
          EDGE,
        );
        box(
          leg,
          "shin-plate",
          side * 0.03,
          -0.59,
          -0.078,
          0.13,
          0.19,
          0.065,
          AMBER,
        );
      }
      const footX = side * 0.03;
      box(
        shoe,
        "shoe-sole",
        footX,
        -0.817,
        -0.055,
        0.18,
        0.055,
        0.31,
        isStreet ? IVORY : BLACK,
        0.02,
      );
      box(
        shoe,
        isStreet ? "ivory-sneaker" : "combat-boot",
        footX,
        -0.762,
        -0.05,
        0.17,
        0.105,
        0.29,
        isStreet ? IVORY : BLACK,
        0.03,
      );
      if (!isStreet)
        box(
          shoe,
          "boot-ankle",
          footX,
          -0.68,
          0.005,
          0.165,
          0.17,
          0.18,
          BLACK,
          0.025,
        );
      box(
        shoe,
        "shoe-color-panel",
        footX,
        -0.756,
        -0.13,
        0.12,
        0.045,
        0.07,
        isStreet ? BURGUNDY : heavy ? AMBER : EDGE,
      );
      for (let n = 0; n < 3; n++)
        box(
          shoe,
          "shoe-lace",
          footX,
          -0.7 + n * 0.014,
          -0.09,
          0.09,
          0.009,
          0.012,
          isStreet ? IVORY : EDGE,
          0.002,
        );
    }
    const hat = group(actor.head, "headwear");
    if (isStreet) {
      mesh(
        hat,
        "baseball-cap-crown",
        new THREE.SphereGeometry(0.291, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2),
        0,
        1.68,
        0,
        BURGUNDY,
      );
      oval(hat, "cap-brim", 0, 1.685, -0.255, 0.24, 0.025, 0.16, BURGUNDY);
      oval(hat, "cap-top-button", 0, 1.976, 0, 0.025, 0.015, 0.025, CUFF);
    } else if (!heavy) {
      mesh(
        hat,
        "open-face-military-helmet",
        new THREE.SphereGeometry(0.302, 18, 10, 0, Math.PI * 2, 0, 1.7),
        0,
        1.68,
        0,
        CHARCOAL,
      );
      const rim = mesh(
        hat,
        "helmet-rim",
        new THREE.TorusGeometry(0.3, 0.012, 4, 24),
        0,
        1.65,
        0,
        EDGE,
      );
      rim.rotation.x = Math.PI / 2;
    } else {
      mesh(
        hat,
        "closed-helmet-shell",
        new THREE.SphereGeometry(0.314, 20, 14),
        0,
        1.65,
        0,
        EDGE,
      );
      oval(
        hat,
        "opaque-full-face-visor",
        0,
        1.675,
        -0.255,
        0.262,
        0.2,
        0.105,
        BLACK,
      );
      box(
        hat,
        "closed-chin-guard",
        0,
        1.445,
        -0.235,
        0.3,
        0.13,
        0.17,
        CHARCOAL,
        0.035,
      );
      box(hat, "amber-helmet-crown", 0, 1.942, -0.04, 0.17, 0.055, 0.24, AMBER);
      for (const side of [-1, 1])
        box(
          hat,
          "amber-helmet-side",
          side * 0.29,
          1.68,
          -0.025,
          0.045,
          0.15,
          0.15,
          AMBER,
        );
      for (let n = 0; n < 3; n++)
        box(
          hat,
          "chin-vent",
          0,
          1.417 + n * 0.025,
          -0.326,
          0.1,
          0.009,
          0.012,
          BLACK,
          0.002,
        );
    }
  }
  // Bake only within a single limb and equipment slot, preserving articulation
  // and independent slot visibility while keeping phone draw calls bounded.
  for (const groups of Object.values(slots))
    for (const g of groups) {
      const parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
      for (const child of [...g.children])
        if (child instanceof THREE.Mesh) {
          child.updateMatrix();
          const geo = child.geometry.clone().applyMatrix4(child.matrix);
          const flat = geo.index ? geo.toNonIndexed() : geo;
          if (flat !== geo) geo.dispose();
          const mat = child.material as THREE.Material;
          if (!parts.has(mat)) parts.set(mat, []);
          parts.get(mat)!.push(flat);
          child.geometry.dispose();
          g.remove(child);
        }
      for (const [mat, geos] of parts) {
        const merged = mergeGeometries(geos)!;
        geos.forEach((geo) => geo.dispose());
        const surface = new THREE.Mesh(merged, mat);
        surface.name = g.name + "-surface";
        g.add(surface);
      }
    }
  return {
    ...actor,
    slots,
    outfit,
    setSlot(slot: ClothingSlot, visible: boolean) {
      slots[slot].forEach((g) => (g.visible = visible));
    },
  };
}
