import "../../tests/helpers/model-textures";
import { readFile, writeFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
const root = "art/loot-items/meshy-v1",
  manifest = JSON.parse(await readFile(root + "/manifest.json", "utf8")),
  loader = new GLTFLoader(),
  models = [];
for (const p of manifest.props) {
  const raw = await readFile(root + "/models/" + p.name + ".glb"),
    g = await loader.parseAsync(
      raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength),
      "",
    );
  const bounds = new THREE.Box3().setFromObject(g.scene),
    size = bounds.getSize(new THREE.Vector3());
  if (
    bounds.isEmpty() ||
    bounds.min.y < -0.0001 ||
    !size.toArray().every((n) => Number.isFinite(n) && n > 0)
  )
    throw Error(p.name + ": invalid floor pivot or bounds");
  for (const [axis, key] of [
    ["x", "width"],
    ["y", "height"],
    ["z", "depth"],
  ] as const)
    if (Math.abs(size[axis] - p[key]) > 0.0001)
      throw Error(p.name + ": bounds disagree with catalog");
  let meshes = 0,
    skinned = 0;
  g.scene.traverse((o) => {
    if (o instanceof THREE.Mesh) meshes++;
    if (o instanceof THREE.SkinnedMesh) skinned++;
  });
  if (!meshes || skinned || g.animations.length)
    throw Error(p.name + ": pickup unexpectedly animated or empty");
  models.push({
    name: p.name,
    meshes,
    size: size.toArray(),
    floorPivotY: bounds.min.y,
    staticPickup: true,
  });
}
await writeFile(
  root + "/loader-check.json",
  JSON.stringify({ loadedInThreeJs: models.length, models }, null, 2) + "\n",
);
console.log(JSON.stringify({ loadedInThreeJs: models.length }));
