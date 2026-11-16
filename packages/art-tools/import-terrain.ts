import sharp from "sharp";
export async function importTerrain(root: URL, manifest: Record<string, any>) {
  const source = new URL(
    "../../art/ai/terrain/cliff-sheet.png",
    import.meta.url,
  );
  const meta = await sharp(source.pathname).metadata(),
    cell = Math.floor(meta.width! / 2);
  for (let i = 0; i < 4; i++) {
    const file = `terrain-cliff-${i}.png`;
    const crop = await sharp(source.pathname)
      .extract({
        left: (i % 2) * cell,
        top: Math.floor(i / 2) * cell,
        width: cell,
        height: cell,
      })
      .toBuffer();
    await sharp(crop)
      .trim({ threshold: 12 })
      .resize(384, 144, { fit: "contain", background: "#00000000" })
      .png()
      .toFile(new URL(file, root).pathname);
    manifest[`terrain-cliff-${i}`] = {
      file,
      width: 384,
      height: 144,
      frameWidth: 384,
      frameHeight: 144,
      frames: 1,
      anchor: { x: 0.5, y: 0.5 },
      source: "ai-generated",
      sourceGroup: "terrain",
      sourceAsset: "cliff-sheet.png",
    };
  }
}
