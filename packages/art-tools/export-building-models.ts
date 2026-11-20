import { mkdir, writeFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { createBuildingModel } from "../../apps/client/src/fps/building-models";
import { BUILDINGS, frontOf } from "../../apps/client/src/fps/building-layout";
class BufferReader {
  result: ArrayBuffer | null = null;
  onloadend?: () => void;
  readAsArrayBuffer(blob: Blob) {
    void blob.arrayBuffer().then((data) => {
      this.result = data;
      this.onloadend?.();
    });
  }
}
Object.defineProperty(globalThis, "FileReader", {
  value: BufferReader,
  configurable: true,
});
await mkdir("art/models/buildings", { recursive: true });
for (let i = 0; i < BUILDINGS.length; i++) {
  const b = BUILDINGS[i],
    model = createBuildingModel(i);
  const closed = [0, 0, 0, 1],
    open = new THREE.Quaternion()
      .setFromAxisAngle(new THREE.Vector3(0, 1, 0), (frontOf(b) * Math.PI) / 2)
      .toArray();
  const animations = [
    new THREE.AnimationClip("open-door", 0.35, [
      new THREE.QuaternionKeyframeTrack(
        "door-hinge.quaternion",
        [0, 0.35],
        [...closed, ...open],
      ),
    ]),
    new THREE.AnimationClip("close-door", 0.35, [
      new THREE.QuaternionKeyframeTrack(
        "door-hinge.quaternion",
        [0, 0.35],
        [...open, ...closed],
      ),
    ]),
  ];
  const data = await new GLTFExporter().parseAsync(model.root, {
    binary: true,
    animations,
  });
  if (!(data instanceof ArrayBuffer)) throw Error("Expected binary glTF");
  await writeFile("art/models/buildings/" + b.type + ".glb", Buffer.from(data));
  console.log(b.name + " · " + data.byteLength + " bytes");
}
