import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { garmentGeometry, createSmoothSurvivor } from "./smooth-survivor";

type Base = ReturnType<typeof createSmoothSurvivor>;
export function addProtectiveOutfit(
  actor: Base,
  heavy: boolean,
  skin: THREE.Material,
  fabric: THREE.Material,
  trim: THREE.Material,
  edge: THREE.Material,
  amber: THREE.Material,
) {
  const name = heavy ? "armored" : "reinforced",
    color = heavy ? amber : fabric;
  function add(
    g: THREE.Group,
    name: string,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
  ) {
    const m = new THREE.Mesh(geo, mat);
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
    mat: THREE.Material,
  ) {
    const m = add(g, name, new THREE.SphereGeometry(1, 16, 10), mat, x, y, z);
    m.scale.set(rx, ry, rz);
    return m;
  }
  function slot(parent: THREE.Group, key: keyof Base["slots"]) {
    const g = new THREE.Group();
    g.name = name + "-" + key;
    g.userData.clothingSlot = key;
    parent.add(g);
    actor.slots[key].push(g);
    return g;
  }
  // Eight-sided bevels read as shaped protective plates rather than stacks of cubes.
  function plate(
    g: THREE.Group,
    name: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
  ) {
    const c = Math.min(w, h) * 0.18,
      s = new THREE.Shape();
    s.moveTo(-w / 2 + c, -h / 2);
    s.lineTo(w / 2 - c, -h / 2);
    s.lineTo(w / 2, -h / 2 + c);
    s.lineTo(w / 2, h / 2 - c);
    s.lineTo(w / 2 - c, h / 2);
    s.lineTo(-w / 2 + c, h / 2);
    s.lineTo(-w / 2, h / 2 - c);
    s.lineTo(-w / 2, -h / 2 + c);
    s.closePath();
    return add(
      g,
      name,
      new THREE.ExtrudeGeometry(s, {
        depth: d,
        steps: 1,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.008,
        bevelSegments: 2,
      }),
      mat,
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
    mat: THREE.Material,
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
      mat,
    );
  }
  const torso = slot(actor.torso, "torso"),
    hat = slot(actor.head, "headwear");
  add(
    torso,
    "shaped-field-jacket",
    garmentGeometry(
      [
        [0, 1.36, 0, 0.11, 0.1],
        [0, 1.31, 0, 0.204, 0.128],
        [0, 1.19, 0, 0.213, 0.148],
        [0, 1.02, 0, 0.202, 0.145],
        [0, 0.87, 0, 0.185, 0.13],
      ],
      20,
      22,
    ),
    color,
  );
  add(
    torso,
    "padded-standing-collar",
    garmentGeometry(
      [
        [0, 1.41, 0, 0.086, 0.08],
        [0, 1.36, 0, 0.105, 0.1],
        [0, 1.32, 0, 0.12, 0.11],
      ],
      6,
      20,
    ),
    trim,
  );
  add(
    torso,
    "shaped-utility-belt",
    garmentGeometry(
      [
        [0, 0.94, 0, 0.208, 0.153],
        [0, 0.885, 0, 0.2, 0.145],
      ],
      3,
      22,
    ),
    trim,
  );
  plate(torso, "belt-buckle", 0, 0.915, -0.167, 0.065, 0.05, 0.016, edge);
  tube(
    torso,
    "jacket-zipper",
    [
      [0, 1.34, -0.115],
      [0, 1.2, -0.153],
      [0, 0.98, -0.151],
    ],
    0.005,
    edge,
  );
  for (const side of [-1, 1]) {
    const p = plate(
      torso,
      "chest-pocket",
      side * 0.105,
      1.23,
      -0.163,
      0.12,
      0.13,
      0.025,
      trim,
    );
    p.rotation.y = side * 0.16;
    plate(
      torso,
      "pocket-flap",
      side * 0.105,
      1.28,
      -0.173,
      0.13,
      0.035,
      0.015,
      fabric,
    );
    oval(
      torso,
      "pocket-fastener",
      side * 0.105,
      1.28,
      -0.183,
      0.009,
      0.009,
      0.004,
      edge,
    );
    plate(
      torso,
      "belt-pouch",
      side * 0.15,
      0.935,
      -0.184,
      0.09,
      0.11,
      0.065,
      trim,
    );
    tube(
      torso,
      "webbing-strap",
      [
        [side * 0.13, 1.33, -0.1],
        [side * 0.14, 1.23, -0.182],
        [side * 0.14, 1.02, -0.164],
      ],
      0.015,
      trim,
    );
  }
  if (heavy) {
    plate(
      torso,
      "contoured-chest-backing",
      0,
      1.265,
      -0.192,
      0.4,
      0.19,
      0.045,
      trim,
    );
    plate(
      torso,
      "amber-chest-shell",
      0,
      1.28,
      -0.247,
      0.335,
      0.14,
      0.025,
      amber,
    );
    for (let n = 0; n < 3; n++)
      plate(
        torso,
        "overlapping-abdomen-plate",
        0,
        1.14 - n * 0.073,
        -0.202,
        0.29 - n * 0.025,
        0.065,
        0.026,
        amber,
      );
  }
  for (let i = 0; i < 2; i++) {
    const s = i === 0 ? -1 : 1,
      arm = slot(actor.arms[i], "torso"),
      leg = slot(actor.legs[i], "legs"),
      boot = slot(actor.legs[i], "footwear");
    add(
      arm,
      "continuous-protective-sleeve",
      garmentGeometry(
        [
          [0, 0.025, 0, 0.055, 0.065],
          [s * 0.018, -0.04, 0, 0.085, 0.085],
          [s * 0.065, -0.19, 0.008, 0.083, 0.078],
          [s * 0.085, -0.27, 0.012, 0.082, 0.075],
          [s * 0.055, -0.39, -0.009, 0.078, 0.072],
          [s * 0.04, -0.475, -0.018, 0.058, 0.056],
        ],
        20,
        18,
      ),
      color,
    );
    add(
      arm,
      "sleeve-cuff",
      garmentGeometry(
        [
          [s * 0.04, -0.44, -0.018, 0.061, 0.06],
          [s * 0.04, -0.48, -0.018, 0.056, 0.055],
        ],
        3,
        18,
      ),
      trim,
    );
    const shoulder = oval(
      arm,
      "rounded-shoulder-cap",
      s * 0.01,
      -0.035,
      0.005,
      heavy ? 0.132 : 0.097,
      0.08,
      heavy ? 0.126 : 0.095,
      heavy ? edge : trim,
    );
    shoulder.rotation.z = s * 0.16;
    plate(
      arm,
      "shaped-elbow-guard",
      s * 0.085,
      -0.26,
      -0.075,
      0.12,
      0.14,
      0.035,
      edge,
    );
    if (heavy) {
      plate(
        arm,
        "shoulder-inset",
        s * 0.005,
        -0.015,
        -0.12,
        0.115,
        0.042,
        0.015,
        amber,
      );
      add(
        arm,
        "forearm-gauntlet",
        garmentGeometry(
          [
            [s * 0.075, -0.31, -0.01, 0.089, 0.08],
            [s * 0.055, -0.39, -0.014, 0.083, 0.076],
            [s * 0.04, -0.45, -0.018, 0.07, 0.067],
          ],
          7,
          18,
        ),
        trim,
      );
      plate(
        arm,
        "amber-forearm-inset",
        s * 0.06,
        -0.37,
        -0.094,
        0.078,
        0.1,
        0.015,
        amber,
      );
    }
    add(
      leg,
      "shaped-military-trouser",
      garmentGeometry(
        [
          [0, 0.015, 0, 0.082, 0.086],
          [s * 0.014, -0.13, 0.005, 0.092, 0.092],
          [s * 0.025, -0.3, 0.01, 0.086, 0.082],
          [s * 0.03, -0.41, 0.006, 0.079, 0.075],
          [s * 0.03, -0.58, 0, 0.085, 0.074],
          [s * 0.03, -0.72, 0, 0.064, 0.06],
        ],
        20,
        18,
      ),
      fabric,
    );
    plate(
      leg,
      "cargo-pocket",
      s * 0.067,
      -0.19,
      -0.07,
      0.11,
      0.16,
      0.045,
      trim,
    );
    plate(
      leg,
      "cargo-flap",
      s * 0.067,
      -0.13,
      -0.08,
      0.117,
      0.04,
      0.02,
      heavy ? edge : fabric,
    );
    plate(
      leg,
      "beveled-knee-guard",
      s * 0.027,
      -0.395,
      -0.084,
      0.13,
      0.15,
      0.035,
      edge,
    );
    if (heavy) {
      plate(
        leg,
        "thigh-armor",
        s * 0.02,
        -0.2,
        -0.12,
        0.135,
        0.19,
        0.025,
        edge,
      );
      plate(
        leg,
        "shin-armor-backing",
        s * 0.03,
        -0.59,
        -0.078,
        0.14,
        0.19,
        0.032,
        trim,
      );
      plate(
        leg,
        "amber-shin-inset",
        s * 0.03,
        -0.58,
        -0.119,
        0.095,
        0.14,
        0.015,
        amber,
      );
    }
    const x = s * 0.03;
    oval(boot, "rounded-boot-sole", x, -0.801, -0.06, 0.107, 0.062, 0.18, trim);
    oval(
      boot,
      "shaped-combat-boot",
      x,
      -0.75,
      -0.06,
      0.097,
      0.092,
      0.164,
      trim,
    );
    add(
      boot,
      "boot-ankle-collar",
      garmentGeometry(
        [
          [x, -0.57, 0.02, 0.075, 0.076],
          [x, -0.65, 0.02, 0.083, 0.08],
          [x, -0.76, 0.015, 0.082, 0.085],
        ],
        8,
        18,
      ),
      trim,
    );
    oval(boot, "boot-tongue", x, -0.694, -0.07, 0.058, 0.05, 0.093, fabric);
    for (let n = 0; n < 4; n++) {
      const z = -0.12 + n * 0.028;
      tube(
        boot,
        "boot-lace",
        [
          [x - 0.055, -0.665, z],
          [x, -0.639, z - 0.008],
          [x + 0.055, -0.665, z],
        ],
        0.005,
        edge,
      );
    }
    if (heavy) {
      plate(
        boot,
        "amber-toe-guard",
        x,
        -0.76,
        -0.217,
        0.13,
        0.055,
        0.025,
        amber,
      );
      plate(boot, "ankle-armor", x, -0.61, -0.066, 0.12, 0.085, 0.025, edge);
    }
  }
  if (!heavy) {
    add(
      hat,
      "open-face-combat-shell",
      new THREE.SphereGeometry(0.313, 32, 16, 0, Math.PI * 2, 0, 1.68),
      fabric,
      0,
      1.68,
      0,
    );
    const rim = add(
      hat,
      "rolled-helmet-rim",
      new THREE.TorusGeometry(0.312, 0.011, 6, 32),
      trim,
      0,
      1.65,
      0,
    );
    rim.rotation.x = Math.PI / 2;
    for (const side of [-1, 1]) {
      oval(
        hat,
        "helmet-rivet",
        side * 0.302,
        1.72,
        -0.07,
        0.009,
        0.009,
        0.012,
        edge,
      );
      tube(
        hat,
        "helmet-side-strap",
        [
          [side * 0.27, 1.65, 0.025],
          [side * 0.23, 1.45, 0.025],
          [side * 0.12, 1.385, 0.015],
        ],
        0.009,
        trim,
      );
    }
  } else {
    add(
      hat,
      "smooth-enclosed-helmet-shell",
      new THREE.SphereGeometry(0.324, 32, 22),
      edge,
      0,
      1.65,
      0,
    );
    // Curved visor sits close to the shell; the rim and chin guard enclose its edges.
    oval(hat, "visor-frame", 0, 1.68, -0.245, 0.285, 0.225, 0.11, trim);
    oval(
      hat,
      "opaque-curved-visor",
      0,
      1.69,
      -0.274,
      0.264,
      0.191,
      0.091,
      skin,
    );
    plate(
      hat,
      "enclosed-chin-guard",
      0,
      1.445,
      -0.27,
      0.29,
      0.115,
      0.065,
      fabric,
    );
    for (let n = 0; n < 3; n++)
      plate(
        hat,
        "chin-vent",
        0,
        1.42 + n * 0.024,
        -0.287,
        0.09,
        0.006,
        0.004,
        trim,
      );
    const crown = oval(
      hat,
      "amber-crown-panel",
      0,
      1.945,
      -0.03,
      0.095,
      0.035,
      0.15,
      amber,
    );
    crown.rotation.x = -0.13;
    for (const s of [-1, 1]) {
      oval(
        hat,
        "amber-temple-panel",
        s * 0.306,
        1.715,
        -0.035,
        0.029,
        0.09,
        0.1,
        amber,
      );
      tube(
        hat,
        "helmet-panel-seam",
        [
          [s * 0.12, 1.94, -0.08],
          [s * 0.19, 1.87, -0.15],
          [s * 0.24, 1.8, -0.18],
        ],
        0.007,
        trim,
      );
    }
  }
  for (const groups of Object.values(actor.slots))
    for (const g of groups) {
      g.userData.parts = g.children.map((c) => c.name);
      const parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
      for (const child of [...g.children])
        if (child instanceof THREE.Mesh) {
          child.updateMatrix();
          const transformed = child.geometry.clone().applyMatrix4(child.matrix);
          const flat = transformed.index
            ? transformed.toNonIndexed()
            : transformed;
          if (flat !== transformed) transformed.dispose();
          const mat = child.material as THREE.Material;
          if (!parts.has(mat)) parts.set(mat, []);
          parts.get(mat)!.push(flat);
          child.geometry.dispose();
          g.remove(child);
        }
      for (const [mat, geos] of parts) {
        const geo = mergeGeometries(geos)!;
        geos.forEach((g) => g.dispose());
        add(g, g.name + "-surface", geo, mat);
      }
    }
  actor.root.name = "survivor-" + name;
  actor.root.userData.outfit = name;
  return actor;
}
