import "./helpers/model-textures";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  fitRoadside,
  roadsideInstances,
} from "../apps/client/src/fps/roadside-models";
import { configureCompactCity } from "../apps/client/src/fps/compact-city";
import { STREET_PLAN } from "../apps/client/src/fps/city-streets-layout";
import { LOOT, blocked, segmentDistance } from "../apps/client/src/fps/world";
import { CITY_FRONTAGES } from "../apps/client/src/fps/building-frontage";
const manifest = JSON.parse(
  readFileSync("art/roadside/meshy-v1/manifest.json", "utf8"),
);
const load = async (name: string) => {
  const bytes = readFileSync(`apps/client/src/fps/models/roadside/${name}.glb`);
  return (
    await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      "",
    )
  ).scene;
};
test("all twelve shipped Meshy models match approved sources and fit without stretching", async () => {
  for (const p of manifest.props) {
    const runtime = readFileSync(
        `apps/client/src/fps/models/roadside/${p.name}.glb`,
      ),
      source = readFileSync(`art/roadside/meshy-v1/models/${p.name}.glb`);
    const hash = (b: Buffer) => createHash("sha256").update(b).digest("hex");
    assert.equal(hash(runtime), hash(source));
    const model = fitRoadside(await load(p.name), 0.8, 0.7, 0.6),
      bounds = new THREE.Box3().setFromObject(model),
      size = bounds.getSize(new THREE.Vector3());
    assert.equal(model.scale.x, model.scale.y);
    assert.equal(model.scale.y, model.scale.z);
    assert.ok(
      size.x <= 0.80001 && size.y <= 0.70001 && size.z <= 0.60001,
      p.name,
    );
    assert.ok(Math.abs(bounds.min.y) < 0.00001, p.name + " floor pivot");
    assert.ok(
      Math.abs(bounds.min.x + bounds.max.x) < 0.00001 &&
        Math.abs(bounds.min.z + bounds.max.z) < 0.00001,
      p.name + " centered",
    );
  }
});
test("compact dressing preserves container identities and adds searchable dumpsters outside access paths", () => {
  const names = LOOT.map((l) => l.name),
    undo = configureCompactCity();
  try {
    assert.deepEqual(
      LOOT.slice(0, names.length).map((l) => l.name),
      names,
    );
    for (const kind of ["bench", "hydrant", "dumpster"]) {
      const props = STREET_PLAN.props.filter((p) => p.kind === kind);
      assert.ok(props.length > 0 && props.length <= 8, kind);
      for (const p of props) {
        assert.ok(blocked(p, []));
        assert.ok(
          CITY_FRONTAGES.every(
            (f) => segmentDistance(p, f.door, f.street) > 1.5,
          ),
        );
      }
    }
    const dumpsters = LOOT.filter((l) => l.model === "dumpster");
    assert.equal(
      dumpsters.length,
      STREET_PLAN.props.filter((p) => p.kind === "dumpster").length,
    );
    assert.ok(dumpsters.every((l) => l.kind === "trash" && l.reward === 20));
  } finally {
    undo();
  }
  assert.deepEqual(
    LOOT.map((l) => l.name),
    names,
  );
});
test("repeated street models share GPU batches and preserve each world transform", async () => {
  const template = await load("bench"),
    root = new THREE.Group(),
    models = [];
  for (let i = 0; i < 24; i++) {
    const m = template.clone(true);
    m.position.set(i * 3, 0.035, 2);
    models.push(m);
  }
  assert.equal(roadsideInstances(root, models), 1);
  const batch = root.children[0] as THREE.InstancedMesh;
  assert.equal(batch.count, 24);
  const matrix = new THREE.Matrix4();
  batch.getMatrixAt(23, matrix);
  assert.ok(Math.abs(matrix.elements[12] - 69) < 0.00001);
  assert.ok(Math.abs(matrix.elements[13] - 0.035) < 0.00001);
  assert.ok(
    batch.boundingSphere && Number.isFinite(batch.boundingSphere.radius),
  );
});
