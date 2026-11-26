import * as THREE from "three";
import { STREET_PLAN, type StreetSegment } from "./city-streets-layout";
import { CITY_FRONTAGES } from "./building-frontage";
import { segmentDistance } from "./world";

function pavementTexture(asphalt: boolean) {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = asphalt ? "#596369" : "#c4c2b2";
  ctx.fillRect(0, 0, 128, 128);
  let seed = asphalt ? 19 : 71;
  for (let i = 0; i < 2600; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const x = (seed >>> 16) % 128;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const y = (seed >>> 16) % 128;
    ctx.fillStyle = i % 2 ? "rgba(255,255,255,.018)" : "rgba(20,30,35,.025)";
    ctx.fillRect(x, y, i % 4 === 0 ? 2 : 1, 1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 2;
  return texture;
}
export function createCityStreets() {
  const root = new THREE.Group(),
    proxy = new THREE.Group();
  root.name = "polished-city-streets";
  const box = new THREE.BoxGeometry(1, 1, 1),
    cylinder = new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
    sphere = new THREE.SphereGeometry(1, 10, 8);
  const materials = new Map<number, THREE.MeshStandardMaterial>();
  function material(color: number) {
    if (!materials.has(color))
      materials.set(
        color,
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.48,
          metalness: color === 0x384950 ? 0.3 : 0.05,
          ...(color === 0xffdf9b
            ? { emissive: color, emissiveIntensity: 0.7 }
            : {}),
        }),
      );
    return materials.get(color)!;
  }
  const groups = new Map<
    string,
    { geo: THREE.BufferGeometry; color: number; matrices: THREE.Matrix4[] }
  >();
  const transform = new THREE.Object3D();
  function part(
    kind: "box" | "cylinder" | "sphere",
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: number,
    yaw = 0,
  ) {
    const geo = kind === "box" ? box : kind === "cylinder" ? cylinder : sphere,
      key = kind + ":" + color;
    const group = groups.get(key) ?? { geo, color, matrices: [] };
    transform.position.set(x, y, z);
    transform.scale.set(w, h, d);
    transform.rotation.set(0, yaw, 0);
    transform.updateMatrix();
    group.matrices.push(transform.matrix.clone());
    groups.set(key, group);
  }
  function surface(asphalt: boolean) {
    const positions: number[] = [],
      uv: number[] = [],
      indices: number[] = [];
    for (const s of STREET_PLAN.segments) {
      const half = (asphalt ? s.lane : s.width) / 2,
        nx = -s.uz * half,
        nz = s.ux * half,
        y = asphalt ? 0.055 : 0.035,
        start = positions.length / 3;
      for (const [p, side] of [
        [s.a, -1],
        [s.b, -1],
        [s.b, 1],
        [s.a, 1],
      ] as const) {
        const x = p.x + nx * side,
          z = p.z + nz * side;
        positions.push(x, y, z);
        uv.push(x / 6, z / 6);
      }
      indices.push(start, start + 2, start + 1, start, start + 3, start + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: pavementTexture(asphalt),
      roughness: asphalt ? 0.85 : 0.7,
    });
    if (!mat.map) mat.color.setHex(asphalt ? 0x596369 : 0xc4c2b2);
    root.add(new THREE.Mesh(geo, mat));
  }
  surface(false);
  surface(true);
  const junction = (x: number, z: number, r = 8) =>
    STREET_PLAN.junctions.some((j) => Math.hypot(x - j.x, z - j.z) < r);
  const asphaltAt = (x: number, z: number, except: StreetSegment) =>
    STREET_PLAN.segments.some(
      (s) =>
        s !== except && segmentDistance({ x, z }, s.a, s.b) < s.lane / 2 + 0.12,
    );
  let curbCount = 0,
    crossings = 0,
    drains = 0;
  for (const s of STREET_PLAN.segments) {
    const yaw = -Math.atan2(s.uz, s.ux);
    for (let t = 1; t < s.length - 1; t += 1) {
      const x = s.a.x + s.ux * t,
        z = s.a.z + s.uz * t;
      for (const side of [-1, 1]) {
        const nx = -s.uz * side,
          nz = s.ux * side,
          cx = x + nx * (s.lane / 2 + 0.08),
          cz = z + nz * (s.lane / 2 + 0.08);
        if (asphaltAt(cx, cz, s)) continue;
        const ramp =
          junction(cx, cz, 7.5) ||
          CITY_FRONTAGES.some(
            (f) => Math.hypot(cx - f.street.x, cz - f.street.z) < 4.3,
          );
        if (!ramp) {
          part("box", cx, 0.068, cz, 0.98, 0.065, 0.16, 0xd1cdbb, yaw);
          curbCount++;
        }
        if (Math.round(t) % 3 === 0) {
          const middle = (s.width + s.lane) / 4;
          part(
            "box",
            x + nx * middle,
            0.045,
            z + nz * middle,
            0.015,
            0.007,
            (s.width - s.lane) / 2 - 0.12,
            0xa8a99d,
            yaw,
          );
        }
        if (!ramp && Math.round(t) % 25 === 12) {
          const gx = x + nx * (s.lane / 2 - 0.22),
            gz = z + nz * (s.lane / 2 - 0.22);
          part("box", gx, 0.067, gz, 0.74, 0.014, 0.34, 0x717a7b, yaw);
          for (let slot = -2; slot <= 2; slot++)
            part(
              "box",
              gx + s.ux * slot * 0.12,
              0.078,
              gz + s.uz * slot * 0.12,
              0.055,
              0.008,
              0.24,
              0x303e45,
              yaw,
            );
          drains++;
        }
      }
      if (
        Math.round(t) % 4 === 1 &&
        !junction(x, z, 8.4) &&
        t > 2 &&
        t < s.length - 3
      ) {
        for (const side of [-1, 1])
          part(
            "box",
            x - s.uz * side * 0.09,
            0.074,
            z + s.ux * side * 0.09,
            1.8,
            0.012,
            0.055,
            0xd9ba6d,
            yaw,
          );
      }
      if (Math.round(t) % 37 === 17 && !junction(x, z, 9)) {
        const cx = x - s.uz * 0.9,
          cz = z + s.ux * 0.9;
        part("cylinder", cx, 0.069, cz, 0.88, 0.018, 0.88, 0x788182);
        part("cylinder", cx, 0.081, cz, 0.72, 0.009, 0.72, 0x535f64);
        for (const d of [-0.2, 0, 0.2])
          part(
            "box",
            cx + s.ux * d,
            0.09,
            cz + s.uz * d,
            0.035,
            0.006,
            0.5,
            0x899294,
            yaw,
          );
      }
      if (Math.round(t) % 31 === 18 && !junction(x, z, 10))
        part(
          "box",
          x - s.uz * 1.2,
          0.063,
          z + s.ux * 1.2,
          2.4,
          0.006,
          0.85,
          0x626c70,
          yaw,
        );
    }
  }
  for (const j of STREET_PLAN.junctions)
    for (const arm of j.arms) {
      const road = STREET_PLAN.segments
        .filter(
          (s) =>
            segmentDistance(j, s.a, s.b) < 0.01 &&
            segmentDistance({ x: j.x + arm.x, z: j.z + arm.z }, s.a, s.b) <
              0.01,
        )
        .sort((a, b) => b.lane - a.lane)[0];
      if (!road) continue;
      const yaw = -Math.atan2(arm.z, arm.x),
        nx = -arm.z,
        nz = arm.x;
      for (
        let offset = -road.lane / 2 + 0.4;
        offset < road.lane / 2;
        offset += 0.8
      )
        part(
          "box",
          j.x + arm.x * 5.5 + nx * offset,
          0.085,
          j.z + arm.z * 5.5 + nz * offset,
          2.15,
          0.014,
          0.38,
          0xeee9d9,
          yaw,
        );
      part(
        "box",
        j.x + arm.x * 7.4 - (nx * road.lane) / 4,
        0.083,
        j.z + arm.z * 7.4 - (nz * road.lane) / 4,
        0.15,
        0.012,
        road.lane / 2 - 0.2,
        0xe1dccb,
        yaw,
      );
      crossings++;
      for (const side of [-1, 1]) {
        const x = j.x + arm.x * 5.5 + nx * side * (road.lane / 2 + 0.5),
          z = j.z + arm.z * 5.5 + nz * side * (road.lane / 2 + 0.5);
        if (asphaltAt(x, z, road)) continue;
        part("box", x, 0.051, z, 1.25, 0.02, 0.65, 0xd5bc7b, yaw);
        for (let a = -1; a <= 1; a++)
          for (const b of [-1, 1])
            part(
              "cylinder",
              x + arm.x * a * 0.3 + nx * b * 0.15,
              0.067,
              z + arm.z * a * 0.3 + nz * b * 0.15,
              0.065,
              0.015,
              0.065,
              0xe7cf93,
            );
      }
    }
  for (const p of STREET_PLAN.props) {
    if (p.kind === "lamp") {
      const nx = Math.sin(p.yaw),
        nz = Math.cos(p.yaw);
      part("cylinder", p.x, 0.08, p.z, 0.32, 0.16, 0.32, 0x384950);
      part("cylinder", p.x, 2.15, p.z, 0.13, 4.15, 0.13, 0x384950);
      part(
        "box",
        p.x + nx * 0.45,
        4.12,
        p.z + nz * 0.45,
        0.1,
        0.12,
        1.05,
        0x384950,
        p.yaw,
      );
      part(
        "box",
        p.x + nx * 0.9,
        4.13,
        p.z + nz * 0.9,
        0.36,
        0.2,
        0.62,
        0x384950,
        p.yaw,
      );
      part(
        "box",
        p.x + nx * 0.9,
        4.015,
        p.z + nz * 0.9,
        0.27,
        0.04,
        0.46,
        0xffdf9b,
        p.yaw,
      );
    } else {
      part("box", p.x - 0.17, 0.23, p.z, 0.55, 0.46, 0.54, 0xae8654);
      part("box", p.x - 0.17, 0.47, p.z, 0.58, 0.025, 0.57, 0xc7a775);
      part("box", p.x - 0.17, 0.488, p.z, 0.1, 0.014, 0.56, 0xd5bb8d);
      part("sphere", p.x + 0.25, 0.25, p.z + 0.05, 0.23, 0.26, 0.23, 0x394a4e);
      part(
        "cylinder",
        p.x + 0.25,
        0.51,
        p.z + 0.05,
        0.12,
        0.09,
        0.12,
        0x394a4e,
      );
    }
    const m = new THREE.Mesh(box, material(0x384950));
    m.position.set(p.x, p.y + p.height / 2, p.z);
    m.scale.set(p.width, p.height, p.depth);
    m.visible = false;
    proxy.add(m);
  }
  for (const g of groups.values()) {
    const mesh = new THREE.InstancedMesh(
      g.geo,
      material(g.color),
      g.matrices.length,
    );
    g.matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.computeBoundingSphere();
    root.add(mesh);
  }
  proxy.updateMatrixWorld(true);
  return {
    root,
    proxy,
    stats: {
      junctions: STREET_PLAN.junctions.length,
      crossings,
      curbs: curbCount,
      drains,
      lights: STREET_PLAN.props.filter((p) => p.kind === "lamp").length,
      clutter: STREET_PLAN.props.filter((p) => p.kind === "clutter").length,
      batches: groups.size + 2,
    },
  };
}
