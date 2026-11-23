import * as THREE from "three";
export function primitiveModel(kind: string) {
  const root = new THREE.Group();
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const mat = (color: number) => {
    const key = String(color);
    if (!materials.has(key))
      materials.set(
        key,
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.55,
          metalness: 0.08,
        }),
      );
    return materials.get(key)!;
  };
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: number,
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    mesh.position.set(x, y, z);
    root.add(mesh);
    return mesh;
  };
  const cyl = (
    x: number,
    y: number,
    z: number,
    r: number,
    h: number,
    color: number,
    sides = 16,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, h, sides),
      mat(color),
    );
    mesh.position.set(x, y, z);
    root.add(mesh);
    return mesh;
  };
  if (["road", "roadplain", "water", "grass", "dirt", "box"].includes(kind)) {
    const color =
      kind === "water"
        ? 0x388aa7
        : kind === "grass"
          ? 0x819a5b
          : kind === "dirt"
            ? 0x9a7a4a
            : kind === "road" || kind === "roadplain"
              ? 0x394146
              : 0xa7a298;
    box(0, 0.5, 0, 1, 1, 1, color);
    if (kind === "road") {
      for (const z of [-0.35, 0, 0.35])
        box(0, 1.04, z, 0.018, 0.02, 0.14, 0xe2c781);
      for (const x of [-0.46, 0.46]) box(x, 1.04, 0, 0.012, 0.02, 1, 0xcbd0c6);
    }
  } else if (kind === "plateau") {
    cyl(0, 0.5, 0, 0.5, 1, 0x83796c, 10);
    cyl(0, 1.01, 0, 0.51, 0.04, 0x6f914e, 10);
  } else if (kind === "cylinder") {
    cyl(0, 0.5, 0, 0.5, 1, 0x999a8f);
  } else if (kind === "barrel") {
    cyl(0, 0.55, 0, 0.33, 1.1, 0x536f72);
    for (const y of [0.15, 0.95]) cyl(0, y, 0, 0.345, 0.06, 0x343b40);
  } else if (kind === "container") {
    box(0, 0.5, 0, 1, 1, 1, 0x8e5d3d);
    for (let i = 0; i < 12; i++)
      for (const x of [-0.505, 0.505])
        box(x, 0.5, -0.46 + i * 0.084, 0.012, 0.88, 0.016, 0x664735);
    for (const x of [-0.24, 0.24])
      box(x, 0.5, 0.507, 0.01, 0.82, 0.01, 0xb0a28a);
  } else if (kind === "fence") {
    for (const x of [-0.48, 0.48]) cyl(x, 0.5, 0, 0.025, 1, 0x606b6b);
    for (const y of [0.15, 0.9]) box(0, y, 0, 1, 0.025, 0.025, 0x697576);
    for (let i = 0; i < 8; i++)
      box(-0.45 + i * 0.13, 0.52, 0, 0.008, 0.72, 0.008, 0x82908c);
  } else if (kind === "dock" || kind === "bridge") {
    box(0, 0.05, 0, 1, 0.15, 1, kind === "dock" ? 0x8b7050 : 0x6e7677);
    for (let i = 0; i < 10; i++)
      box(0, 0.132, -0.45 + i * 0.1, 0.96, 0.008, 0.01, 0x4a4f4b);
    if (kind === "bridge")
      for (const x of [-0.49, 0.49]) box(x, 0.6, 0, 0.025, 0.06, 1, 0xc3c7b6);
    else
      for (const x of [-0.4, 0.4])
        for (const z of [-0.4, 0.4]) cyl(x, -0.8, z, 0.04, 1.7, 0x5b5147);
  } else if (kind === "stairs") {
    for (let i = 0; i < 8; i++)
      box(
        0,
        (i + 1) / 16,
        -0.4375 + i * 0.125,
        1,
        (i + 1) / 8,
        0.125,
        0x90948d,
      );
  } else if (kind === "lamp") {
    cyl(0, 2.2, 0, 0.06, 4.4, 0x3d4547);
    box(0.45, 4.4, 0, 0.95, 0.08, 0.08, 0x3d4547);
    const head = box(0.9, 4.28, 0, 0.5, 0.12, 0.25, 0xf0d58e);
    (head.material as THREE.MeshStandardMaterial).emissive.setHex(0xe9b65d);
    (head.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4;
  } else if (kind === "table" || kind === "bench" || kind === "chair") {
    const w = kind === "chair" ? 0.5 : kind === "bench" ? 1.8 : 1.4,
      d = kind === "table" ? 0.8 : 0.48,
      h = kind === "table" ? 0.85 : 0.5;
    box(0, h, 0, w, 0.08, d, 0xa47b48);
    for (const x of [-w * 0.38, w * 0.38])
      for (const z of [-d * 0.35, d * 0.35])
        box(x, h / 2, z, 0.06, h, 0.06, 0x3d4947);
    if (kind !== "table") box(0, h + 0.3, -d * 0.42, w, 0.5, 0.06, 0x936b43);
  } else if (kind === "tower") {
    for (const x of [-1, 1])
      for (const z of [-1, 1]) box(x, 2.4, z, 0.15, 4.8, 0.15, 0x6b6757);
    box(0, 4.7, 0, 2.5, 0.16, 2.5, 0x6f7565);
    for (const x of [-1.2, 1.2]) box(x, 5.2, 0, 0.08, 0.8, 2.4, 0x515f58);
    box(0, 5.8, 0, 2.7, 0.16, 2.7, 0x536357);
  } else {
    cyl(0, 0.05, 0, 0.55, 0.1, 0xe5ac4c);
    cyl(0, 1, 0, 0.035, 2, 0xf4ca73);
    box(0.35, 1.65, 0, 0.65, 0.4, 0.05, 0xe69b45);
  }
  root.updateMatrixWorld(true);
  return root;
}
