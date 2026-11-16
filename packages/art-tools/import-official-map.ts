import sharp from "sharp";
const buildings = [
  "shelter",
  "store",
  "bank",
  "hospital",
  "police",
  "restaurant",
  "office",
  "premium",
  "warehouse",
  "factory",
  "abandoned",
  "apartments",
  "luxury",
  "house",
  "shop",
  "workshop",
];
export async function importOfficialMap(
  root: URL,
  manifest: Record<string, any>,
) {
  const sourceRoot = new URL("../../art/ai/official-map/", import.meta.url);
  for (const group of [
    {
      name: "buildings",
      columns: 4,
      rows: 4,
      keys: buildings.map((n) => "map-building-" + n),
      width: 384,
      height: 384,
    },
    {
      name: "storefronts",
      columns: 2,
      rows: 2,
      keys: ["cafe", "laundry", "grocery", "books"].map(
        (n) => "map-building-" + n,
      ),
      width: 384,
      height: 384,
    },
    {
      name: "city-buildings",
      columns: 4,
      rows: 2,
      keys: [
        "kiosk",
        "bakery",
        "garage",
        "diner",
        "apartment-slab",
        "brick-warehouse",
        "corner-office",
        "duplex",
      ].map((n) => "map-building-" + n),
      width: 384,
      height: 384,
    },
    {
      name: "street-props",
      columns: 4,
      rows: 3,
      keys: [
        "dumpster",
        "recycling",
        "bollards",
        "hydrant",
        "planter",
        "cafe-table",
        "bicycle",
        "bus-stop",
        "sedan",
        "van",
        "cones",
        "bench",
      ].map((n) => "map-street-" + n),
      width: 256,
      height: 256,
    },
    {
      name: "nature-props",
      columns: 4,
      rows: 3,
      keys: [
        "shrub",
        "berries",
        "wildflowers",
        "grass",
        "fern",
        "stump",
        "log",
        "branches",
        "reeds",
        "cattails",
        "pebbles",
        "moss-boulder",
      ].map((n) => "map-nature-" + n),
      width: 256,
      height: 256,
    },
    {
      name: "trees",
      columns: 2,
      rows: 2,
      keys: ["oak", "pine", "birch", "dead"].map((n) => "map-tree-" + n),
      width: 384,
      height: 384,
    },
    {
      name: "nature",
      columns: 4,
      rows: 4,
      keys: Array.from({ length: 16 }, (_, i) => "map-nature-" + i),
      width: 384,
      height: 384,
    },
    {
      name: "props",
      columns: 3,
      rows: 3,
      keys: Array.from({ length: 9 }, (_, i) => "map-prop-" + i),
      width: 256,
      height: 256,
    },
    {
      name: "pavement",
      columns: 3,
      rows: 1,
      keys: ["slab", "pavers", "service"].map((n) => "map-paving-" + n),
      width: 256,
      height: 256,
    },
    {
      name: "tiles",
      columns: 3,
      rows: 2,
      keys: ["grass", "dirt", "gravel", "asphalt", "concrete", "water"].map(
        (n) => "map-tile-" + n,
      ),
      width: 64,
      height: 64,
    },
  ]) {
    const input = new URL(group.name + ".png", sourceRoot).pathname,
      meta = await sharp(input).metadata(),
      cw = Math.floor(meta.width! / group.columns),
      ch = Math.floor(meta.height! / group.rows);
    for (const [i, key] of group.keys.entries()) {
      const row = Math.floor(i / group.columns);
      const rowEdges =
        group.name === "street-props" ? [0, 362, 690, meta.height!] : undefined;
      const inset = [
        "city-buildings",
        "street-props",
        "nature-props",
        "trees",
      ].includes(group.name)
        ? 4
        : 0;
      let crop = await sharp(input)
        .extract({
          left: (i % group.columns) * cw,
          top: rowEdges ? rowEdges[row] : row * ch,
          width: cw,
          height: rowEdges ? rowEdges[row + 1] - rowEdges[row] : ch,
        })
        .png()
        .toBuffer();
      const file = key + ".png";
      if (
        [
          "buildings",
          "storefronts",
          "city-buildings",
          "street-props",
          "nature-props",
          "trees",
        ].includes(group.name)
      ) {
        const raw = await sharp(crop)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true }),
          clean = Buffer.from(raw.data),
          rw = raw.info.width,
          rh = raw.info.height;
        for (let y = 0; y < rh; y++)
          for (let x = 0; x < rw; x++) {
            const i = (y * rw + x) * 4;
            if (
              group.name !== "buildings" ||
              raw.data[i] < 210 ||
              raw.data[i + 1] > 110 ||
              raw.data[i + 2] > 110
            )
              continue;
            let edge = false;
            for (let dy = -3; dy <= 3 && !edge; dy++)
              for (let dx = -3; dx <= 3; dx++) {
                const nx = x + dx,
                  ny = y + dy;
                if (
                  nx < 0 ||
                  ny < 0 ||
                  nx >= rw ||
                  ny >= rh ||
                  raw.data[(ny * rw + nx) * 4 + 3] < 16
                ) {
                  edge = true;
                  break;
                }
              }
            if (edge) clean[i + 3] = 0;
          }
        // Discard disconnected export specks, while retaining large detached smoke.
        const labels = new Int32Array(rw * rh),
          queue = new Int32Array(rw * rh),
          sizes = [0];
        let label = 0;
        for (let n = 0; n < labels.length; n++) {
          if (labels[n] || clean[n * 4 + 3] < 24) continue;
          label++;
          let head = 0,
            tail = 1;
          queue[0] = n;
          labels[n] = label;
          while (head < tail) {
            const at = queue[head++],
              px = at % rw,
              py = Math.floor(at / rw);
            for (let dy = -1; dy <= 1; dy++)
              for (let dx = -1; dx <= 1; dx++) {
                const nx = px + dx,
                  ny = py + dy,
                  nn = ny * rw + nx;
                if (
                  nx < 0 ||
                  ny < 0 ||
                  nx >= rw ||
                  ny >= rh ||
                  labels[nn] ||
                  clean[nn * 4 + 3] < 24
                )
                  continue;
                labels[nn] = label;
                queue[tail++] = nn;
              }
          }
          sizes.push(tail);
        }
        const minimum = Math.max(
          12,
          Math.max(...sizes) *
            (["buildings", "storefronts", "city-buildings"].includes(group.name)
              ? 0.015
              : 0.002),
        );
        for (let n = 0; n < labels.length; n++)
          if (labels[n] && sizes[labels[n]] < minimum) clean[n * 4 + 3] = 0;
        crop = await sharp(clean, {
          raw: { width: rw, height: rh, channels: 4 },
        })
          .png()
          .toBuffer();
      }
      if (group.name === "pavement") {
        const { data, info } = await sharp(crop)
          .resize(256, 256)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        // Feather a narrow wrap margin; retain the AI's slab and brick layout.
        for (let y = 0; y < 256; y++)
          for (let k = 0; k < 4; k++)
            for (let c = 0; c < 4; c++) {
              const a = (y * 256 + k) * 4 + c,
                b = (y * 256 + 255 - k) * 4 + c,
                average = (data[a] + data[b]) / 2,
                t = (4 - k) / 4;
              data[a] = Math.round(data[a] * (1 - t) + average * t);
              data[b] = Math.round(data[b] * (1 - t) + average * t);
            }
        for (let x = 0; x < 256; x++)
          for (let k = 0; k < 4; k++)
            for (let c = 0; c < 4; c++) {
              const a = (k * 256 + x) * 4 + c,
                b = ((255 - k) * 256 + x) * 4 + c,
                average = (data[a] + data[b]) / 2,
                t = (4 - k) / 4;
              data[a] = Math.round(data[a] * (1 - t) + average * t);
              data[b] = Math.round(data[b] * (1 - t) + average * t);
            }
        await sharp(data, {
          raw: { width: info.width, height: info.height, channels: 4 },
        })
          .png()
          .toFile(new URL(file, root).pathname);
      } else if (group.name === "tiles") {
        // Mirroring one AI texture sample makes opposite edges identical, not a redrawing.
        const quadrant = await sharp(crop).resize(32, 32).png().toBuffer();
        const right = await sharp(quadrant).flop().toBuffer(),
          bottom = await sharp(quadrant).flip().toBuffer(),
          both = await sharp(quadrant).flip().flop().toBuffer();
        await sharp({
          create: {
            width: 64,
            height: 64,
            channels: 4,
            background: "#00000000",
          },
        })
          .composite([
            { input: quadrant, left: 0, top: 0 },
            { input: right, left: 32, top: 0 },
            { input: bottom, left: 0, top: 32 },
            { input: both, left: 32, top: 32 },
          ])
          .png()
          .toFile(new URL(file, root).pathname);
      } else
        await sharp(crop)
          .trim({ threshold: 10 })
          .resize(group.width - inset * 2, group.height - inset * 2, {
            fit: "contain",
            background: "#00000000",
          })
          .extend({
            top: inset,
            bottom: inset,
            left: inset,
            right: inset,
            background: "#00000000",
          })
          .png()
          .toFile(new URL(file, root).pathname);
      let contentBounds:
        | { x: number; y: number; width: number; height: number }
        | undefined;
      if (key.startsWith("map-building-")) {
        const { data, info } = await sharp(new URL(file, root).pathname)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        let left = info.width,
          top = info.height,
          right = 0,
          bottom = 0;
        for (let y = 0; y < info.height; y++)
          for (let x = 0; x < info.width; x++)
            if (data[(y * info.width + x) * 4 + 3] > 32) {
              left = Math.min(left, x);
              right = Math.max(right, x);
              top = Math.min(top, y);
              bottom = Math.max(bottom, y);
            }
        contentBounds = {
          x: left,
          y: top,
          width: right - left + 1,
          height: bottom - top + 1,
        };
      }
      manifest[key] = {
        file,
        width: group.width,
        height: group.height,
        frameWidth: group.width,
        frameHeight: group.height,
        frames: 1,
        anchor: { x: 0.5, y: 0.5 },
        source: "ai-generated",
        sourceGroup: "official-map",
        sourceAsset: group.name + ".png",
        ...(contentBounds ? { contentBounds } : {}),
      };
    }
  }
}
