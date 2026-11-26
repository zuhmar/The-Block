/** Inspect Meshy's actual GLB exports; do not infer geometry quality from a thumbnail. */
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
Object.defineProperty(globalThis, "self", {
  value: globalThis,
  configurable: true,
});
Object.defineProperty(globalThis, "createImageBitmap", {
  value: async (blob: Blob) => {
    const info = await sharp(Buffer.from(await blob.arrayBuffer())).metadata();
    return { width: info.width, height: info.height, close() {} };
  },
  configurable: true,
});
const root = "art/buildings/block-mart/meshy-props";
const manifest = JSON.parse(await readFile(`${root}/manifest.json`, "utf8"));
const models = [];
for (const asset of manifest.assets) {
  const path = `models/${asset.name}.glb`,
    bytes = await readFile(`${root}/${path}`);
  if (bytes.toString("utf8", 0, 4) !== "glTF" || bytes.readUInt32LE(4) !== 2)
    throw Error(`Invalid GLB ${asset.name}`);
  const doc = JSON.parse(
    bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)),
  );
  if (doc.buffers.some((b: { uri?: string }) => b.uri))
    throw Error(`External geometry ${asset.name}`);
  if (
    doc.images?.some(
      (i: { uri?: string }) => i.uri && !i.uri.startsWith("data:"),
    )
  )
    throw Error(`External image ${asset.name}`);
  const model = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
  model.scene.updateMatrixWorld(true);
  let triangles = 0,
    meshes = 0;
  model.scene.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      meshes++;
      triangles +=
        (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
    }
  });
  const bounds = new THREE.Box3().setFromObject(model.scene),
    size = bounds.getSize(new THREE.Vector3());
  if (
    !meshes ||
    triangles < 12 ||
    triangles > asset.targetTriangles * 1.2 + 100 ||
    size.toArray().some((v) => !Number.isFinite(v) || v <= 0)
  )
    throw Error(`Geometry budget/bounds ${asset.name}`);
  const textures = [];
  for (const i of doc.images ?? []) {
    if (i.bufferView === undefined) continue;
    const view = doc.bufferViews[i.bufferView],
      binOffset = 20 + bytes.readUInt32LE(12) + 8;
    const image = bytes.subarray(
        binOffset + (view.byteOffset ?? 0),
        binOffset + (view.byteOffset ?? 0) + view.byteLength,
      ),
      info = await sharp(image).metadata();
    if (!info.width || !info.height || info.width > 2048 || info.height > 2048)
      throw Error(`Texture budget ${asset.name}`);
    textures.push({
      width: info.width,
      height: info.height,
      format: info.format,
    });
  }
  if (!textures.length) throw Error(`Missing embedded texture ${asset.name}`);
  models.push({
    name: asset.name,
    path,
    taskId: asset.taskId,
    reference: asset.reference,
    referenceSha256: asset.referenceSha256,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.length,
    triangles,
    meshes,
    materials: model.parser.json.materials.length,
    embeddedTextures: textures,
    sourceBounds: {
      min: bounds.min.toArray(),
      max: bounds.max.toArray(),
      size: size.toArray(),
    },
    gameIntegrated: Boolean(manifest.gameIntegrated),
  });
}
const report = {
  source:
    "Meshy image-to-3D from nine separately generated original-concept-derived sprites",
  geometryModel: "meshy-t2",
  textureModel: "meshy-n1",
  count: models.length,
  totalTriangles: models.reduce((n, m) => n + m.triangles, 0),
  totalBytes: models.reduce((n, m) => n + m.bytes, 0),
  integrationStatus: manifest.gameIntegrated
    ? "Prepared runtime variants are integrated in Block Mart; these measurements refer to the retained Meshy source exports."
    : "Source exports: world scale, pivots, mobile texture optimization and collision integration remain separate work.",
  models,
};
await writeFile(
  `${root}/model-report.json`,
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      count: report.count,
      totalTriangles: report.totalTriangles,
      totalBytes: report.totalBytes,
      models: models.map((m) => ({
        name: m.name,
        triangles: m.triangles,
        sourceSize: m.sourceBounds.size,
      })),
    },
    null,
    2,
  ),
);
