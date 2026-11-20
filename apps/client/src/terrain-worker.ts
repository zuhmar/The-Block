import { TerrainPainter } from "./terrain-painter";
import { CHUNK_SIZE } from "../../../packages/shared/src/official-map";
import { setMapReservations } from "../../../packages/shared/src/terrain";

let sources: Promise<Record<string, ImageBitmap>>;
let painter: TerrainPainter | undefined;
let painterRatio = 0;
self.onmessage = async ({ data }) => {
  if (data.type === "init") {
    sources = Promise.all(
      Object.entries(data.files as Record<string, string>).map(
        async ([key, url]) => {
          const response = await fetch(url);
          if (!response.ok) throw Error("Terrain texture unavailable");
          return [key, await createImageBitmap(await response.blob())] as const;
        },
      ),
    ).then(Object.fromEntries);
    // A rejected initialization is reported by the first requested chunk.
    void sources.catch(() => {});
    return;
  }
  const { key, generation, ratio, x, y, reservations } = data;
  try {
    const images = await sources;
    if (!painter || painterRatio !== ratio) {
      painterRatio = ratio;
      painter = new TerrainPainter(
        ratio,
        (name) => images[name],
        () => new OffscreenCanvas(1, 1) as unknown as HTMLCanvasElement,
      );
    }
    setMapReservations(reservations);
    const canvas = new OffscreenCanvas(
      (CHUNK_SIZE + 2) * ratio,
      (CHUNK_SIZE + 2) * ratio,
    );
    const ctx = canvas.getContext("2d")!;
    ctx.save();
    ctx.scale(ratio, ratio);
    ctx.translate(1, 1);
    painter.paint(ctx as unknown as CanvasRenderingContext2D, x, y);
    ctx.restore();
    const size = CHUNK_SIZE * ratio,
      full = (CHUNK_SIZE + 2) * ratio;
    ctx.drawImage(canvas, ratio, ratio, size, ratio, ratio, 0, size, ratio);
    ctx.drawImage(
      canvas,
      ratio,
      size,
      size,
      ratio,
      ratio,
      size + ratio,
      size,
      ratio,
    );
    ctx.drawImage(canvas, ratio, 0, ratio, full, 0, 0, ratio, full);
    ctx.drawImage(canvas, size, 0, ratio, full, size + ratio, 0, ratio, full);
    // Keep map chunks at 16x16 tiles, but upload terrain in small full-resolution patches.
    const tiles: { x: number; y: number; size: number; bitmap: ImageBitmap }[] =
      [];
    for (let dy = 0; dy < CHUNK_SIZE; dy += 256)
      for (let dx = 0; dx < CHUNK_SIZE; dx += 256) {
        const patch = new OffscreenCanvas(258 * ratio, 258 * ratio);
        patch
          .getContext("2d")!
          .drawImage(
            canvas,
            dx * ratio,
            dy * ratio,
            258 * ratio,
            258 * ratio,
            0,
            0,
            258 * ratio,
            258 * ratio,
          );
        tiles.push({
          x: dx,
          y: dy,
          size: 256,
          bitmap: patch.transferToImageBitmap(),
        });
      }
    (
      self as unknown as {
        postMessage(message: unknown, transfer: Transferable[]): void;
      }
    ).postMessage(
      { key, generation, tiles },
      tiles.map((tile) => tile.bitmap),
    );
  } catch {
    self.postMessage({ key, generation, error: true });
  }
};
