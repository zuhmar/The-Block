import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
const root = "art/building-kits/timber-yard";
const manifest = JSON.parse(readFileSync(root + "/manifest.json", "utf8"));
assert.equal(
  manifest.referenceSha256,
  createHash("sha256").update(readFileSync(manifest.reference)).digest("hex"),
);
async function load(name: string) {
  const b = readFileSync(root + "/" + name);
  return new GLTFLoader().parseAsync(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
    "",
  );
}
function bounds(o: THREE.Object3D) {
  o.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(o);
}
function ray(o: THREE.Object3D, x: number, y: number) {
  o.updateMatrixWorld(true);
  return new THREE.Raycaster(
    new THREE.Vector3(x, y, 4),
    new THREE.Vector3(0, 0, -1),
    0,
    8,
  ).intersectObject(o, true);
}
const models = new Map<string, Awaited<ReturnType<typeof load>>>();
const checks: Record<string, unknown>[] = [];
for (const [name, spec] of Object.entries(manifest.modules) as [
  string,
  {
    snaps: Record<string, number[]>;
    export: { bytes: number; triangles: number };
  },
][]) {
  const m = await load("parts/" + name + ".glb");
  models.set(name, m);
  m.scene.updateMatrixWorld(true);
  let provenance = false;
  m.scene.traverse((o) => {
    assert(
      o
        .getWorldScale(new THREE.Vector3())
        .distanceTo(new THREE.Vector3(1, 1, 1)) < 0.0001,
      "No stretched modules",
    );
    provenance ||= o.userData.referenceSha256 === manifest.referenceSha256;
  });
  assert(provenance);
  const box = bounds(m.scene),
    size = box.getSize(new THREE.Vector3());
  assert(size.toArray().every((v) => Number.isFinite(v) && v > 0));
  for (const [id, p] of Object.entries(spec.snaps)) {
    let marker: THREE.Object3D | undefined;
    m.scene.traverse((o) => {
      if (o.userData.snap === id) marker ??= o;
    });
    assert(marker, `${name}: ${id} snap`);
    assert(
      marker
        .getWorldPosition(new THREE.Vector3())
        .distanceTo(new THREE.Vector3(p[0], p[1], p[2])) < 0.0001,
    );
  }
  assert(spec.export.bytes < 1000000, "Standalone module budget");
  checks.push({
    name,
    triangles: spec.export.triangles,
    bytes: spec.export.bytes,
    bounds: { min: box.min.toArray(), max: box.max.toArray() },
    unitScale: true,
  });
}
assert.equal(models.size, 11);
for (const width of [1, 2, 4]) {
  const m = models.get(`fence-panel-${width}m`)!;
  assert(
    Math.abs(bounds(m.scene).getSize(new THREE.Vector3()).x - width) < 0.0001,
  );
  let holes = 0,
    hits = 0;
  for (let i = 0; i < 39; i++) {
    if (
      ray(m.scene, -width / 2 + 0.06 + ((width - 0.12) * i) / 38, 1.37).length
    )
      hits++;
    else holes++;
  }
  assert(
    holes > 0 && hits > 0,
    "Fence is real open wire geometry, not an opaque wall",
  );
}
for (const [name, nodeName, clipName] of [
  ["sliding-gate-8m", "sliding-gate-leaf", "sliding-gate"],
  ["pedestrian-gate-2m", "pedestrian-gate-hinge", "pedestrian-gate"],
]) {
  const m = models.get(name)!,
    node = m.scene.getObjectByName(nodeName);
  assert(node);
  const initial = bounds(node).getSize(new THREE.Vector3());
  assert(ray(m.scene, 0.12, 0.44).length > 0, "Gate starts closed");
  const mixer = new THREE.AnimationMixer(m.scene),
    open = m.animations.find((a) => a.name === clipName + "-open"),
    close = m.animations.find((a) => a.name === clipName + "-close");
  assert(open && close);
  assert(Math.abs(open.duration - 1) < 0.001);
  const action = mixer.clipAction(open);
  action.setLoop(THREE.LoopOnce, 1);
  action.clampWhenFinished = true;
  action.play();
  mixer.setTime(open.duration);
  m.scene.updateMatrixWorld(true);
  assert.equal(
    ray(m.scene, 0.12, 0.44).length,
    0,
    "Animated gate clears its opening",
  );
  if (name.startsWith("sliding")) {
    assert(Math.abs(node.position.x + 8.25) < 0.001);
    assert(bounds(node).max.x < -4.25);
    assert(
      Math.abs(bounds(node).getSize(new THREE.Vector3()).x - initial.x) < 0.001,
    );
  } else {
    const s = bounds(node).getSize(new THREE.Vector3());
    assert(s.x < 0.3 && s.z > 1.5);
  }
  mixer.stopAllAction();
  const shut = mixer.clipAction(close);
  shut.setLoop(THREE.LoopOnce, 1);
  shut.clampWhenFinished = true;
  shut.play();
  mixer.setTime(close.duration);
  assert(ray(m.scene, 0.12, 0.44).length > 0, "Gate closes again");
}
const truck = models.get("truck-entrance-8m")!;
for (const x of [-3, 0, 3])
  for (const y of [1.8, 3.8])
    assert.equal(
      ray(truck.scene, x, y).length,
      0,
      "Truck entrance is passable",
    );
const shed = models.get("saw-shed")!;
for (const x of [-2, 0, 2]) {
  const hit = ray(shed.scene, x, 1.8)[0];
  assert(
    hit && hit.point.z < -2.7,
    "Shed has an open front and real rear wall",
  );
}
const roof = shed.scene.getObjectByName("detachable-shed-roof");
assert(
  roof && roof.children.length > 0,
  "Roof remains a separate removable group",
);
let top = new THREE.Raycaster(
  new THREE.Vector3(0, 1.8, 0),
  new THREE.Vector3(0, 1, 0),
).intersectObject(shed.scene, true)[0];
assert(top && top.point.y > 4, "Pitched roof covers shed interior");
roof.removeFromParent();
top = new THREE.Raycaster(
  new THREE.Vector3(0, 1.8, 0),
  new THREE.Vector3(0, 1, 0),
).intersectObject(shed.scene, true)[0];
assert.equal(top, undefined, "Removing roof opens the shed for editing");
const assembly = await load("timber-yard-architecture.glb");
const assembled = bounds(assembly.scene);
assert(
  assembled.min.x > -18 &&
    assembled.max.x < 18 &&
    assembled.min.z > -18 &&
    assembled.max.z < 18,
  "No library prototypes leaked into the yard export",
);
assembly.scene.traverse((o) =>
  assert(
    o
      .getWorldScale(new THREE.Vector3())
      .distanceTo(new THREE.Vector3(1, 1, 1)) < 0.0001,
  ),
);
assert.equal(
  manifest.placements.filter(
    (p: { module: string }) =>
      p.module.includes("gate") || p.module === "truck-entrance-8m",
  ).length,
  3,
);
const result = {
  moduleCount: models.size,
  referenceVerified: true,
  unitScale: true,
  fenceGapsVerified: true,
  gateOpenCloseVerified: true,
  openShedVerified: true,
  removableRoofVerified: true,
  threeEntrances: true,
  modules: checks,
};
writeFileSync(root + "/checks.json", JSON.stringify(result, null, 2) + "\n");
console.log(
  JSON.stringify({
    modules: models.size,
    animations: "open/close verified",
    shed: "walk-in, roof removable",
    snaps: "verified",
    scale: "unit",
  }),
);
