import sharp from "sharp";
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
const animations = [
  "idle",
  "walk",
  "run",
  "crouch",
  "melee",
  "firearm",
  "hurt",
  "death",
];
function person(
  skin: string,
  hair: string,
  top: string,
  body: string,
  style: string,
  state: string,
  f: number,
  face: string,
) {
  const phase = Math.sin((f / 6) * Math.PI * 2),
    stride = ["walk", "run"].includes(state)
      ? phase * (state === "run" ? 15 : 9)
      : 0;
  const crouch = state === "crouch" ? 20 : 0;
  const dead = state === "death";
  const arm = state === "melee" ? phase * 10 : 0;
  let b =
    ellipse(62, 119, 30, 4, "#26334222") +
    `<g transform="translate(0 ${crouch})">` +
    rect(45 - stride, 86 - crouch, 14, 29, "#45516c") +
    rect(66 + stride, 86 - crouch, 14, 29, "#53617c") +
    rect(41 - stride, 111 - crouch, 23, 9, "#e4e1da") +
    rect(64 + stride, 111 - crouch, 24, 9, "#e4e1da") +
    rect(39, 53, body === "broad" ? 51 : 46, 38, top, 12) +
    gloss(49, 60, 20) +
    rect(34, 60, 12, 30, skin, 6) +
    rect(77, 60, 12, 28, skin, 6) +
    ellipse(62, 37, 20, 24, skin) +
    path("M43 37Q35 11 60 11Q88 10 83 37L76 27L46 25Z", hair) +
    (style === "long" ? path("M42 24L36 63L48 60L50 27Z", hair) : "") +
    ellipse(76, 37, 2, 3, outline) +
    path("M80 44l7 1l-7 5", skin) +
    `<path d="M70 51h7" fill="none"/>`;
  if (state === "melee") b += rect(83 + arm, 61, 29, 12, skin, 5);
  if (state === "firearm")
    b += rect(83, 62, 29, 10, "#697b8b") + rect(89, 68, 8, 12, "#697b8b");
  if (state === "hurt") b += path("M91 27l9 -6m-5 17l12 1", "none");
  b += "</g>";
  if (state === "hurt")
    b = `<g transform="translate(${-Math.sin((f / 5) * Math.PI) * 4} 0)">${b}</g>`;
  if (dead)
    b = `<g transform="translate(0 ${(f / 5) * 30}) rotate(${(-f / 5) * 90} 64 64)">${b}</g>`;
  if (face === "left")
    b = `<g transform="translate(128 0) scale(-1 1)">${b}</g>`;
  return b;
}
for (let skin = 0; skin < 3; skin++)
  for (let hair = 0; hair < 3; hair++)
    for (let top = 0; top < 3; top++)
      for (const body of ["standard", "broad"])
        for (const style of ["short", "long"])
          for (const face of ["right", "left"]) {
            const skins = ["#c98c62", "#865641", "#efbe95"],
              tops = ["#ec8753", "#5ba9aa", "#a897cf"],
              hairs = ["#252939", "#72492e", "#e4bb65"];
            let frames = "";
            for (let row = 0; row < 8; row++)
              for (let f = 0; f < 6; f++)
                frames += `<g transform="translate(${f * 128} ${row * 128})">${person(skins[skin], hairs[hair], tops[top], body, style, animations[row], f, face)}</g>`;
            await asset(
              `player-${skin}-${hair}-${top}-${body}-${style}-${face}`,
              frames,
              768,
              1024,
              {
                frameWidth: 128,
                frameHeight: 128,
                frames: 48,
                animations: Object.fromEntries(
                  animations.map((a, i) => [
                    a,
                    { start: i * 6, end: i * 6 + 5, fps: a === "run" ? 12 : 8 },
                  ]),
                ),
                anchor: { x: 0.5, y: 0.94 },
              },
            );
          }
for (const [i, key] of [
  "caretaker",
  "trader",
  "shopkeeper",
  "hostile",
].entries())
  await asset(
    key,
    person(
      ["#efbe95", "#865641", "#c98c62", "#865641"][i],
      "#394050",
      ["#a6b9b6", "#d9aa59", "#a897cf", "#b94f54"][i],
      "standard",
      "short",
      "idle",
      0,
      "right",
    ),
  );
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
  rect(7, 65, 174, 47, "#bc6656", 10) +
    path("M45 65L65 30H126L156 65Z", "#d98069") +
    path("M69 38H94V63H53Z", "#a6c3c6") +
    path("M102 38H121L143 63H102Z", "#a6c3c6") +
    ellipse(43, 111, 18, 18, "#364451") +
    ellipse(149, 111, 18, 18, "#364451") +
    ellipse(43, 111, 8, 8, "#a6b4b8") +
    ellipse(149, 111, 8, 8, "#a6b4b8") +
    gloss(19, 76, 133),
  192,
  144,
);
for (const kind of Object.keys(PIECES)) {
  for (const state of ["intact", "damaged", "breached"]) {
    let b = "";
    if (kind === "foundation")
      b = rect(5, 100, 118, 20, "#b39466") + gloss(12, 106, 100);
    if (kind === "wall")
      b =
        rect(9, 10, 110, 110, "#a87b50") +
        `<path d="M32 12v108M59 12v108M86 12v108M112 12v108M11 33h105M11 96h105" stroke="#76583f"/>` +
        gloss(18, 19, 90);
    if (kind === "door")
      b =
        rect(18, 8, 93, 113, "#695446") +
        rect(27, 17, 75, 103, "#b68c59") +
        ellipse(87, 70, 4, 4, "#e5c773") +
        gloss(34, 25, 56);
    if (kind === "roof")
      b =
        path("M0 44L64 9L128 44Z", "#677e83") + rect(0, 44, 128, 12, "#a8b4a5");
    if (kind === "storage")
      b =
        rect(18, 58, 94, 60, "#b68c59") +
        `<path d="M20 68h91M37 58v60M92 58v60M29 110l70 -40" fill="none"/>` +
        rect(60, 75, 12, 18, "#d5c798");
    if (state === "damaged") b += path("M74 23L61 50L79 67L55 103", "none");
    if (state === "breached")
      b = path(
        "M9 120L15 80L29 112L43 96L55 119L80 106L107 91L119 120Z",
        "#92704e",
      );
    await asset(`${kind}-${state}`, b);
  }
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
await writeFile(
  new URL("manifest.json", root),
  JSON.stringify(
    { version: 1, palette: { outline, sky: "#c6d8d9" }, assets: manifest },
    null,
    2,
  ),
);
console.log(
  `Generated ${Object.keys(manifest).length} deterministic SVG + PNG assets.`,
);

const retained = new Set(
  Object.keys(manifest).flatMap((key) => [key + ".svg", key + ".png"]),
);
for (const file of await readdir(root))
  if (/\.(svg|png)$/.test(file) && !retained.has(file))
    await unlink(new URL(file, root));
