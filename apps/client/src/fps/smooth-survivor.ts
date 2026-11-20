import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createStickPlayer } from "./actor-models";

type Ring = [number, number, number, number, number]; // center x/y/z, half width/depth
/** Sculpt a continuous garment surface through a smooth sequence of cross sections. */
export function garmentGeometry(rings: Ring[], segments = 20, sides = 20) {
  const path = new THREE.CatmullRomCurve3(
    rings.map((r) => new THREE.Vector3(r[0], r[1], r[2])),
  );
  const widths = new THREE.CatmullRomCurve3(
    rings.map((r) => new THREE.Vector3(r[3], r[4], 0)),
  );
  const positions: number[] = [],
    indices: number[] = [];
  for (let row = 0; row <= segments; row++) {
    const t = row / segments,
      p = path.getPoint(t),
      size = widths.getPoint(t);
    for (let col = 0; col <= sides; col++) {
      const angle = (col / sides) * Math.PI * 2;
      positions.push(
        p.x + Math.cos(angle) * Math.max(0.001, size.x),
        p.y,
        p.z + Math.sin(angle) * Math.max(0.001, size.y),
      );
    }
  }
  for (let row = 0; row < segments; row++)
    for (let col = 0; col < sides; col++) {
      const a = row * (sides + 1) + col,
        b = a + sides + 1;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  // End caps, with outward winding for either ascending or descending profiles.
  const descending = rings[0][1] > rings[rings.length - 1][1];
  if (!descending)
    for (let i = 0; i < indices.length; i += 3) {
      const swap = indices[i];
      indices[i] = indices[i + 1];
      indices[i + 1] = swap;
    }
  for (const end of [0, segments]) {
    const p = path.getPoint(end / segments),
      center = positions.length / 3;
    positions.push(p.x, p.y, p.z);
    for (let col = 0; col < sides; col++) {
      const a = end * (sides + 1) + col;
      const forward = (end === 0) === descending;
      indices.push(center, forward ? a + 1 : a, forward ? a : a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(
      Array.from({ length: positions.length / 3 }, (_, i) => [
        (i % (sides + 1)) / sides,
        Math.floor(i / (sides + 1)) / segments,
      ]).flat(),
      2,
    ),
  );
  geometry.computeVertexNormals();
  // Weld the duplicated circumference seam normals without introducing a lighting stripe.
  const normals = geometry.getAttribute("normal");
  for (let row = 0; row <= segments; row++) {
    const first = row * (sides + 1),
      last = first + sides;
    const n = new THREE.Vector3()
      .fromBufferAttribute(normals, first)
      .add(new THREE.Vector3().fromBufferAttribute(normals, last))
      .normalize();
    normals.setXYZ(first, n.x, n.y, n.z);
    normals.setXYZ(last, n.x, n.y, n.z);
  }
  return geometry;
}
export function createSmoothSurvivor(
  street: boolean,
  skin: THREE.Material,
  cloth: THREE.Material,
  cuff: THREE.Material,
  pants: THREE.Material,
  ivory: THREE.Material,
  gold: THREE.Material,
) {
  const actor = createStickPlayer();
  for (const g of [actor.head, actor.torso, ...actor.arms, ...actor.legs]) {
    g.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    g.clear();
  }
  const slots: Record<
    "headwear" | "torso" | "legs" | "footwear",
    THREE.Group[]
  > = { headwear: [], torso: [], legs: [], footwear: [] };
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
  function ellipsoid(
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
  function slot(parent: THREE.Group, key: keyof typeof slots) {
    const g = new THREE.Group();
    g.name = (street ? "street" : "base") + "-" + key;
    g.userData.clothingSlot = key;
    parent.add(g);
    slots[key].push(g);
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
    mat: THREE.Material,
    r = 0.02,
  ) {
    return add(
      g,
      name,
      new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 3, h / 3, d / 3)),
      mat,
      x,
      y,
      z,
    );
  }
  function tube(
    g: THREE.Group,
    name: string,
    points: number[][],
    radius: number,
    mat: THREE.Material,
  ) {
    return add(
      g,
      name,
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
        12,
        radius,
        6,
        false,
      ),
      mat,
    );
  }
  add(
    actor.head,
    "featureless-black-head",
    new THREE.SphereGeometry(0.285, 32, 22),
    skin,
    0,
    1.65,
    0,
  );
  add(
    actor.torso,
    "continuous-black-torso",
    garmentGeometry(
      [
        [0, 1.47, 0, 0.045, 0.045],
        [0, 1.35, 0, 0.07, 0.065],
        [0, 1.29, 0, 0.2, 0.09],
        [0, 1.2, 0, 0.13, 0.09],
        [0, 0.96, 0, 0.11, 0.085],
        [0, 0.86, 0, 0.14, 0.085],
        [0, 0.815, 0, 0.09, 0.065],
        [0, 0.8, 0, 0.01, 0.015],
      ],
      18,
      20,
    ),
    skin,
  );
  for (let i = 0; i < 2; i++) {
    const s = i === 0 ? -1 : 1,
      arm = actor.arms[i],
      leg = actor.legs[i];
    add(
      arm,
      "continuous-black-arm",
      garmentGeometry(
        [
          [0, 0.035, 0, 0.05, 0.05],
          [s * 0.035, -0.12, 0.005, 0.049, 0.049],
          [s * 0.075, -0.26, 0.012, 0.046, 0.046],
          [s * 0.055, -0.4, -0.005, 0.043, 0.043],
          [s * 0.04, -0.49, -0.018, 0.04, 0.04],
        ],
        16,
        14,
      ),
      skin,
    );
    ellipsoid(
      arm,
      "rounded-mitten-hand",
      s * 0.04,
      -0.535,
      -0.018,
      0.067,
      0.09,
      0.061,
      skin,
    );
    ellipsoid(
      arm,
      "thumb",
      s * 0.005,
      -0.515,
      -0.065,
      0.027,
      0.048,
      0.027,
      skin,
    );
    add(
      leg,
      "continuous-black-leg",
      garmentGeometry(
        [
          [0, 0.02, 0, 0.071, 0.067],
          [s * 0.01, -0.19, 0.007, 0.065, 0.062],
          [s * 0.025, -0.39, 0.012, 0.06, 0.058],
          [s * 0.03, -0.59, 0, 0.054, 0.052],
          [s * 0.03, -0.76, 0, 0.05, 0.05],
        ],
        18,
        14,
      ),
      skin,
    );
    ellipsoid(
      leg,
      "rounded-bare-foot",
      s * 0.03,
      -0.797,
      -0.055,
      0.085,
      0.069,
      0.145,
      skin,
    );
    if (!street) continue;
    const sleeve = slot(arm, "torso"),
      trouser = slot(leg, "legs"),
      shoe = slot(leg, "footwear");
    add(
      sleeve,
      "sculpted-baggy-sleeve",
      garmentGeometry(
        [
          [0, 0.035, 0, 0.055, 0.07],
          [s * 0.015, -0.025, 0, 0.094, 0.092],
          [s * 0.065, -0.17, 0.006, 0.098, 0.09],
          [s * 0.09, -0.265, 0.012, 0.093, 0.085],
          [s * 0.075, -0.34, -0.005, 0.103, 0.086],
          [s * 0.045, -0.43, -0.018, 0.065, 0.065],
        ],
        20,
        18,
      ),
      cloth,
    );
    add(
      sleeve,
      "ribbed-wrist-cuff",
      garmentGeometry(
        [
          [s * 0.045, -0.422, -0.018, 0.065, 0.065],
          [s * 0.04, -0.45, -0.018, 0.062, 0.061],
          [s * 0.04, -0.479, -0.018, 0.056, 0.055],
        ],
        5,
        18,
      ),
      cuff,
    );
    add(
      trouser,
      "sculpted-cargo-jogger",
      garmentGeometry(
        [
          [0, 0.015, 0, 0.087, 0.09],
          [s * 0.015, -0.09, 0.005, 0.103, 0.105],
          [s * 0.025, -0.24, 0.012, 0.106, 0.095],
          [s * 0.03, -0.38, 0.01, 0.098, 0.087],
          [s * 0.04, -0.5, -0.005, 0.108, 0.083],
          [s * 0.03, -0.64, 0, 0.083, 0.075],
          [s * 0.03, -0.72, 0, 0.066, 0.063],
        ],
        22,
        18,
      ),
      pants,
    );
    add(
      trouser,
      "ankle-cuff",
      garmentGeometry(
        [
          [s * 0.03, -0.7, 0, 0.068, 0.065],
          [s * 0.03, -0.745, 0, 0.064, 0.06],
        ],
        3,
        18,
      ),
      pants,
    );
    panel(
      trouser,
      "soft-cargo-pocket",
      s * 0.1,
      -0.225,
      -0.018,
      0.065,
      0.175,
      0.16,
      pants,
      0.022,
    );
    panel(
      trouser,
      "burgundy-pocket-flap",
      s * 0.116,
      -0.15,
      -0.022,
      0.063,
      0.045,
      0.17,
      cuff,
      0.014,
    );
    // Shaped sneaker: curved toe, raised heel, tongue and side panel instead of a cuboid.
    const x = s * 0.03;
    ellipsoid(
      shoe,
      "curved-sneaker-sole",
      x,
      -0.8,
      -0.065,
      0.105,
      0.063,
      0.18,
      ivory,
    );
    ellipsoid(
      shoe,
      "sneaker-upper",
      x,
      -0.756,
      -0.06,
      0.096,
      0.09,
      0.164,
      ivory,
    );
    ellipsoid(
      shoe,
      "padded-heel-collar",
      x,
      -0.7,
      0.035,
      0.078,
      0.067,
      0.081,
      ivory,
    );
    ellipsoid(
      shoe,
      "shoe-tongue",
      x,
      -0.697,
      -0.075,
      0.057,
      0.045,
      0.092,
      ivory,
    );
    ellipsoid(
      shoe,
      "burgundy-side-panel",
      x + s * 0.088,
      -0.757,
      -0.03,
      0.012,
      0.034,
      0.075,
      cloth,
    );
    for (let n = 0; n < 4; n++) {
      const z = -0.12 + n * 0.027;
      tube(
        shoe,
        "curved-shoelace",
        [
          [x - 0.055, -0.674, z],
          [x, -0.644, z - 0.008],
          [x + 0.055, -0.674, z],
        ],
        0.006,
        cuff,
      );
    }
  }
  if (street) {
    const torso = slot(actor.torso, "torso"),
      hat = slot(actor.head, "headwear");
    add(
      torso,
      "sculpted-hoodie-body",
      garmentGeometry(
        [
          [0, 1.355, 0, 0.105, 0.095],
          [0, 1.31, 0.005, 0.205, 0.13],
          [0, 1.23, 0, 0.218, 0.145],
          [0, 1.08, 0, 0.225, 0.163],
          [0, 0.95, 0, 0.218, 0.16],
          [0, 0.89, 0, 0.19, 0.137],
        ],
        22,
        24,
      ),
      cloth,
    );
    add(
      torso,
      "hoodie-ribbed-hem",
      garmentGeometry(
        [
          [0, 0.925, 0, 0.208, 0.153],
          [0, 0.877, 0, 0.195, 0.14],
          [0, 0.852, 0, 0.187, 0.133],
        ],
        5,
        24,
      ),
      cuff,
    );
    // Folded hood wraps the back of the neck with a visible open rim.
    ellipsoid(torso, "folded-hood", 0, 1.335, 0.09, 0.195, 0.095, 0.14, cuff);
    tube(
      torso,
      "hood-rim",
      [
        [-0.165, 1.3, -0.04],
        [-0.145, 1.375, 0.09],
        [0, 1.405, 0.175],
        [0.145, 1.375, 0.09],
        [0.165, 1.3, -0.04],
      ],
      0.022,
      cloth,
    );
    // A soft pocket conforms to the front belly and has stitched diagonal hand openings.
    const pocket = panel(
      torso,
      "soft-kangaroo-pocket",
      0,
      1.015,
      -0.161,
      0.29,
      0.14,
      0.035,
      cloth,
      0.034,
    );
    const pocketVertices = pocket.geometry.getAttribute("position");
    for (let i = 0; i < pocketVertices.count; i++) {
      const x = pocketVertices.getX(i);
      pocketVertices.setZ(i, pocketVertices.getZ(i) + x * x * 0.8);
    }
    pocket.geometry.computeVertexNormals();
    for (const s of [-1, 1]) {
      tube(
        torso,
        "pocket-opening",
        [
          [s * 0.14, 1.045, -0.176],
          [s * 0.11, 1.01, -0.188],
          [s * 0.105, 0.98, -0.177],
        ],
        0.005,
        cuff,
      );
      tube(
        torso,
        "hanging-drawcord",
        [
          [s * 0.073, 1.32, -0.123],
          [s * 0.082, 1.25, -0.153],
          [s * 0.077, 1.18, -0.166],
        ],
        0.006,
        ivory,
      );
      ellipsoid(
        torso,
        "cord-tip",
        s * 0.077,
        1.175,
        -0.166,
        0.009,
        0.018,
        0.009,
        cuff,
      );
    }
    tube(
      torso,
      "gold-chain",
      [
        [-0.095, 1.34, -0.113],
        [-0.078, 1.275, -0.159],
        [0, 1.245, -0.172],
        [0.078, 1.275, -0.159],
        [0.095, 1.34, -0.113],
      ],
      0.009,
      gold,
    );
    add(
      hat,
      "smooth-baseball-crown",
      new THREE.SphereGeometry(0.302, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2),
      cloth,
      0,
      1.67,
      0,
    );
    ellipsoid(
      hat,
      "curved-cap-brim",
      0,
      1.675,
      -0.235,
      0.252,
      0.024,
      0.19,
      cloth,
    );
    ellipsoid(hat, "cap-button", 0, 1.976, 0, 0.018, 0.012, 0.018, cuff);
    for (const angle of [-0.8, 0, 0.8]) {
      const pts = [];
      for (let n = 0; n <= 8; n++) {
        const t = 0.12 + (n / 8) * 1.38;
        pts.push([
          Math.sin(angle) * Math.sin(t) * 0.304,
          1.67 + Math.cos(t) * 0.304,
          -Math.cos(angle) * Math.sin(t) * 0.304,
        ]);
      }
      tube(hat, "cap-panel-seam", pts, 0.0025, cuff);
    }
  }
  for (const groups of Object.values(slots))
    for (const g of groups) {
      g.userData.parts = g.children.map((c) => c.name);
      const byMaterial = new Map<THREE.Material, THREE.BufferGeometry[]>();
      for (const child of [...g.children])
        if (child instanceof THREE.Mesh) {
          child.updateMatrix();
          const transformed = child.geometry.clone().applyMatrix4(child.matrix);
          const flat = transformed.index
            ? transformed.toNonIndexed()
            : transformed;
          if (flat !== transformed) transformed.dispose();
          const mat = child.material as THREE.Material;
          if (!byMaterial.has(mat)) byMaterial.set(mat, []);
          byMaterial.get(mat)!.push(flat);
          child.geometry.dispose();
          g.remove(child);
        }
      for (const [mat, geos] of byMaterial) {
        const merged = mergeGeometries(geos)!;
        geos.forEach((geo) => geo.dispose());
        add(g, g.name + "-surface", merged, mat);
      }
    }
  actor.root.name = street ? "survivor-street" : "survivor-base";
  actor.root.userData.outfit = street ? "street" : "base";
  return { ...actor, slots };
}
