import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
const root = "art/buildings/block-mart";
async function load(name: string) {
  const b = await readFile(`${root}/${name}.glb`);
  const doc = JSON.parse(b.toString("utf8", 20, 20 + b.readUInt32LE(12)));
  assert(doc.buffers.every((v: { uri?: string }) => !v.uri));
  return new GLTFLoader().parseAsync(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
    "",
  );
}
test("Block Mart is a furnished chamfered building with depth, unit-scale modules and a lighter distance model", async () => {
  const [full, lod] = await Promise.all([
    load("block-mart"),
    load("block-mart-lod"),
  ]);
  const sha = createHash("sha256")
    .update(await readFile(`${root}/references/block-mart.png`))
    .digest("hex");
  let provenance = false,
    triangles = 0,
    interior = 0,
    brick = 0;
  full.scene.traverse((o) => {
    provenance ||= o.userData.referenceSha256 === sha;
    const scale = o.getWorldScale(new THREE.Vector3());
    assert(
      scale.distanceTo(new THREE.Vector3(1, 1, 1)) < 1e-5,
      "modules never stretch",
    );
    if (o instanceof THREE.Mesh) {
      triangles +=
        (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
      interior += Number(o.userData.part === "interior");
      brick += Number(o.userData.part === "brick-detail");
    }
  });
  assert(provenance);
  assert(interior > 5 && brick >= 2);
  assert(triangles > 15000 && triangles < 50000);
  let lowTriangles = 0;
  lod.scene.traverse((o) => {
    if (o instanceof THREE.Mesh)
      lowTriangles +=
        (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
  });
  assert(lowTriangles < triangles * 0.8);
  const plan = JSON.parse(await readFile(`${root}/layout.json`, "utf8"));
  assert.equal(plan.floor.length, 5);
  assert.equal(plan.wallThickness, 0.28);
  assert.equal(plan.doors.length, 3);
  assert(plan.fixtures.length >= 8);
  for (const f of plan.fixtures) {
    const { min, max } = f.bounds;
    assert(
      min[0] > -4.9 && max[0] < 4.9 && min[2] > -4.9 && max[2] < 4.9,
      `${f.kind} remains inside walls`,
    );
    assert(max[0] + max[2] < 7.8, `${f.kind} clears corner entrance`);
  }
});
test("each real door opening is clear when its own exported animation opens the leaf", async () => {
  const plan = JSON.parse(await readFile(`${root}/layout.json`, "utf8"));
  for (const d of plan.doors) {
    const gltf = await load("block-mart"),
      hinge = gltf.scene.getObjectByName(d.hingeName)!;
    assert(hinge, d.hingeName);
    const out = new THREE.Vector3(d.tangent[1], 0, -d.tangent[0]),
      center = new THREE.Vector3(d.center[0], 1.55, d.center[1]);
    const ray = new THREE.Raycaster(
      center.clone().addScaledVector(out, 2),
      out.clone().negate(),
      0,
      3.0,
    );
    gltf.scene.updateMatrixWorld(true);
    const closed = ray.intersectObject(gltf.scene, true);
    assert(
      closed.some((h) => h.object.userData.part === "door"),
      d.id + " closed leaf",
    );
    const other = plan.doors
      .filter((a: { id: string }) => a.id !== d.id)
      .map(
        (a: { hingeName: string }) => gltf.scene.getObjectByName(a.hingeName)!,
      );
    const old = other.map((o: THREE.Object3D) => o.quaternion.clone());
    const clip = gltf.animations.find((a) => a.name === d.id + "-door-open")!;
    assert(clip);
    const mixer = new THREE.AnimationMixer(gltf.scene),
      action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    mixer.update(clip.duration + 0.01);
    gltf.scene.updateMatrixWorld(true);
    assert.equal(
      ray.intersectObject(gltf.scene, true).length,
      0,
      d.id + " open walk/shot passage",
    );
    other.forEach((o: THREE.Object3D, i: number) =>
      assert(o.quaternion.angleTo(old[i]) < 1e-6, "independent door animation"),
    );
    assert(gltf.animations.find((a) => a.name === d.id + "-door-close"));
  }
});
test("fourteen reusable GLB components include recessed transparent glazing instead of painted windows", async () => {
  const files = (await readdir(`${root}/parts`)).filter((f) =>
    f.endsWith(".glb"),
  );
  assert.equal(files.length, 14);
  const gltf = await load("parts/display-window");
  gltf.scene.updateMatrixWorld(true);
  let glass: THREE.Mesh | undefined;
  gltf.scene.traverse((o) => {
    if (o instanceof THREE.Mesh && o.userData.part === "glass") glass = o;
  });
  assert(glass);
  const bounds = new THREE.Box3().setFromObject(glass);
  assert(bounds.min.z > 0.08, "glass is set behind outer masonry face");
  const mat = glass.material as THREE.MeshStandardMaterial;
  assert(mat.transparent && mat.opacity < 0.5);
  const report = JSON.parse(
    await readFile(`${root}/model-report.json`, "utf8"),
  );
  assert.equal(Object.keys(report.parts).length, 14);
  assert.equal(report.gameIntegrated, true);
  assert(report.full.bytes < 3000000);
});

test("the editable Blender library keeps all fourteen prototypes separate from the assembled building", async () => {
  const check = JSON.parse(
    await readFile(`${root}/source-library-check.json`, "utf8"),
  );
  assert.equal(Object.keys(check).length, 14);
  for (const [name, size] of Object.entries(check)) {
    const g = await load(`parts/${name}`),
      actual = new THREE.Box3()
        .setFromObject(g.scene)
        .getSize(new THREE.Vector3())
        .toArray();
    (size as number[]).forEach((v, i) =>
      assert(
        Math.abs(v - actual[i]) < 0.0001,
        name + " source prototype matches exported part",
      ),
    );
  }
  assert((await readFile(`${root}/block-mart.blend`)).length > 200000);
});
