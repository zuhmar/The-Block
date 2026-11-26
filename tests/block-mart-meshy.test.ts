import "./helpers/model-textures";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  martPlan,
  martBlocked,
} from "../apps/client/src/fps/block-mart-layout";
import { createMartProxy } from "../apps/client/src/fps/block-mart-view";
const source = "art/buildings/block-mart/meshy-props",
  runtime = "apps/client/src/fps/models/block-mart/meshy";
async function load(name: string) {
  const b = await readFile(`${runtime}/${name}.glb`);
  return new GLTFLoader().parseAsync(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
    "",
  );
}
test("all nine original-art Meshy props retain proportions, floor pivots, unit transforms and mobile textures", async () => {
  const report = JSON.parse(
      await readFile(`${source}/prepared/model-report.json`, "utf8"),
    ),
    raw = JSON.parse(await readFile(`${source}/model-report.json`, "utf8"));
  assert.equal(Object.keys(report.meshyProps).length, 9);
  for (const [name, data] of Object.entries(report.meshyProps) as [
    string,
    { uniformScale: number; sourceSha256: string; textureSize: number },
  ][]) {
    const bytes = await readFile(`${source}/models/${name}.glb`);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      data.sourceSha256,
      "uses the corrected image-derived model",
    );
    const model = await load(`parts/${name}`);
    model.scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model.scene),
      size = bounds.getSize(new THREE.Vector3()).toArray(),
      original = raw.models.find((m: { name: string }) => m.name === name);
    assert(Math.abs(bounds.min.y) < 0.0001, `${name} sits on its base`);
    for (let axis = 0; axis < 3; axis++)
      assert(
        Math.abs(
          size[axis] - original.sourceBounds.size[axis] * data.uniformScale,
        ) < 0.0001,
        `${name} uniform scaling on axis ${axis}`,
      );
    model.scene.traverse((o) => {
      assert(
        o
          .getWorldScale(new THREE.Vector3())
          .distanceTo(new THREE.Vector3(1, 1, 1)) < 0.0001,
      );
      if (o instanceof THREE.Mesh) {
        const mat = o.material as THREE.MeshStandardMaterial;
        assert(mat.map);
        const image = mat.map.image as { width: number; height: number };
        assert.equal(image.width, data.textureSize);
        assert.equal(image.height, data.textureSize);
      }
    });
  }
});
test("the playable shop and its lighter model use Meshy props without duplicating old furnishings", async () => {
  const full = await load("block-mart"),
    low = await load("block-mart-lod"),
    materials = new Set<string>();
  let branded = false,
    fullTriangles = 0,
    lowTriangles = 0;
  full.scene.traverse((o) => {
    branded ||= o.userData.propSet === "meshy-original-art";
    if (o instanceof THREE.Mesh) {
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        materials.add(m.name);
      fullTriangles +=
        (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
    }
  });
  low.scene.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      lowTriangles +=
        (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
      assert(
        ![
          "meshy-retail-shelf",
          "meshy-checkout-counter",
          "meshy-refrigerator",
        ].includes((o.material as THREE.Material).name),
      );
    }
  });
  assert(branded);
  for (const name of [
    "retail-shelf",
    "checkout-counter",
    "refrigerator",
    "stock-boxes",
    "roof-ac",
    "roof-vent",
    "exterior-light",
    "security-camera",
    "rain-downpipe",
  ])
    assert(materials.has(`meshy-${name}`), name);
  assert(lowTriangles < fullTriangles * 0.4);
  assert((await readFile(`${runtime}/block-mart.glb`)).length < 5_000_000);
  assert((await readFile(`${runtime}/block-mart-lod.glb`)).length < 1_200_000);
  assert.equal(
    martPlan.fixtures.filter((f) => f.kind === "retail-shelf").length,
    4,
  );
  assert.equal(
    martPlan.fixtures.filter((f) => f.kind === "refrigerator").length,
    2,
  );
});
test("counter cover follows its opening and height; exterior boxes and pipes have collision", () => {
  const c = martPlan.fixtures.find((f) => f.kind === "checkout-counter")!;
  assert(c.collision.length > 1);
  assert(c.collision.some((b) => b.max[1] < c.bounds.max[1] - 0.2));
  let opening: { x: number; z: number } | undefined;
  for (let x = c.bounds.min[0] + 0.15; x < c.bounds.max[0] - 0.15; x += 0.05)
    for (let z = c.bounds.min[2] + 0.15; z < c.bounds.max[2] - 0.15; z += 0.05)
      if (!martBlocked(0, { x, z }, 0.01, true, 0)) {
        opening = { x, z };
        break;
      }
  assert(
    opening,
    "cashier void is not filled with a fictitious rectangular collider",
  );
  const proxy = createMartProxy(0);
  proxy.root.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(
    new THREE.Vector3(opening.x, 1.9, opening.z),
    new THREE.Vector3(0, -1, 0),
    0,
    1.88,
  );
  assert.equal(ray.intersectObject(proxy.root, true).length, 0);
  for (const e of martPlan.extras.filter((e) =>
    ["rain-downpipe", "stock-boxes"].includes(e.kind),
  )) {
    const { min, max } = e.bounds;
    assert(
      martBlocked(
        0,
        { x: (min[0] + max[0]) / 2, z: (min[2] + max[2]) / 2 },
        0.32,
        true,
        0,
      ),
    );
  }
});
