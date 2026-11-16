import {
  DISTRICTS,
  MOUNTAIN_REGIONS,
  MAP_SIZE,
  BUILDINGS,
} from "../shared/src/official-map.js";
import {
  COAST,
  RIVER,
  STREAM,
  LAKES,
  ROADS,
  mapObjects,
  mapObjectEnabled,
} from "../shared/src/terrain.js";
const path = (ps: readonly { x: number; y: number }[]) =>
  ps
    .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
export function cartographySVG(
  width: number,
  height: number,
  logicalWidth = width,
) {
  const detailed = logicalWidth > 260;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${MAP_SIZE} ${MAP_SIZE}"><defs><linearGradient id="land" x2=".4" y2="1"><stop stop-color="#bdd291"/><stop offset="1" stop-color="#91b271"/></linearGradient><clipPath id="landclip"><path d="${path(COAST)}Z"/></clipPath></defs><rect width="${MAP_SIZE}" height="${MAP_SIZE}" fill="#367e96"/><path d="${path(COAST)}Z" fill="url(#land)" stroke="#d3c499" stroke-width="45"/><g clip-path="url(#landclip)">`;
  for (const r of MOUNTAIN_REGIONS) {
    svg += `<ellipse cx="${r.x + r.width / 2}" cy="${r.y + r.height / 2}" rx="${r.width * 0.4}" ry="${r.height * 0.4}" fill="#959d84" opacity=".5"/>`;
    if (detailed)
      for (let i = 1; i < 5; i++)
        svg += `<ellipse cx="${r.x + r.width / 2}" cy="${r.y + r.height / 2}" rx="${r.width * (0.15 + i * 0.05)}" ry="${r.height * (0.15 + i * 0.05)}" fill="none" stroke="#6e8069" stroke-width="9" opacity=".5"/>`;
  }
  for (const o of mapObjects()) {
    if (o.kind === "tree")
      svg += `<circle cx="${o.x}" cy="${o.y}" r="65" fill="#4e8050" opacity=".75"/>`;
    else if (o.kind === "mountain")
      svg += `<path d="M${o.x - 95} ${o.y + 70}l95 -160l95 160" fill="#7a8b7d" stroke="#5a6d64" stroke-width="10"/>`;
    else if (o.kind === "rock" || o.kind === "cliff")
      svg += `<ellipse cx="${o.x}" cy="${o.y}" rx="${o.width / 2}" ry="${o.height / 2}" fill="#7f8c7d"/>`;
  }
  for (const [river, w] of [
    [RIVER, 448],
    [STREAM, 84],
  ] as const)
    svg += `<path d="${path(river)}" fill="none" stroke="#cfca9c" stroke-width="${w + 40}"/><path d="${path(river)}" fill="none" stroke="#438ea4" stroke-width="${w}"/>`;
  for (const lake of LAKES)
    svg += `<path d="${path(lake)}Z" fill="#438ea4" stroke="#cfca9c" stroke-width="30"/>`;
  for (const road of ROADS)
    svg += `<path d="${path(road.points)}" fill="none" stroke="#d7d4b8" stroke-width="${road.width + 44}"/><path d="${path(road.points)}" fill="none" stroke="${road.width < 100 ? "#b19c72" : "#63706b"}" stroke-width="${road.width}"/>`;
  for (const b of BUILDINGS.filter(mapObjectEnabled))
    svg += `<rect x="${b.x - b.width / 2}" y="${b.y - b.height / 2}" width="${b.width}" height="${b.height}" fill="#778272" stroke="#d3d0b4" stroke-width="12"/>`;
  svg += "</g>";
  if (detailed) {
    svg +=
      '<g font-family="Georgia,serif" text-anchor="middle" fill="#284d3b" paint-order="stroke" stroke="#d5dfa9" stroke-width="18">';
    const labelSize = (11 * MAP_SIZE) / logicalWidth;
    for (const d of DISTRICTS) {
      const cx = d.x + d.width / 2,
        cy = d.y + d.height * 0.57;
      if (d.id === "industrial")
        svg += `<text x="${cx}" y="${cy - labelSize * 0.4}" font-size="${labelSize}">Industrial</text><text x="${cx}" y="${cy + labelSize * 0.7}" font-size="${labelSize}">District</text>`;
      else
        svg += `<text x="${cx}" y="${cy}" font-size="${labelSize}">${d.name}</text>`;
    }
    svg += `<text x="3500" y="2900" font-size="180">Northwest Falls</text><text x="7350" y="14200" font-size="180">South Lake</text><text x="14800" y="11000" font-size="160" transform="rotate(90 14800 11000)">Eastern River</text></g><g font-family="sans-serif" fill="#f1ecd2"><text x="500" y="15800" font-size="170">STREET SURVIVAL · 256 × 256</text><text x="15300" y="750" font-size="240">N ↑</text></g>`;
  }
  svg += `<rect x="24" y="24" width="${MAP_SIZE - 48}" height="${MAP_SIZE - 48}" fill="none" stroke="#e1e2bf" stroke-width="10"/></svg>`;
  return svg;
}
