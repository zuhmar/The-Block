import sharp from "sharp";
import { importConstruction } from "./import-construction.js";
import { importWorld } from "./import-world.js";
import { importCharacters } from "./import-characters.js";
import { mkdir, writeFile, readdir, unlink } from "node:fs/promises";
import { ITEMS, PIECES } from "../shared/src/index.js";
const root = new URL("../../apps/client/public/assets/", import.meta.url);
await mkdir(root, { recursive: true });
const manifest: Record<string, any> = {};
const outline = "#263342";
const wrap = (body: string, w = 128, h = 128) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><g stroke="${outline}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>`;
const rect = (x: number, y: number, w: number, h: number, c: string, r = 4) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${c}"/>`;
const ellipse = (x: number, y: number, rx: number, ry: number, c: string) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}"/>`;
const path = (d: string, c: string) => `<path d="${d}" fill="${c}"/>`;
const gloss = (x: number, y: number, w: number) =>
  `<path d="M${x} ${y}h${w}" stroke="white" opacity=".35" stroke-width="4"/>`;
async function asset(
  key: string,
  body: string,
  w = 128,
  h = 128,
  extra: object = {},
) {
  const svg = wrap(body, w, h);
  await writeFile(new URL(key + ".svg", root), svg);
  await sharp(Buffer.from(svg))
    .png()
    .toFile(new URL(key + ".png", root).pathname);
  manifest[key] = {
    file: key + ".png",
    width: w,
    height: h,
    frameWidth: w,
    frameHeight: h,
    frames: 1,
    anchor: { x: 0.5, y: 1 },
    ...extra,
  };
}
await importCharacters(root, manifest);
for (const [key, color] of Object.entries({
  sidewalk: "#bbb6aa",
  asphalt: "#485160",
  curb: "#ddd6c6",
  walltile: "#ae7967",
  ground: "#736f62",
}))
  await asset(
    key,
    rect(0, 0, 64, 64, color, 0) +
      `<path d="M0 32h64M32 0v32M12 48h9" opacity=".2" fill="none"/>`,
    64,
    64,
  );
for (let n = 0; n < 6; n++) {
  let b =
    rect(
      8,
      30,
      234,
      350,
      ["#798a98", "#b49d91", "#8a9d9b", "#a79fa3", "#73818f", "#b5a28b"][n],
      0,
    ) + rect(0, 20, 250, 16, "#536371", 0);
  for (let y = 55; y < 340; y += 65)
    for (let x = 24; x < 220; x += 48)
      b +=
        rect(x, y, 27, 39, n % 2 ? "#c9bf9e" : "#b4c6ca", 1) +
        `<path d="M${x + 13} ${y}v39M${x} ${y + 22}h27" stroke-width="2"/>`;
  b += rect(0, 360, 250, 20, "#66737b", 0);
  await asset("building-" + n, b, 256, 384);
}
for (const [key, label, color] of [
  ["shelter", "SHELTER", "#5f9f97"],
  ["shop", "CORNER MART", "#d69b5f"],
])
  await asset(
    key,
    rect(10, 35, 360, 210, "#b9b7aa", 0) +
      rect(0, 20, 380, 24, "#697a80", 0) +
      rect(25, 50, 330, 45, color) +
      `<text x="190" y="80" fill="#faf3dd" stroke="none" font-family="sans-serif" font-size="24" font-weight="bold" text-anchor="middle">${label}</text>` +
      rect(40, 115, 100, 95, "#8db4bf") +
      rect(160, 112, 67, 133, "#3a5964") +
      rect(250, 115, 90, 95, "#8db4bf") +
      gloss(51, 125, 70),
    384,
    256,
  );
await asset(
  "dumpster",
  rect(16, 47, 99, 65, "#579080") +
    rect(8, 35, 114, 17, "#71ad98") +
    rect(26, 112, 14, 9, "#34414c") +
    rect(91, 112, 14, 9, "#34414c") +
    gloss(25, 57, 75),
);
await asset(
  "trash",
  rect(34, 41, 61, 76, "#7895a0") +
    rect(29, 33, 71, 12, "#a5b9ba") +
    `<path d="M48 55v47M63 55v47M79 55v47" fill="none"/>`,
);
await asset(
  "streetlight",
  rect(59, 22, 8, 230, "#586875") +
    path("M63 27Q60 4 104 9L110 20L82 20Z", "#cfbd8e") +
    ellipse(97, 22, 15, 5, "#f9deb0"),
  128,
  256,
);
await asset(
  "vehicle",
  ellipse(95, 282, 69, 24, "#26392638") +
    rect(32, 66, 15, 50, "#35463c") +
    rect(145, 66, 15, 50, "#35463c") +
    rect(32, 216, 15, 50, "#35463c") +
    rect(145, 216, 15, 50, "#35463c") +
    rect(39, 23, 114, 268, "#a66f54", 26) +
    rect(47, 33, 98, 241, "#b67e5d", 21) +
    path("M53 83L139 83L145 130H47Z", "#658581") +
    rect(53, 136, 86, 85, "#bb8967", 10) +
    path("M49 225H142L135 257H57Z", "#62817a") +
    rect(49, 40, 28, 8, "#ddd6ac") +
    rect(115, 40, 28, 8, "#ddd6ac") +
    rect(47, 279, 30, 6, "#825a46") +
    rect(115, 279, 30, 6, "#825a46") +
    gloss(59, 52, 69) +
    '<path d="M44 133h105M49 222h94M58 146h73" fill="none" opacity=".3"/>',
  192,
  320,
);
for (const kind of Object.keys(PIECES))
  for (const state of ["intact", "damaged", "breached"]) {
    let b = "";
    if (kind === "foundation") {
      b = rect(2, 2, 124, 124, "#88714e", 1);
      for (let y = 5; y < 124; y += 20)
        b += rect(5, y, 118, 17, y % 3 ? "#aa8c5c" : "#b59a67", 1);
      b +=
        '<path d="M36 6v16M89 25v17M50 45v17M96 65v17M27 85v17M77 105v17" stroke="#6b5a40"/>' +
        gloss(9, 9, 105);
    }
    if (kind === "wall")
      b =
        path("M8 28L64 7L120 28V100L64 122L8 100Z", "#745f45") +
        path("M8 28L64 7L120 28L64 50Z", "#b99b66") +
        path("M8 28L64 50V122L8 100Z", "#9a7b51") +
        path("M64 50L120 28V100L64 122Z", "#816848") +
        '<path d="M25 36v69M44 43v70M83 43v70M103 35v70" opacity=".4" fill="none"/>' +
        gloss(27, 23, 55);
    if (kind === "door")
      b =
        rect(8, 17, 112, 102, "#6d6450", 2) +
        rect(20, 26, 88, 88, "#a88b5c", 1) +
        '<path d="M35 29v80M56 29v80M77 29v80M97 29v80M21 50h86M21 94h86" fill="none" opacity=".4"/>' +
        rect(87, 66, 10, 18, "#d4c18a") +
        gloss(25, 31, 75);
    if (kind === "roof")
      b =
        rect(1, 1, 126, 126, "#667565", 1) +
        path("M1 1L64 17L127 1V126H1Z", "#7d8b72") +
        '<path d="M64 17v109M4 28h56M68 28h55M4 48h56M68 48h55M4 68h56M68 68h55M4 88h56M68 88h55M4 108h56M68 108h55" stroke="#516450" opacity=".55"/>' +
        gloss(8, 8, 110);
    if (kind === "storage")
      b =
        path("M13 37L75 16L116 38V101L55 122L13 99Z", "#7d633f") +
        path("M13 37L75 16L116 38L55 60Z", "#bda16c") +
        path("M13 37L55 60V122L13 99Z", "#a38758") +
        '<path d="M55 60L116 38M55 72L116 51M21 52L48 66M55 111L114 90M31 44v63M91 48v60" fill="none"/>' +
        rect(67, 69, 14, 21, "#ccbd86") +
        gloss(35, 33, 42);
    if (state === "damaged") b += path("M80 25L62 51L83 72L55 103", "none");
    if (state === "breached")
      b =
        ellipse(64, 99, 58, 15, "#2636262a") +
        path(
          "M7 98L29 78L44 103L60 84L86 93L112 76L121 108L78 119L44 110Z",
          "#9a7a50",
        );
    await asset(kind + "-" + state, b);
  }
const iconColors = [
  "#82bcc7",
  "#d4a561",
  "#dbe3d3",
  "#b78c5d",
  "#9aa9b5",
  "#a6aaa2",
  "#b5755b",
  "#bac0b7",
  "#819ca9",
  "#afd4ce",
  "#82a59a",
  "#8b8b60",
  "#b6c77f",
  "#b4946c",
  "#758490",
  "#d9bc78",
];
for (const [i, key] of Object.keys(ITEMS).entries()) {
  let b = "";
  const c = iconColors[i];
  if (key === "water")
    b =
      rect(22, 15, 22, 42, c, 7) +
      rect(26, 6, 14, 10, "#dee3d0") +
      gloss(28, 23, 9);
  else if (key === "wood" || key === "bat")
    b = path("M12 47L44 12L53 21L22 55Z", c) + path("M20 42L43 20", "none");
  else if (key === "pistol") b = path("M9 19H55V30H34L30 52H17L21 30H9Z", c);
  else if (key === "bandage")
    b =
      rect(8, 22, 48, 22, c, 8) +
      rect(23, 18, 18, 31, "#e4c8ab") +
      `<path d="M32 24v18M27 33h10" stroke="#ba6a58"/>`;
  else if (key === "backpack")
    b =
      rect(14, 16, 38, 43, c, 9) +
      rect(22, 6, 22, 13, c) +
      rect(20, 37, 26, 16, "#b3ae80");
  else if (key === "cash")
    b = rect(5, 17, 54, 32, c) + ellipse(32, 33, 10, 10, "#dbe4aa");
  else if (key === "ammo")
    b =
      rect(12, 21, 9, 33, c) + rect(28, 15, 9, 39, c) + rect(44, 21, 9, 33, c);
  else b = path("M10 25L26 11L51 20L56 45L37 56L12 47Z", c) + gloss(22, 25, 19);
  await asset(key, b, 64, 64);
}
for (const key of [
  "health",
  "hunger",
  "thirst",
  "energy",
  "temperature",
  "inventory",
  "build",
  "interact",
  "chat",
  "hit",
  "muzzle",
  "impact",
  "construction",
  "debris",
  "loot",
]) {
  const b =
    key === "loot"
      ? path(
          "M39 31L50 15H79L88 31L111 93Q111 121 64 121Q17 121 17 93Z",
          "#c3a576",
        ) + path("M38 37h52", "none")
      : path(
          "M64 9L76 43L112 38L88 65L113 94L77 88L64 120L51 88L14 96L39 65L17 36L51 43Z",
          key === "health"
            ? "#d87872"
            : key === "thirst"
              ? "#82bdc9"
              : "#e7c27d",
        );
  await asset(key, b);
}
// Overhead city assets: all original vector forms, never reference-game sprites.
for (const [key, color] of Object.entries({
  "td-grass": "#6d7b58",
  "td-dirt": "#8e886a",
  "td-concrete": "#aaa793",
  "td-asphalt": "#606865",
  "td-floor": "#817d67",
})) {
  let b = `<rect x="0" y="0" width="128" height="128" fill="${color}" stroke="none"/>`;
  for (let i = 0; i < 20; i++) {
    const x = (i * 47 + 13) % 120,
      y = (i * 31 + 7) % 120;
    b += `<path d="M${x} ${y}l${3 + (i % 5)} ${i % 2 ? 2 : -2}" fill="none" stroke="#334c32" stroke-width="1.5" opacity=".22"/>`;
  }
  if (key === "td-concrete")
    b += '<path d="M0 64h128M64 0v128" opacity=".2" fill="none"/>';
  if (key === "td-asphalt")
    b +=
      '<path d="M14 0l19 34l-8 20l24 29m-7 -49l18 -10M110 92l-24 16l5 20" fill="none" opacity=".22"/>';
  if (key === "td-floor")
    for (let y = 12; y < 128; y += 21)
      b += '<path d="M0 ' + y + 'h128" opacity=".25"/>';
  await asset(key, b, 128, 128);
}
for (let i = 0; i < 4; i++) {
  let b =
    ellipse(141, 199, 100, 37, "#1c302334") +
    path("M113 219L120 97L139 97L150 219Z", "#7d7050");
  for (const [x, y, rx, ry] of [
    [76, 98, 54, 45],
    [163, 92, 57, 50],
    [122, 53, 58, 44],
    [116, 130, 75, 48],
  ])
    b += ellipse(x, y, rx, ry, ["#526d43", "#617d4c", "#728454", "#54734f"][i]);
  b +=
    path("M69 85Q105 40 142 58M58 119Q75 93 107 101", "none") +
    `<path d="M69 85Q105 40 142 58M58 119Q75 93 107 101" stroke="#c2ce8b" opacity=".28" stroke-width="6" fill="none"/>`;
  await asset("td-tree-" + i, b, 256, 256, { anchor: { x: 0.5, y: 0.83 } });
}
for (let i = 0; i < 4; i++) {
  const walls = ["#a39272", "#7e8e86", "#af9c83", "#8d8477"][i],
    roof = ["#687a70", "#96735c", "#738385", "#858775"][i];
  let b =
    path("M22 46H480V348H22Z", walls) +
    rect(12, 16, 480, 272, roof, 7) +
    rect(23, 29, 458, 244, roof, 4) +
    gloss(35, 41, 420);
  for (let x = 38; x < 470; x += 37)
    b += '<path d="M' + x + ' 48v208" opacity=".17" fill="none"/>';
  b += rect(52, 62, 112, 76, "#526159") + rect(61, 70, 94, 60, "#8b9481");
  for (let x = 70; x < 150; x += 16)
    b += '<path d="M' + x + ' 74v51" stroke="#59665e"/>';
  b +=
    rect(335, 53, 85, 120, "#596960") +
    rect(346, 64, 63, 98, "#9aa38d") +
    ellipse(377, 112, 23, 23, "#6b7e70") +
    path("M377 89v46M354 112h46", "none");
  b +=
    rect(208, 290, 70, 58, "#4c6159") +
    rect(42, 299, 107, 31, "#b3c3ad") +
    rect(344, 299, 107, 31, "#b3c3ad") +
    gloss(43, 305, 80);
  await asset("td-building-" + i, b, 512, 384, { anchor: { x: 0.5, y: 0.91 } });
}
await asset(
  "td-rubble",
  ellipse(64, 105, 57, 17, "#22302626") +
    path("M6 93L29 65L43 79L69 34L99 62L122 104L88 112L53 105Z", "#8d9180") +
    path("M30 66L44 96L69 35L79 91L99 63", "none") +
    rect(11, 97, 29, 14, "#9a7960") +
    rect(79, 98, 35, 13, "#9a7960"),
);
await asset(
  "td-bush",
  ellipse(64, 94, 53, 22, "#283e2733") +
    ellipse(37, 68, 29, 24, "#617849") +
    ellipse(80, 64, 35, 29, "#71834f") +
    ellipse(61, 79, 36, 21, "#5c7542") +
    gloss(28, 61, 17),
);
await asset(
  "td-pallet",
  rect(8, 31, 110, 79, "#705d43") +
    rect(8, 23, 110, 75, "#a78b5c") +
    '<path d="M26 25v71M47 25v71M69 25v71M92 25v71" fill="none"/>' +
    gloss(15, 30, 92),
);
await asset(
  "td-bench",
  rect(14, 37, 101, 60, "#5c6656") +
    rect(10, 28, 109, 50, "#a29168") +
    '<path d="M12 44h105M12 61h105M29 82v17M99 82v17" fill="none"/>' +
    gloss(20, 34, 88),
);
await asset(
  "td-bed",
  rect(24, 14, 79, 105, "#657263") +
    rect(29, 18, 69, 95, "#9ba58d") +
    rect(34, 21, 59, 25, "#d7d3b8") +
    rect(30, 49, 67, 63, "#7b9476") +
    gloss(37, 55, 52),
);
await asset(
  "td-streetlamp",
  ellipse(70, 105, 22, 8, "#1b2a2440") +
    rect(61, 32, 10, 76, "#5e6c62") +
    path("M65 35Q63 10 97 15L104 29H78Z", "#a4a78a") +
    ellipse(91, 30, 13, 5, "#e2dab1"),
);
for (const [key, body] of Object.entries({
  "ui-craft":
    path("M22 76L81 17L98 33L40 95Z", "#c9b37e") +
    path("M23 22L39 15L101 79L85 96Z", "#a3af9c"),
  "ui-skills":
    ellipse(64, 38, 21, 25, "#b2bda8") +
    path("M21 111Q24 70 64 70Q104 70 107 111Z", "#b2bda8"),
  "ui-map":
    path("M14 25L45 13L82 26L114 14V103L82 115L45 102L14 114Z", "#a9baa0") +
    '<path d="M45 13v89M82 26v89" fill="none"/>',
  "ui-journal":
    rect(24, 15, 83, 99, "#a8b197") +
    path("M38 15v99M51 38h40M51 57h40M51 77h28", "none"),
  "ui-build":
    path("M13 58L64 15L115 58L104 68L64 34L24 69Z", "#b7b89a") +
    path("M29 62V111H99V62L64 36Z", "#969f85") +
    rect(54, 80, 22, 31, "#5b6e5f"),
  "ui-inventory":
    rect(25, 31, 79, 83, "#a9b497", 15) +
    path("M44 31V18H83V31", "none") +
    rect(38, 72, 52, 31, "#819375"),
  "ui-chat":
    rect(15, 20, 98, 73, "#a8b99f", 12) +
    path("M33 91L28 113L56 92Z", "#a8b99f") +
    '<path d="M32 43h65M32 63h47" fill="none"/>',
  "ui-fists": path(
    "M29 76V44Q29 35 40 35V23Q40 14 52 17Q65 9 73 18Q87 13 91 27Q104 25 104 39V77L88 107H43Z",
    "#bea887",
  ),
}))
  await asset(key, body);
await importWorld(root, manifest);
await importConstruction(root, manifest);
await writeFile(
  new URL("manifest.json", root),
  JSON.stringify(
    {
      version: 2,
      view: "top-down",
      palette: { outline, sky: "#c6d8d9" },
      assets: manifest,
    },
    null,
    2,
  ),
);
console.log(
  `Built ${Object.keys(manifest).length} assets including AI-generated characters, props, items and buildings.`,
);

const retained = new Set(
  Object.values(manifest).flatMap((a) =>
    a.source === "ai-generated"
      ? [a.file]
      : [a.file, a.file.replace(/\.png$/, ".svg")],
  ),
);
for (const file of await readdir(root))
  if (/\.(svg|png)$/.test(file) && !retained.has(file))
    await unlink(new URL(file, root));
