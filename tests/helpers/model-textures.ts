// Decode embedded model images in Node for GLTFLoader geometry checks.
import sharp from "sharp";
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
