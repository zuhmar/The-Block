import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createSmoothSurvivor, garmentGeometry } from "./smooth-survivor";
import { addProtectiveOutfit } from "./protective-outfits";
import type { ClothingSlot } from "./survivor-models";
export const NPC_KINDS = ["lookout", "police", "swat"] as const;
export type NpcKind = (typeof NPC_KINDS)[number];
const materials = new Map<number, THREE.MeshStandardMaterial>();
function mat(color: number) {
  if (!materials.has(color))
    materials.set(
      color,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.4,
        metalness: 0.06,
      }),
    );
  return materials.get(color)!;
}
const WHITE = 0xf1f3f5,
  OLIVE = 0x687542,
  NAVY = 0x29334f,
  DARK = 0x1d242e,
  EDGE = 0x59687e,
  IVORY = 0xdbd4c3;
export function createNpc(
  kind: NpcKind,
  makeLabel?: (text: string, w: number, h: number) => THREE.Mesh,
) {
  const actor = createSmoothSurvivor(
    false,
    mat(WHITE),
    mat(OLIVE),
    mat(DARK),
    mat(DARK),
    mat(IVORY),
    mat(EDGE),
  );
  const slots = actor.slots;
  function add(
    g: THREE.Group,
    name: string,
    geo: THREE.BufferGeometry,
    color: number | THREE.Material,
    x = 0,
    y = 0,
    z = 0,
  ) {
    const m = new THREE.Mesh(
      geo,
      typeof color === "number" ? mat(color) : color,
    );
    m.name = name;
    m.position.set(x, y, z);
    g.add(m);
    return m;
  }
  function oval(
    g: THREE.Group,
    name: string,
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    rz: number,
    color: number,
  ) {
    const m = add(g, name, new THREE.SphereGeometry(1, 14, 9), color, x, y, z);
    m.scale.set(rx, ry, rz);
    return m;
  }
  function group(parent: THREE.Group, slot: ClothingSlot) {
    const g = new THREE.Group();
    g.name = kind + "-" + slot;
    g.userData.clothingSlot = slot;
    parent.add(g);
    slots[slot].push(g);
    return g;
  }
  function panel(
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
    const shape = new THREE.Shape(),
      c = Math.min(w, h) * 0.16;
    shape.moveTo(-w / 2 + c, -h / 2);
    shape.lineTo(w / 2 - c, -h / 2);
    shape.lineTo(w / 2, -h / 2 + c);
    shape.lineTo(w / 2, h / 2 - c);
    shape.lineTo(w / 2 - c, h / 2);
    shape.lineTo(-w / 2 + c, h / 2);
    shape.lineTo(-w / 2, h / 2 - c);
    shape.lineTo(-w / 2, -h / 2 + c);
    shape.closePath();
    const bevel = Math.min(0.005, h * 0.1);
    return add(
      g,
      name,
      new THREE.ExtrudeGeometry(shape, {
        depth: d,
        bevelEnabled: true,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelSegments: 2,
        steps: 1,
      }),
      color,
      x,
      y,
      z,
    );
  }
  function tube(
    g: THREE.Group,
    name: string,
    pts: number[][],
    r: number,
    color: number,
  ) {
    return add(
      g,
      name,
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))),
        10,
        r,
        5,
        false,
      ),
      color,
    );
  }
  if (kind === "swat") {
    addProtectiveOutfit(
      actor,
      true,
      mat(WHITE),
      mat(DARK),
      mat(0x10151d),
      mat(EDGE),
      mat(0x303a4e),
    );
    for (const g of slots.headwear) {
      g.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      g.removeFromParent();
    }
    slots.headwear.length = 0;
    const hat = group(actor.head, "headwear");
    add(
      hat,
      "swat-tactical-helmet",
      new THREE.SphereGeometry(0.317, 28, 15, 0, Math.PI * 2, 0, 1.7),
      DARK,
      0,
      1.68,
      0,
    );
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0xb7d8f5,
      transparent: true,
      opacity: 0.24,
      roughness: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    add(
      hat,
      "clear-face-shield",
      new THREE.SphereGeometry(0.345, 24, 14, Math.PI, Math.PI, 0.6, 1.5),
      shieldMat,
      0,
      1.67,
      -0.035,
    );
    tube(
      hat,
      "face-shield-rim",
      [
        [-0.29, 1.63, -0.18],
        [-0.23, 1.4, -0.22],
        [0, 1.375, -0.3],
        [0.23, 1.4, -0.22],
        [0.29, 1.63, -0.18],
      ],
      0.009,
      EDGE,
    );
    panel(hat, "helmet-mount", 0, 1.9, -0.2, 0.09, 0.07, 0.035, DARK);
  } else {
    const easy = kind === "lookout",
      torso = group(actor.torso, "torso"),
      hat = group(actor.head, "headwear");
    add(
      torso,
      "short-sleeve-uniform-body",
      garmentGeometry(
        [
          [0, 1.36, 0, 0.1, 0.1],
          [0, 1.3, 0, 0.203, 0.13],
          [0, 1.14, 0, 0.208, 0.145],
          [0, 0.87, 0, 0.185, 0.128],
        ],
        18,
        20,
      ),
      easy ? 0xbec0bf : NAVY,
    );
    if (easy) {
      for (const s of [-1, 1]) {
        const vest = panel(
          torso,
          "olive-open-vest",
          s * 0.13,
          1.12,
          -0.143,
          0.13,
          0.42,
          0.027,
          OLIVE,
        );
        vest.rotation.y = s * 0.19;
      }
      tube(
        torso,
        "sling-strap",
        [
          [-0.17, 1.34, -0.09],
          [0, 1.12, -0.18],
          [0.16, 0.94, -0.14],
        ],
        0.024,
        DARK,
      );
      panel(
        torso,
        "crossbody-pouch",
        0.09,
        1.01,
        -0.21,
        0.2,
        0.14,
        0.055,
        DARK,
      );
      add(
        hat,
        "backward-cap-crown",
        new THREE.SphereGeometry(0.302, 28, 13, 0, Math.PI * 2, 0, Math.PI / 2),
        OLIVE,
        0,
        1.67,
        0,
      );
      oval(hat, "backward-cap-brim", 0, 1.675, 0.25, 0.24, 0.025, 0.18, OLIVE);
    } else {
      panel(
        torso,
        "police-protective-vest",
        0,
        1.16,
        -0.16,
        0.32,
        0.31,
        0.045,
        NAVY,
      );
      for (const s of [-1, 1]) {
        panel(
          torso,
          "vest-strap",
          s * 0.12,
          1.29,
          -0.155,
          0.04,
          0.15,
          0.025,
          DARK,
        );
        panel(
          torso,
          "duty-pouch",
          s * 0.135,
          0.935,
          -0.17,
          0.09,
          0.1,
          0.06,
          DARK,
        );
      }
      const badge = new THREE.Shape();
      badge.moveTo(-0.025, 0.025);
      badge.lineTo(0.025, 0.025);
      badge.lineTo(0.022, -0.009);
      badge.lineTo(0, -0.034);
      badge.lineTo(-0.022, -0.009);
      badge.closePath();
      add(
        torso,
        "generic-police-shield",
        new THREE.ExtrudeGeometry(badge, { depth: 0.005, bevelEnabled: false }),
        0xb8c3cf,
        -0.09,
        1.32,
        -0.185,
      );
      panel(torso, "belt-radio", 0.22, 1.02, -0.08, 0.065, 0.13, 0.045, DARK);
      tube(
        torso,
        "radio-antenna",
        [
          [0.22, 1.08, -0.07],
          [0.22, 1.18, -0.07],
        ],
        0.005,
        DARK,
      );
      add(
        hat,
        "peaked-police-cap",
        garmentGeometry(
          [
            [0, 1.97, 0, 0.025, 0.02],
            [0, 1.945, 0, 0.21, 0.19],
            [0, 1.875, 0, 0.3, 0.27],
            [0, 1.77, 0, 0.305, 0.28],
            [0, 1.7, 0, 0.305, 0.29],
          ],
          10,
          28,
        ),
        NAVY,
      );
      oval(hat, "police-cap-peak", 0, 1.705, -0.24, 0.245, 0.023, 0.16, DARK);
      panel(hat, "cap-shield", 0, 1.815, -0.32, 0.045, 0.055, 0.008, 0xcbd0d7);
    }
    for (let i = 0; i < 2; i++) {
      const s = i === 0 ? -1 : 1,
        arm = group(actor.arms[i], "torso"),
        leg = group(actor.legs[i], "legs"),
        shoe = group(actor.legs[i], "footwear");
      add(
        arm,
        "short-shirt-sleeve",
        garmentGeometry(
          [
            [0, 0.025, 0, 0.055, 0.065],
            [s * 0.015, -0.025, 0, 0.086, 0.083],
            [s * 0.06, -0.17, 0.008, 0.083, 0.08],
          ],
          10,
          16,
        ),
        easy ? 0xbec0bf : NAVY,
      );
      const rings: [number, number, number, number, number][] = [
        [0, 0.015, 0, 0.084, 0.087],
        [s * 0.015, -0.13, 0.005, 0.096, 0.09],
        [s * 0.025, -0.32, 0.01, 0.087, 0.08],
        [
          s * 0.03,
          easy ? -0.43 : -0.72,
          0,
          easy ? 0.086 : 0.067,
          easy ? 0.08 : 0.06,
        ],
      ];
      add(
        leg,
        easy ? "lookout-shorts" : "police-duty-trousers",
        garmentGeometry(rings, 16, 18),
        easy ? 0x393c41 : NAVY,
      );
      oval(
        shoe,
        "rounded-shoe-sole",
        s * 0.03,
        -0.8,
        -0.06,
        0.102,
        0.063,
        0.175,
        easy ? IVORY : DARK,
      );
      oval(
        shoe,
        "rounded-shoe-upper",
        s * 0.03,
        -0.75,
        -0.055,
        0.093,
        0.085,
        0.16,
        easy ? IVORY : DARK,
      );
      for (let n = 0; n < 3; n++) {
        const z = -0.12 + n * 0.027;
        tube(
          shoe,
          "shoelace",
          [
            [s * 0.03 - 0.05, -0.68, z],
            [s * 0.03, -0.655, z - 0.007],
            [s * 0.03 + 0.05, -0.68, z],
          ],
          0.005,
          easy ? DARK : EDGE,
        );
      }
    }
  }
  const waist = group(actor.torso, "legs");
  add(
    waist,
    "continuous-trouser-waist",
    garmentGeometry(
      [
        [0, 0.94, 0, 0.18, 0.137],
        [0, 0.865, 0, 0.18, 0.125],
        [0, 0.81, 0, 0.11, 0.075],
        [0, 0.785, 0, 0.025, 0.025],
      ],
      10,
      18,
    ),
    kind === "police" ? NAVY : DARK,
  );
  // Preserve transparent shield separately; bake all opaque clothing by slot/material.
  for (const groups of Object.values(slots))
    for (const g of groups) {
      const parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
      for (const child of [...g.children])
        if (
          child instanceof THREE.Mesh &&
          !(child.material as THREE.Material).transparent
        ) {
          child.updateMatrix();
          const geo = child.geometry.clone().applyMatrix4(child.matrix);
          const flat = geo.index ? geo.toNonIndexed() : geo;
          if (flat !== geo) geo.dispose();
          const material = child.material as THREE.Material;
          if (!parts.has(material)) parts.set(material, []);
          parts.get(material)!.push(flat);
          child.geometry.dispose();
          g.remove(child);
        }
      for (const [material, geos] of parts) {
        const geo = mergeGeometries(geos)!;
        geos.forEach((g) => g.dispose());
        add(g, kind + "-surface", geo, material);
      }
    }
  if (makeLabel && kind !== "lookout") {
    const label = makeLabel(kind.toUpperCase(), 0.25, 0.07);
    label.name = "npc-identification";
    label.position.set(0, 1.23, kind === "swat" ? -0.285 : -0.22);
    label.rotation.y = Math.PI;
    slots.torso[0].add(label);
  }
  actor.root.name = "npc-" + kind;
  actor.root.userData.kind = kind;
  actor.root.userData.description =
    kind === "lookout"
      ? "Easy · Lookout · Olive streetwear"
      : kind === "police"
        ? "Medium · Police · Navy duty uniform"
        : "Hard · SWAT · Tactical armor & clear shield";
  return {
    ...actor,
    outfit: kind,
    setSlot(slot: ClothingSlot, visible: boolean) {
      slots[slot].forEach((g) => (g.visible = visible));
    },
  };
}
