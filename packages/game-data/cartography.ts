import { WORLD } from "../shared/src/index.js";
import {
  COAST,
  RIVER,
  LAKES,
  CLIFFS,
  ROADS,
  forestTrees,
  pathNear,
} from "../shared/src/terrain.js";
const path = (ps: readonly { x: number; y: number }[]) =>
  ps
    .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
// Geographic artwork is generated from the same coordinates as collision and travel.
// Both canvas sizes share this cached base; live players and loot remain overlays.
export function cartographySVG(width: number, height: number) {
  const detailed = width > 300;
  const text = (
    x: number,
    y: number,
    label: string,
    size = 90,
    fill = "#334d40",
    extra = "",
  ) =>
    `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" paint-order="stroke" stroke="#d6d4b1" stroke-width="9" stroke-linejoin="round" ${extra}>${label}</text>`;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 9600 6400"><defs>
 <linearGradient id="sea" x2=".6" y2="1"><stop stop-color="#6b999e"/><stop offset="1" stop-color="#2f586b"/></linearGradient>
 <linearGradient id="land" x2=".3" y2="1"><stop stop-color="#d2d0ab"/><stop offset=".55" stop-color="#b5c09a"/><stop offset="1" stop-color="#c9c6a1"/></linearGradient>
 <pattern id="grain" width="83" height="73" patternUnits="userSpaceOnUse"><circle cx="9" cy="17" r="2" fill="#324c3b" opacity=".12"/><circle cx="57" cy="49" r="3" fill="#fff4cb" opacity=".24"/></pattern>
 <pattern id="sea-lines" width="170" height="120" patternUnits="userSpaceOnUse"><path d="M14 45h42m45 50h32" stroke="#c2d5cb" stroke-width="3" opacity=".15"/></pattern>
 <clipPath id="land-clip"><path d="${path(COAST)}Z"/></clipPath></defs>
 <rect width="9600" height="6400" fill="url(#sea)"/><rect width="9600" height="6400" fill="url(#sea-lines)"/>
 <path d="${path(COAST)}Z" fill="none" stroke="#a9c7bc" stroke-width="190" opacity=".2"/>
 <path d="${path(COAST)}Z" fill="none" stroke="#b9d1bd" stroke-width="95" opacity=".35"/>
 <path d="${path(COAST)}Z" fill="url(#land)" stroke="#e2d7af" stroke-width="35"/>
 <g clip-path="url(#land-clip)"><rect width="9600" height="6400" fill="url(#grain)"/>`;
  for (const t of forestTrees())
    s += `<circle cx="${t.x}" cy="${t.y}" r="${70 + t.variant * 7}" fill="${["#597957", "#6a865c", "#7b9165", "#516e50"][t.variant]}" opacity=".32"/>`;
  if (detailed)
    for (const t of forestTrees())
      s += `<path d="M${t.x - 13} ${t.y + 14}l13 -29l13 29m-13 -6v20" fill="none" stroke="#405c43" stroke-width="5" opacity=".35"/>`;
  for (const r of CLIFFS) {
    for (let i = 4; i > 0; i--)
      s += `<ellipse cx="${r.x + r.width / 2}" cy="${r.y + r.height / 2}" rx="${r.width / 2 + i * 49}" ry="${r.height / 2 + i * 33}" fill="none" stroke="#8b9475" stroke-width="5" opacity=".5"/>`;
    s += `<path d="M${r.x} ${r.y + r.height}l${r.width * 0.15} -${r.height * 0.7}l${r.width * 0.18} ${r.height * 0.4}l${r.width * 0.2} -${r.height * 0.9}l${r.width * 0.23} ${r.height * 0.6}l${r.width * 0.24} -${r.height * 0.2}" fill="none" stroke="#697463" stroke-width="24" stroke-linejoin="round"/>`;
  }
  s += `<path d="${path(RIVER)}" fill="none" stroke="#e2d6ac" stroke-width="188"/><path d="${path(RIVER)}" fill="none" stroke="#75a5a3" stroke-width="148"/><path d="${path(RIVER)}" fill="none" stroke="#90b8ad" stroke-width="90" opacity=".55"/>`;
  for (const lake of LAKES)
    s += `<path d="${path(lake)}Z" fill="#78a6a1" stroke="#e4d7ad" stroke-width="26"/><path d="${path(lake)}Z" fill="none" stroke="#acd0bc" stroke-width="8"/>`;
  for (const road of ROADS) {
    const w = road.width * 0.65;
    s += `<path d="${path(road.points)}" fill="none" stroke="#7b806a" stroke-width="${w + 25}" stroke-linecap="round"/><path d="${path(road.points)}" fill="none" stroke="#f0dfb5" stroke-width="${w}" stroke-linecap="round"/>`;
    if (detailed)
      s += `<path d="${path(road.points)}" fill="none" stroke="#b7a480" stroke-width="5" stroke-dasharray="24 42"/>`;
    for (let i = 1; i < road.points.length; i++) {
      const p = road.points[i];
      if (!pathNear(p, RIVER, 105)) continue;
      const prev = road.points[i - 1],
        angle = (Math.atan2(p.y - prev.y, p.x - prev.x) * 180) / Math.PI;
      s += `<path d="M-14 -${w / 2 + 9}V${w / 2 + 9}M14 -${w / 2 + 9}V${w / 2 + 9}" transform="translate(${p.x} ${p.y}) rotate(${angle})" stroke="#655c49" stroke-width="8"/>`;
    }
  }
  for (const [i, r] of WORLD.obstacles.entries())
    if (i >= 5)
      s += `<rect x="${r.x + 9}" y="${r.y + 13}" width="${r.width}" height="${r.height}" fill="#637160" opacity=".2"/><rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" rx="9" fill="#929681" stroke="#707964" stroke-width="10"/>`;
  s += '</g><g font-family="Georgia,serif" text-anchor="middle">';
  if (detailed) {
    s +=
      text(3630, 1550, "THE BLOCK", 180, "#455444", 'letter-spacing="24"') +
      text(
        3630,
        1690,
        "Town district · no construction",
        66,
        "#65715b",
        'font-family="sans-serif" letter-spacing="7"',
      );
    s +=
      text(7810, 1770, "E A S T W O O D", 130) +
      text(3770, 5170, "S O U T H   C O M M O N S", 120) +
      text(7780, 3470, "Mill Lake", 68, "#426b70", 'font-style="italic"') +
      text(
        6860,
        3830,
        "Willow River",
        72,
        "#426b70",
        'font-style="italic" transform="rotate(83 6860 3830)"',
      ) +
      text(7020, 5050, "Greyrock Bluffs", 72) +
      text(810, 5700, "C O A S T A L", 85, "#c1d8ce") +
      text(810, 5840, "W A T E R S", 85, "#c1d8ce");
    s += `<g fill="#56644f" font-family="sans-serif" font-size="52" letter-spacing="5">${text(4300, 850, "COAST ROAD", 54)}${text(4400, 2440, "MILL ROAD", 54)}${text(3500, 4000, "SOUTH PASS", 54)}</g>`;
    // Cartographic furniture stays in offshore space.
    s += `<g transform="translate(9060 420)"><path d="M0 -155L-47 60L0 26L47 60Z" fill="#ecdfb7" stroke="#44626a" stroke-width="8"/><path d="M0 -155V26L47 60Z" fill="#668780"/>${text(0, -210, "N", 83, "#efe2bb")}</g>`;
    s +=
      `<g transform="translate(500 6140)" stroke="#d5dec7" stroke-width="8"><path d="M0 -24V0h1000v-24M500 -24V0"/></g>` +
      text(
        1000,
        6060,
        "1,000 world units",
        53,
        "#d5dec7",
        'font-family="sans-serif"',
      );
  }
  if (detailed) {
    for (const poi of [
      { x: 410, y: 590, name: "HAVEN", color: "#668566" },
      {
        x: WORLD.storePoint.x,
        y: WORLD.storePoint.y,
        name: "MART",
        color: "#94734e",
      },
      {
        x: WORLD.traderPoint.x,
        y: WORLD.traderPoint.y,
        name: "EXCHANGE",
        color: "#94734e",
      },
    ]) {
      s +=
        `<circle cx="${poi.x}" cy="${poi.y}" r="37" fill="${poi.color}" stroke="#f6e7bd" stroke-width="10"/>` +
        text(
          poi.x,
          poi.y + 145,
          poi.name,
          78,
          "#405440",
          'font-family="sans-serif" letter-spacing="4"',
        );
    }
  }
  s += "</g>";
  s += `<rect x="28" y="28" width="9544" height="6344" rx="18" fill="none" stroke="#e5ddbb" stroke-width="8" opacity=".6"/></svg>`;
  return s;
}
