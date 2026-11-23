import * as THREE from "three";
import {
  BUILDINGS,
  fixtures,
  buildingSlabs,
  buildingStairs,
  buildingStories,
  STORY_HEIGHT,
  frontOf,
  DOOR_WIDTH,
  OPENING_WIDTH,
  WALL,
  partitions,
  type Fixture,
} from "./building-layout";
const colors = new Map<number, THREE.MeshStandardMaterial>();
const mat = (color: number) => {
  if (!colors.has(color))
    colors.set(
      color,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.32,
        metalness: 0.08,
      }),
    );
  return colors.get(color)!;
};
const glass = new THREE.MeshStandardMaterial({
  color: 0x9ecbd2,
  transparent: true,
  opacity: 0.18,
  roughness: 0.16,
  metalness: 0.1,
});
const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xffeed0 });
export function createBuildingModel(
  index: number,
  geometry = new THREE.BoxGeometry(1, 1, 1),
  makeSign?: (text: string, w: number, h: number) => THREE.Mesh,
) {
  const b = BUILDINGS[index],
    front = frontOf(b),
    root = new THREE.Group();
  root.name = b.type + "-building";
  root.userData.building = b.name;
  const interior = new THREE.Group();
  interior.name = "furnished-interior";
  root.add(interior);
  function box(
    parent: THREE.Object3D,
    name: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: number | THREE.Material,
  ) {
    const m = new THREE.Mesh(
      geometry,
      typeof color === "number" ? mat(color) : color,
    );
    m.name = name;
    m.position.set(x, y, z);
    m.scale.set(w, h, d);
    parent.add(m);
    return m;
  }
  box(
    root,
    "foundation",
    0,
    -0.07,
    0,
    b.width + 0.6,
    0.14,
    b.depth + 0.6,
    0xa9aaa0,
  );
  box(
    root,
    "floor",
    0,
    0.007,
    0,
    b.width - 0.2,
    0.025,
    b.depth - 0.2,
    b.type === "home" ? 0xa39071 : b.type === "warehouse" ? 0x929e95 : 0xc6c4ad,
  );
  for (const x of [-b.width / 2, b.width / 2])
    box(
      root,
      "side-wall",
      x,
      b.height / 2,
      0,
      WALL,
      b.height,
      b.depth,
      b.color,
    );
  box(
    root,
    "back-wall",
    0,
    b.height / 2,
    (-front * b.depth) / 2,
    b.width,
    b.height,
    WALL,
    b.color,
  );
  // Cut real openings into the front facade; the windows show the furnished room.
  const openings = [
    {
      left: -OPENING_WIDTH / 2,
      right: OPENING_WIDTH / 2,
      bottom: 0,
      top: 2.85,
    },
    ...[-1, 1].map((side) => ({
      left: side * b.width * 0.3 - 1,
      right: side * b.width * 0.3 + 1,
      bottom: 1.2,
      top: 2.75,
    })),
  ];
  const cuts = [
      ...new Set([
        -b.width / 2,
        b.width / 2,
        ...openings.flatMap((o) => [o.left, o.right]),
      ]),
    ].sort((a, b) => a - b),
    heights = [0, 1.2, 2.75, 2.85, b.height];
  for (let y = 0; y < heights.length - 1; y++) {
    let start: number | undefined;
    for (let x = 0; x < cuts.length - 1; x++) {
      const middle = (cuts[x] + cuts[x + 1]) / 2,
        vertical = (heights[y] + heights[y + 1]) / 2,
        hole = openings.some(
          (o) =>
            middle > o.left &&
            middle < o.right &&
            vertical > o.bottom &&
            vertical < o.top,
        );
      if (!hole && start === undefined) start = cuts[x];
      if (start !== undefined && (hole || x === cuts.length - 2)) {
        const end = hole ? cuts[x] : cuts[x + 1];
        box(
          root,
          "front-wall",
          (start + end) / 2,
          vertical,
          (front * b.depth) / 2,
          end - start,
          heights[y + 1] - heights[y],
          WALL,
          b.color,
        );
        start = undefined;
      }
    }
  }
  for (const x of [-b.width * 0.3, b.width * 0.3]) {
    box(
      root,
      "window-glass",
      x,
      1.975,
      (front * b.depth) / 2,
      2,
      1.55,
      0.025,
      glass,
    );
    for (const side of [-1, 1])
      box(
        root,
        "window-trim",
        x + side * 1.04,
        1.975,
        (front * b.depth) / 2,
        0.08,
        1.7,
        0.29,
        0xe0dbc5,
      );
    for (const y of [1.15, 2.8])
      box(
        root,
        "window-trim",
        x,
        y,
        (front * b.depth) / 2,
        2.16,
        0.08,
        0.29,
        0xe0dbc5,
      );
    box(
      root,
      "window-mullion",
      x,
      1.975,
      (front * b.depth) / 2,
      0.05,
      1.55,
      0.05,
      0xe0dbc5,
    );
  }
  for (const x of [-0.87, 0.87])
    box(
      root,
      "door-frame",
      x,
      1.425,
      (front * b.depth) / 2,
      0.08,
      2.85,
      0.3,
      0x64776e,
    );
  box(
    root,
    "door-lintel",
    0,
    2.88,
    (front * b.depth) / 2,
    1.84,
    0.08,
    0.3,
    0x64776e,
  );
  const door = new THREE.Group();
  door.name = "door-hinge";
  door.position.set(-DOOR_WIDTH / 2, 0, (front * b.depth) / 2);
  root.add(door);
  const doorPanel = box(
    door,
    "door-panel",
    DOOR_WIDTH / 2,
    1.4,
    0,
    DOOR_WIDTH,
    2.8,
    0.14,
    b.type === "home" ? 0x87684e : 0x4d665e,
  );
  box(
    door,
    "door-inset",
    DOOR_WIDTH / 2,
    0.85,
    -front * 0.077,
    1.23,
    1.35,
    0.025,
    0x667d6d,
  );
  box(
    door,
    "door-handle",
    DOOR_WIDTH - 0.19,
    1.22,
    0,
    0.16,
    0.065,
    0.27,
    0xc7b57a,
  );
  door.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.userData.dynamicDoor = true;
      o.userData.doorIndex = index;
    }
  });
  // A ceiling closes the room at a human scale while preserving the established roof silhouette.
  box(
    root,
    "interior-ceiling",
    0,
    3.25,
    0,
    b.width - 0.25,
    0.1,
    b.depth - 0.25,
    0xd2d1bd,
  );
  if (b.type === "home") {
    const half = b.width / 2 + 0.25,
      rise = 1.35,
      slope = Math.atan2(rise, half);
    for (const side of [-1, 1]) {
      const panel = box(
        root,
        "pitched-roof",
        (side * half) / 2,
        b.height + rise / 2,
        0,
        Math.hypot(half, rise),
        0.18,
        b.depth + 0.55,
        0x795d4a,
      );
      panel.rotation.z = -side * slope;
    }
    const shape = new THREE.Shape();
    shape.moveTo(-b.width / 2, 0);
    shape.lineTo(b.width / 2, 0);
    shape.lineTo(0, rise);
    shape.closePath();
    for (const side of [-1, 1]) {
      const gable = new THREE.Mesh(
        new THREE.ShapeGeometry(shape),
        mat(b.color),
      );
      gable.name = "roof-gable";
      gable.position.set(0, b.height, (side * b.depth) / 2);
      if (side < 0) gable.rotation.y = Math.PI;
      root.add(gable);
    }
  } else {
    box(
      root,
      "roof",
      0,
      b.height + 0.08,
      0,
      b.width + 0.55,
      0.22,
      b.depth + 0.55,
      b.type === "home" ? 0x795d4a : 0x4a5c5c,
    );
    box(
      root,
      "roof-vent",
      b.width * 0.28,
      b.height + 0.42,
      -b.depth * 0.2,
      1.2,
      0.65,
      0.9,
      0x88928b,
    );
  }
  if (b.type === "shelter") {
    box(
      root,
      "shelter-entrance-canopy",
      0,
      3.04,
      front * (b.depth / 2 + 0.55),
      3,
      0.12,
      1.3,
      0x5c786b,
    );
    box(
      root,
      "shelter-cross",
      1.5,
      2.65,
      front * (b.depth / 2 + 0.13),
      0.44,
      0.12,
      0.035,
      0xb86859,
    );
    box(
      root,
      "shelter-cross",
      1.5,
      2.65,
      front * (b.depth / 2 + 0.14),
      0.12,
      0.44,
      0.035,
      0xb86859,
    );
  }
  if (b.type === "warehouse")
    box(
      root,
      "industrial-band",
      0,
      3.05,
      front * (b.depth / 2 + 0.12),
      b.width,
      0.18,
      0.04,
      0x647b70,
    );
  if (b.type === "home") {
    for (const p of partitions(index))
      box(
        root,
        "bedroom-partition",
        p.x,
        p.height / 2,
        p.z,
        p.width,
        p.height,
        p.depth,
        0xcdc5b0,
      );
    box(root, "bedroom-door-header", 0.9, 2.95, -0.2, 0.16, 0.3, 2, 0xcdc5b0);
  }
  if (b.type === "store") {
    box(
      root,
      "shop-awning",
      0,
      3.02,
      front * (b.depth / 2 + 0.65),
      b.width * 0.8,
      0.16,
      1.5,
      0xa76547,
    );
    for (let x = -b.width * 0.35; x <= b.width * 0.35; x += 0.6)
      box(
        root,
        "awning-stripe",
        x,
        3.11,
        front * (b.depth / 2 + 0.65),
        0.25,
        0.02,
        1.5,
        0xd9bb84,
      );
  }
  // Bold painted shapes and shallow facade relief: street character without
  // adding obstacles to the existing walkways or increasing texture downloads.
  const ink = 0x283344,
    cream = 0xffd994;
  const accent = [0xe04b64, 0x46b9ba, 0xeea636, 0x8069c7, 0xe5a538][index];
  const facadeZ = front * (b.depth / 2 + 0.14);
  box(root, "painted-plinth", 0, 0.35, facadeZ, b.width, 0.65, 0.045, ink);
  box(
    root,
    "cornice-outline",
    0,
    b.height - 0.22,
    0,
    b.width + 0.28,
    0.3,
    b.depth + 0.28,
    ink,
  );
  box(
    root,
    "cornice-gloss",
    0,
    b.height - 0.045,
    facadeZ,
    b.width + 0.3,
    0.055,
    0.12,
    cream,
  );
  for (const side of [-1, 1]) {
    box(
      root,
      "corner-pilaster",
      side * (b.width / 2 - 0.18),
      1.6,
      facadeZ,
      0.28,
      3.2,
      0.1,
      accent,
    );
    box(
      root,
      "paint-highlight",
      side * (b.width / 2 - 0.25),
      1.75,
      front * (b.depth / 2 + 0.2),
      0.045,
      2.6,
      0.025,
      cream,
    );
    // Simplified security grilles remain inside the existing solid window strip.
    for (const dx of [-0.65, 0, 0.65])
      box(
        root,
        "security-bar",
        side * b.width * 0.3 + dx,
        1.975,
        facadeZ,
        0.045,
        1.55,
        0.06,
        ink,
      );
    box(
      root,
      "security-crossbar",
      side * b.width * 0.3,
      1.8,
      facadeZ,
      2,
      0.045,
      0.06,
      ink,
    );
  }
  // Sparse oversized brick courses, deliberately graphic rather than noisy textures.
  for (const side of [-1, 1])
    for (let row = 0; row < 5; row++)
      for (let col = 0; col < 3; col++)
        box(
          root,
          "painted-brick",
          side * (b.width / 2 + 0.12),
          0.5 + row * 0.42,
          -b.depth * 0.28 + col * 1.05 + (row % 2) * 0.38,
          0.025,
          0.055,
          0.72,
          ink,
        );
  // Original abstract graffiti on the side walls; no real gang insignia.
  for (const side of [-1, 1]) {
    for (let stroke = 0; stroke < 5; stroke++) {
      const tag = box(
        root,
        "graffiti-stroke",
        side * (b.width / 2 + 0.14),
        1.65 + (stroke % 2) * 0.24,
        b.depth * 0.22 + (stroke - 2) * 0.32,
        0.035,
        0.95 - (stroke % 2) * 0.25,
        0.16,
        stroke % 2 ? cream : accent,
      );
      tag.rotation.x = (stroke % 2 ? -1 : 1) * 0.35;
    }
    box(
      root,
      "graffiti-underline",
      side * (b.width / 2 + 0.15),
      1.02,
      b.depth * 0.22,
      0.035,
      0.09,
      1.8,
      accent,
    );
  }
  if (b.type === "workshop" || b.type === "warehouse") {
    for (let n = 0; n < 5; n++)
      box(
        root,
        "shutter-rib",
        -b.width * 0.3,
        1.35 + n * 0.27,
        facadeZ + front * 0.05,
        1.9,
        0.045,
        0.05,
        ink,
      );
  }
  if (b.type === "home") {
    // Shallow boarded corner panes give the residence an abandoned-city silhouette.
    for (const y of [1.55, 2.35]) {
      const plank = box(
        root,
        "boarded-window",
        -b.width * 0.3,
        y,
        facadeZ + front * 0.08,
        1.9,
        0.16,
        0.08,
        0xae7848,
      );
      plank.rotation.z = y < 2 ? 0.12 : -0.12;
    }
  }
  if (makeSign) {
    for (const x of [-1.8, 1.8])
      box(
        root,
        "sign-support",
        x,
        b.height + 0.3,
        front * (b.depth / 2 + 0.13),
        0.06,
        0.6,
        0.06,
        ink,
      );
    const text = [
      "24 / 7 • FOOD & SUPPLIES",
      "COMMUNITY SAFEHOUSE",
      "REPAIRS • PARTS",
      "NO VACANCY",
      "FREIGHT • STORAGE",
    ][index];
    const badge = makeSign(text, Math.min(b.width - 1, 6), 0.38);
    badge.name = "street-business-sign";
    badge.position.set(0, b.height + 0.5, front * (b.depth / 2 + 0.18));
    if (front < 0) badge.rotation.y = Math.PI;
    root.add(badge);
  }
  // Flat painted floor bands distinguish the clinic, work area and warehouse aisles.
  if (b.type === "warehouse")
    for (const x of [-2.8, 2.8])
      box(
        root,
        "floor-safety-line",
        x,
        0.024,
        0,
        0.06,
        0.008,
        b.depth - 1,
        0xc8b365,
      );
  else if (b.type === "home")
    box(root, "living-room-rug", -1.25, 0.024, -1, 2.1, 0.008, 2.9, 0x768b7c);
  if (buildingStories(b) > 1) {
    for (const p of partitions(index))
      box(
        interior,
        "room partition",
        p.x,
        (p.y ?? 0) + p.height / 2,
        p.z,
        p.width,
        p.height,
        p.depth,
        0xd3cdbb,
      );
    for (const slab of buildingSlabs(index))
      box(
        interior,
        "upper floor",
        slab.x,
        slab.y - 0.09,
        slab.z,
        slab.width,
        0.18,
        slab.depth,
        0x9b9278,
      );
    for (const stair of buildingStairs(index))
      for (let step = 0; step < 16; step++) {
        const height = ((step + 1) / 16) * STORY_HEIGHT;
        box(
          interior,
          "stair",
          stair.x,
          stair.y + height - 0.1,
          stair.startZ - (front * (step + 0.5) * stair.run) / 16,
          stair.width,
          0.2,
          stair.run / 16,
          0x9b9278,
        );
      }
  }
  for (const f of fixtures(index)) furnish(f);
  for (const z of [-b.depth * 0.23, b.depth * 0.23]) {
    box(root, "ceiling-fixture", 0, 3.17, z, 1.4, 0.08, 0.36, 0x596a60);
    box(root, "ceiling-light", 0, 3.12, z, 1.22, 0.025, 0.27, lightMaterial);
  }
  if (makeSign) {
    const sign = makeSign(b.name, Math.min(b.width - 1, 7), 0.7);
    sign.name = "building-sign";
    sign.position.set(0, 3.65, front * (b.depth / 2 + 0.13));
    if (front < 0) sign.rotation.y = Math.PI;
    root.add(sign);
  }
  function furnish(f: Fixture) {
    const g = new THREE.Group();
    g.name = f.kind;
    g.position.set(f.x, f.y ?? 0, f.z);
    interior.add(g);
    const w = f.width,
      d = f.depth;
    const add = (
      name: string,
      x: number,
      y: number,
      z: number,
      width: number,
      height: number,
      depth: number,
      color: number | THREE.Material,
    ) => box(g, name, x, y, z, width, height, depth, color);
    function legs(top: number) {
      for (const x of [-w * 0.4, w * 0.4])
        for (const z of [-d * 0.35, d * 0.35])
          add("table-leg", x, top / 2, z, 0.09, top, 0.09, 0x526459);
    }
    if (f.kind === "shelf" || f.kind === "rack") {
      const top = f.kind === "rack" ? 2.65 : 1.95;
      for (const x of [-w * 0.43, w * 0.43])
        for (const z of [-d * 0.46, d * 0.46])
          add("rack-post", x, top / 2, z, 0.08, top, 0.08, 0x53685e);
      for (let y = 0.2; y < top; y += f.kind === "rack" ? 0.75 : 0.56) {
        add("shelf-board", 0, y, 0, w, 0.08, d, 0x8f987e);
        for (let i = 0; i < Math.floor(d / 0.65); i++) {
          const z = -d / 2 + 0.36 + i * 0.65;
          if (f.kind === "rack") {
            add(
              "boxed-stock",
              0,
              y + 0.28,
              z,
              w * 0.7,
              0.48,
              0.5,
              i % 2 ? 0xa8936c : 0x9a7956,
            );
            add(
              "box-band",
              0,
              y + 0.28,
              z + 0.253,
              w * 0.7,
              0.06,
              0.012,
              0xd2c6a2,
            );
          } else {
            for (const x of [-w * 0.23, w * 0.23]) {
              add(
                "groceries",
                x,
                y + 0.18,
                z,
                0.29,
                0.28,
                0.32,
                [0xe65b6b, 0x41a9c5, 0xf0bd4b][i % 3],
              );
              add(
                "product-label",
                x,
                y + 0.19,
                z + 0.165,
                0.2,
                0.1,
                0.01,
                0xe7dfbc,
              );
            }
          }
        }
      }
      return;
    }
    if (f.kind === "bed") {
      add("bed-frame", 0, 0.27, 0, w, 0.4, d, 0x64796b);
      add("mattress", 0, 0.52, 0, w - 0.1, 0.2, d - 0.08, 0xe5ddc5);
      add(
        "blanket",
        0,
        0.64,
        0.3,
        w - 0.14,
        0.06,
        d * 0.65,
        b.type === "home" ? 0x7e8c9e : 0x889a7a,
      );
      add("pillow", 0, 0.67, -d * 0.33, w * 0.65, 0.13, 0.42, 0xf0e8d4);
      add("headboard", 0, 0.75, -d / 2, 0.95 * w, 0.8, 0.09, 0x66786b);
      return;
    }
    if (f.kind === "sofa") {
      add("sofa-base", 0, 0.35, 0, w, 0.5, d, 0x7961a8);
      add("sofa-back", -w * 0.4, 0.77, 0, 0.2, 0.85, d, 0x493c72);
      for (const z of [-d * 0.43, d * 0.43])
        add("sofa-arm", 0, 0.65, z, w, 0.5, 0.22, 0x493c72);
      for (const z of [-d * 0.23, d * 0.23])
        add("seat-cushion", 0.1, 0.64, z, w * 0.7, 0.12, d * 0.4, 0xa28bcb);
      return;
    }
    if (f.kind === "fridge" || f.kind === "cabinet") {
      const h = f.kind === "fridge" ? 2.3 : 1.9;
      add("cabinet-body", 0, h / 2, 0, w, h, d, 0x367e89);
      for (const side of [-1, 1]) {
        add(
          "cabinet-door",
          side * w * 0.245,
          h / 2,
          d / 2 + 0.025,
          w * 0.47,
          h - 0.12,
          0.05,
          0x76b9bf,
        );
        add(
          "cabinet-handle",
          side * w * 0.09,
          h * 0.5,
          d / 2 + 0.065,
          0.035,
          0.25,
          0.04,
          0x53685e,
        );
      }
      if (b.type === "shelter") {
        add("medical-cross", 0, 1.4, d / 2 + 0.07, 0.36, 0.09, 0.03, 0xaf6557);
        add("medical-cross", 0, 1.4, d / 2 + 0.075, 0.09, 0.36, 0.03, 0xaf6557);
      }
      return;
    }
    if (f.kind === "pallet") {
      for (const x of [-w * 0.35, 0, w * 0.35])
        add("pallet-runner", x, 0.08, 0, 0.12, 0.16, d, 0x8a7454);
      for (let z = -d * 0.4; z <= d * 0.4; z += 0.18)
        add("pallet-plank", 0, 0.18, z, w, 0.06, 0.13, 0xb49a6a);
      add("cargo-box", 0, 0.64, 0, w * 0.85, 0.85, d * 0.82, 0xa58a60);
      add("cargo-band", 0, 0.64, d * 0.42, w * 0.85, 0.08, 0.025, 0xdbcfaa);
      return;
    }
    if (f.kind === "kitchen") {
      add("kitchen-base", 0, 0.5, 0, w, 1, d, 0x839485);
      add("countertop", 0, 1.04, 0, w + 0.08, 0.08, d + 0.06, 0xe0d8bd);
      add("sink", -w * 0.25, 1.09, 0, 0.6, 0.025, d * 0.7, 0x5f797b);
      add("faucet", -w * 0.25, 1.23, -d * 0.25, 0.04, 0.28, 0.04, 0xb5c4bc);
      for (const x of [w * 0.18, w * 0.37])
        for (const z of [-d * 0.16, d * 0.16])
          add("stove-burner", x, 1.09, z, 0.23, 0.02, 0.2, 0x425a56);
      for (let x = -w * 0.38; x < w * 0.4; x += w * 0.25)
        add(
          "cabinet-front",
          x,
          0.5,
          d / 2 + 0.02,
          w * 0.23,
          0.85,
          0.04,
          0xaab5a0,
        );
      return;
    }
    const height =
      f.kind === "bench" ? 0.5 : f.kind === "counter" ? 1.05 : 0.86;
    legs(height);
    add(
      "worktop",
      0,
      height,
      0,
      w,
      0.12,
      d,
      f.kind === "workbench" ? 0x9a8058 : 0xb9aa82,
    );
    if (f.kind === "counter") {
      add("checkout-front", 0, height * 0.5, 0, w, height, 0.7, 0x889a7d);
      add(
        "register-base",
        w * 0.25,
        height + 0.12,
        0,
        0.45,
        0.18,
        0.35,
        0x52665e,
      );
      add(
        "register-screen",
        w * 0.25,
        height + 0.4,
        -0.08,
        0.4,
        0.28,
        0.07,
        0x365a60,
      );
    }
    if (f.kind === "workbench") {
      add("tool-board", 0, 1.65, -d * 0.4, w * 0.9, 1.25, 0.07, 0x7c8f7c);
      for (let i = 0; i < 4; i++) {
        const x = -w * 0.3 + i * w * 0.2;
        add(
          "tool-handle",
          x,
          1.55,
          -d * 0.4 + 0.06,
          0.04,
          0.28,
          0.04,
          0xb4a073,
        );
        add("tool-head", x, 1.72, -d * 0.4 + 0.065, 0.16, 0.06, 0.06, 0x52646a);
      }
      add(
        "vise-base",
        w * 0.25,
        height + 0.12,
        0.12,
        0.32,
        0.16,
        0.3,
        0x63787a,
      );
      add("vise-jaw", w * 0.25, height + 0.25, 0.12, 0.4, 0.16, 0.12, 0x3f5657);
    } else if (f.kind === "table") {
      add("book", -0.15, height + 0.1, 0, 0.45, 0.06, 0.32, 0x797e9a);
      add("cup", w * 0.25, height + 0.15, 0.1, 0.14, 0.22, 0.14, 0xe5dcc0);
    }
  }
  interior.traverse((o) => {
    if (o instanceof THREE.Mesh) o.userData.interiorBuilding = index;
  });
  return { root, door, doorPanel };
}
