import { MARKET_QUARTER } from "../shared/src/market-quarter.js";
import {
  buildingVisual,
  propVisual,
  sceneryVisual,
  usesSceneryVisual,
} from "../game-data/map-visuals.js";
import {
  frontageStyle,
  citySurfaces,
  cityPaving,
  pavingEdges,
  streetConnections,
} from "../game-data/map-presentation.js";
import sharp from "sharp";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import {
  COAST,
  RIVER,
  STREAM,
  LAKES,
  ROADS,
  mapObjects,
  groundKind,
  mountainBlend,
} from "../shared/src/terrain.js";
import {
  BUILDINGS,
  MAP_SIZE,
  LEGACY_BUILDINGS,
  PARKING_LOTS,
  INDUSTRIAL_YARDS,
  CIVIC_PLAZA,
  PARKS,
} from "../shared/src/official-map.js";
const root = "apps/client/public/assets/",
  { assets } = JSON.parse(await readFile(root + "manifest.json", "utf8"));
const path = (ps: readonly { x: number; y: number }[]) =>
  ps
    .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
const objects = [...BUILDINGS, ...mapObjects()]
  .map(propVisual)
  .filter((o) => o !== null)
  .sort((a, b) => a.y + a.height / 2 - (b.y + b.height / 2));
const keys = new Set([
  ...objects.map((o) => o.asset),
  "map-tile-grass",
  "map-tile-water",
  "map-tile-gravel",
  "map-tile-asphalt",
  "map-tile-dirt",
  "map-tile-concrete",
  "map-paving-slab",
  "map-paving-pavers",
  "map-paving-service",
]);
let defs = `<radialGradient id="terrain-fade"><stop offset="0" stop-color="white"/><stop offset=".45" stop-color="white" stop-opacity=".6"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient><mask id="terrain-brush" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox" x="0" y="0" width="1" height="1"><rect width="1" height="1" fill="url(#terrain-fade)"/></mask>`;
for (const key of keys) {
  const a = assets[key],
    b64 = (await readFile(root + a.file)).toString("base64");
  defs += `<image id="${key}" width="${a.width}" height="${a.height}" href="data:image/png;base64,${b64}"/>`;
  if (key.startsWith("map-tile") || key.startsWith("map-paving-"))
    defs += `<pattern id="pattern-${key}" width="${key.startsWith("map-paving-") ? 128 : a.width}" height="${key.startsWith("map-paving-") ? 128 : a.height}" patternUnits="userSpaceOnUse"><use href="#${key}" transform="scale(${key.startsWith("map-paving-") ? 128 / a.width : 1})"/>${key === "map-paving-slab" ? '<rect width="128" height="128" fill="#b5b7b0" opacity=".22"/>' : key === "map-tile-grass" ? '<rect width="64" height="64" fill="#71804c" opacity=".24"/>' : ""}</pattern>`;
}
const start = `<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="2048" viewBox="0 0 ${MAP_SIZE} ${MAP_SIZE}"><defs>${defs}<clipPath id="land"><path d="${path(COAST)}Z"/></clipPath></defs>`;
let body = `<rect width="${MAP_SIZE}" height="${MAP_SIZE}" fill="url(#pattern-map-tile-water)"/><g clip-path="url(#land)"><rect width="${MAP_SIZE}" height="${MAP_SIZE}" fill="url(#pattern-map-tile-grass)"/>`;
for (let y = 0; y < 256; y++)
  for (let x = 0; x < 256; x++) {
    const k = groundKind({ x: x * 64 + 32, y: y * 64 + 32 });
    if (k === "mountain" || k === "rocky") {
      const p = { x: x * 64 + 32, y: y * 64 + 32 },
        radius = k === "mountain" ? 48 : 40;
      const dx = Math.sin(p.x * 0.013 + p.y * 0.021) * 12,
        dy = Math.cos(p.x * 0.017 - p.y * 0.019) * 12;
      body += `<circle cx="${p.x + dx}" cy="${p.y + dy}" r="${radius}" fill="url(#pattern-map-tile-gravel)" mask="url(#terrain-brush)" opacity="${k === "mountain" ? mountainBlend(p) * 0.6 : 0.14}"/>`;
    }
  }
body += `<path d="${path(COAST)}Z" fill="none" stroke="#b9bb8a" stroke-width="46"/>`;
for (const [r, w] of [
  [RIVER, 448],
  [STREAM, 84],
] as const)
  body += `<path d="${path(r)}" fill="none" stroke="#b2b28b" stroke-width="${w + 34}"/><path d="${path(r)}" fill="none" stroke="#397c91" stroke-width="${w}"/>`;
for (const l of LAKES)
  body += `<path d="${path(l)}Z" fill="#397c91" stroke="#b9bb8a" stroke-width="22"/>`;
for (const r of cityPaving())
  body += `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="url(#pattern-map-paving-slab)"/>`;
for (const [width, color] of [
  [8, "#81877b"],
  [4, "#c7c7b1"],
] as const)
  body += `<path d="${pavingEdges()
    .map((e) => `M${e.a.x},${e.a.y}L${e.b.x},${e.b.y}`)
    .join(" ")}" fill="none" stroke="${color}" stroke-width="${width}"/>`;
body += `<rect x="${CIVIC_PLAZA.x}" y="${CIVIC_PLAZA.y}" width="${CIVIC_PLAZA.width}" height="${CIVIC_PLAZA.height}" rx="28" fill="url(#pattern-map-paving-pavers)"/>`;
for (const surface of citySurfaces()) {
  body += `<polygon points="${surface.points.map((p) => `${p.x},${p.y}`).join(" ")}" fill="url(#pattern-${surface.service ? "map-paving-service" : surface.court ? "map-paving-pavers" : surface.material === "concrete" ? "map-paving-slab" : "map-tile-gravel"})" stroke="#9a9d8e" stroke-width="2"/>`;
  if (surface.court) {
    const a = surface.points[0],
      b = surface.points[2];
    body += `<rect x="${a.x + 8}" y="${a.y + 8}" width="${b.x - a.x - 16}" height="${b.y - a.y - 16}" fill="url(#pattern-map-paving-pavers)"/>`;
  }
  if (surface.service) {
    const a = surface.points[0],
      b = surface.points[2];
    body += `<rect x="${a.x + 16}" y="${a.y + 16}" width="${b.x - a.x - 32}" height="${b.y - a.y - 32}" fill="none" stroke="#c6ac68" stroke-width="3" stroke-dasharray="12 10"/>`;
  }
  if (surface.alley) {
    const a = surface.points[0],
      b = surface.points[2];
    body += `<rect x="${(a.x + b.x) / 2 - 18}" y="${a.y}" width="36" height="${b.y - a.y}" fill="url(#pattern-map-paving-service)"/>`;
  }
}
for (const p of PARKS)
  body += `<ellipse cx="${p.x}" cy="${p.y}" rx="${p.width / 2 + 12}" ry="${p.height / 2 + 12}" fill="url(#pattern-map-tile-dirt)" stroke="#a6aa8d" stroke-width="3"/><ellipse cx="${p.x}" cy="${p.y}" rx="${p.width / 2}" ry="${p.height / 2}" fill="url(#pattern-map-tile-grass)"/>`;
for (const route of MARKET_QUARTER.paths)
  body += `<polyline points="${route.points.map((p) => `${p.x},${p.y}`).join(" ")}" fill="none" stroke="url(#pattern-map-paving-slab)" stroke-width="${route.width}" stroke-linejoin="round"/>`;
for (const c of streetConnections()) {
  const points = c.points.map((p) => `${p.x},${p.y}`).join(" ");
  body += `<polyline points="${points}" fill="none" stroke="url(#pattern-map-paving-slab)" stroke-width="${c.width + 10}" stroke-linejoin="round"/>`;
}
for (const b of BUILDINGS) {
  const style = frontageStyle(b),
    pad = style.apron;
  body += `<rect x="${b.x - b.width / 2 - pad}" y="${b.y - b.height / 2 - 12}" width="${b.width + pad * 2}" height="${b.height + pad + 32}" rx="8" fill="url(#pattern-${style.material === "gravel" ? "map-paving-service" : "map-paving-slab"})"/>`;
}
for (const lot of [...PARKING_LOTS, ...INDUSTRIAL_YARDS])
  body += `<rect x="${lot.x - lot.width / 2}" y="${lot.y - lot.height / 2}" width="${lot.width}" height="${lot.height}" rx="32" fill="url(#pattern-map-tile-${INDUSTRIAL_YARDS.includes(lot) ? "gravel" : "concrete"})"/>`;
for (const lot of PARKING_LOTS)
  for (let i = 0; i <= 4; i++)
    body += `<path d="M${lot.x - 288 + i * 144} ${lot.y - 75}V${lot.y + 130}" stroke="#eee9cc" stroke-width="4"/>`;
for (const road of ROADS) {
  body += `<path d="${path(road.points)}" fill="none" stroke="${road.width < 100 ? "#8e926c" : "#626e70"}" stroke-width="${road.width + (road.width < 100 ? 18 : 62)}"/>`;
  if (road.width >= 100)
    body += `<path d="${path(road.points)}" fill="none" stroke="url(#pattern-map-paving-slab)" stroke-width="${road.width + 54}"/>`;
}
for (const road of ROADS)
  body += `<path d="${path(road.points)}" fill="none" stroke="url(#pattern-map-tile-${road.width < 100 ? "dirt" : "asphalt"})" stroke-width="${road.width}"/>`;
for (const road of ROADS.filter((r) => r.width >= 100))
  body += `<path d="${path(road.points)}" fill="none" stroke="#e1d6a4" stroke-width="3" stroke-dasharray="32 96"/>`;
for (const o of objects) {
  if (o.kind === "building") {
    const a = assets[o.asset],
      v = buildingVisual(o, a);
    body += `<use href="#${o.asset}" transform="translate(${v.x} ${v.y}) scale(${v.width / a.width} ${v.height / a.height}) translate(${-a.width * v.originX} ${-a.height * v.originY})"/>`;
    continue;
  }

  if (usesSceneryVisual(o)) {
    const a = assets[o.asset],
      v = sceneryVisual(o, a);
    body += `<use href="#${o.asset}" transform="translate(${v.x} ${v.y}) rotate(${o.rotation || 0}) scale(${v.width / a.width} ${v.height / a.height}) translate(${-a.width * v.originX} ${-a.height * v.originY})"/>`;
    continue;
  }
  const tree = o.kind === "tree",
    mountain = o.kind === "mountain",
    w = tree ? 128 : o.width,
    h = tree ? 158 : mountain ? o.height + 100 : o.height,
    oy = tree ? -60 : mountain ? -50 : 0,
    a = assets[o.asset];
  body += `<use href="#${o.asset}" transform="translate(${o.x} ${o.y + oy}) rotate(${o.rotation || 0}) scale(${(o.rotation ? h : w) / a.width} ${(o.rotation ? w : h) / a.height}) translate(${-a.width / 2} ${-a.height / 2})"/>`;
}
for (const r of LEGACY_BUILDINGS.slice(0, 5))
  body += `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="url(#pattern-map-paving-slab)"/>`;
body += "</g></svg>";
await mkdir("work", { recursive: true });
await writeFile("work/official-world-preview.svg", start + body);
await sharp(Buffer.from(start + body))
  .png()
  .toFile("work/official-world-preview.png");
// A close-up exposes sprite scale and walkable street spacing, without pretending to be a browser screenshot.
const close = (start + body).replace(
  'width="2048" height="2048" viewBox="0 0 16384 16384"',
  'width="1536" height="1024" viewBox="6800 4500 4608 3072"',
);
await sharp(Buffer.from(close)).png().toFile("work/official-city-preview.png");
console.log("Rendered actual map-model world and city previews.");
