import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import {
  validateMap,
  validateGlb,
  MAX_ASSET_TOTAL,
  MAX_ASSET_BYTES,
  type MapDocument,
} from "./document";
const DB_NAME = "street-survival-map-editor-v1";
let opening: Promise<IDBDatabase> | undefined;
function database() {
  return (opening ??= new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("project");
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error ?? Error("Editor storage unavailable"));
  }));
}
export async function saveDraft(
  doc: MapDocument,
  assets: Map<string, ArrayBuffer>,
) {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("project", "readwrite");
    tx.objectStore("project").put({ doc, assets: [...assets] }, "draft");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
export async function loadDraft() {
  const db = await database();
  return new Promise<
    { doc: unknown; assets: [string, ArrayBuffer][] } | undefined
  >((resolve, reject) => {
    const r = db.transaction("project").objectStore("project").get("draft");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export function exportBundle(
  doc: MapDocument,
  assets: Map<string, ArrayBuffer>,
) {
  const files: Record<string, Uint8Array> = {
    "map.json": strToU8(JSON.stringify(doc, null, 2)),
  };
  for (const a of doc.assets) {
    const bytes = assets.get(a.id);
    if (!bytes) throw Error("Missing imported model: " + a.name);
    files["assets/" + a.id.replace("custom:", "") + ".glb"] = new Uint8Array(
      bytes,
    );
  }
  return zipSync(files, { level: 1 });
}
export function importBundle(bytes: Uint8Array, known: ReadonlySet<string>) {
  if (bytes.byteLength > MAX_ASSET_TOTAL + 8 * 1024 * 1024)
    throw Error("Map bundle is too large");
  let total = 0;
  const files = unzipSync(bytes, {
    filter: (file) => {
      const valid =
        file.name === "map.json" ||
        /^assets\/[a-z0-9-]{1,64}\.glb$/i.test(file.name);
      if (!valid) return false;
      total += file.originalSize;
      if (
        file.originalSize > MAX_ASSET_BYTES ||
        total > MAX_ASSET_TOTAL + 4 * 1024 * 1024
      )
        throw Error("Expanded map bundle exceeds its limits");
      return true;
    },
  });
  if (!files["map.json"] || files["map.json"].length > 4 * 1024 * 1024)
    throw Error("Bundle needs a valid map.json");
  const doc = validateMap(JSON.parse(strFromU8(files["map.json"])), known),
    assets = new Map<string, ArrayBuffer>();
  for (const a of doc.assets) {
    const data = files["assets/" + a.id.replace("custom:", "") + ".glb"];
    if (!data || data.byteLength !== a.bytes)
      throw Error("Missing or incorrect model: " + a.name);
    const buffer = data.slice().buffer as ArrayBuffer;
    validateGlb(buffer);
    assets.set(a.id, buffer);
  }
  return { doc, assets };
}
export function download(name: string, bytes: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
