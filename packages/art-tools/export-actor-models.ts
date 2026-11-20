import { mkdir, writeFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import {
  createStickPlayer,
  createPistol,
  createWeapon,
} from "../../apps/client/src/fps/actor-models";
// The exporter uses FileReader only to package geometry buffers; no browser or textures are needed.
class BufferReader {
  result: ArrayBuffer | null = null;
  onloadend?: () => void;
  readAsArrayBuffer(blob: Blob) {
    void blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onloadend?.();
    });
  }
}
Object.defineProperty(globalThis, "FileReader", {
  value: BufferReader,
  configurable: true,
});
const player = createStickPlayer(),
  pistol = createPistol();
const times = [0, 0.25, 0.5, 0.75, 1];
const tracks = ["left-leg", "right-leg", "left-arm", "right-arm"].map(
  (name, index) => {
    const angles = [0, 0.3, 0, -0.3, 0].map(
      (n) => n * (index % 2 ? -1 : 1) * (index > 1 ? 0.5 : 1),
    );
    const values = angles.flatMap((angle) =>
      new THREE.Quaternion()
        .setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle)
        .toArray(),
    );
    return new THREE.QuaternionKeyframeTrack(
      name + ".quaternion",
      times,
      values,
    );
  },
);
const walk = new THREE.AnimationClip("walk", 1, tracks);
await mkdir("art/models", { recursive: true });
for (const [name, root, animations] of [
  ["black-stick-player", player.root, [walk]],
  ["street-pistol", pistol.root, []],
  ["street-smg", createWeapon("smg").root, []],
  ["street-assault-rifle", createWeapon("rifle").root, []],
  ["street-sniper", createWeapon("sniper").root, []],
] as const) {
  const data = await new GLTFExporter().parseAsync(root, {
    binary: true,
    animations: [...animations],
  });
  if (!(data instanceof ArrayBuffer))
    throw Error("Expected a binary glTF asset");
  await writeFile("art/models/" + name + ".glb", Buffer.from(data));
  console.log(name + ".glb · " + data.byteLength + " bytes");
}
