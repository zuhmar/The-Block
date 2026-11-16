import Phaser from "phaser";
import { Client, type Room } from "colyseus.js";
import {
  WORLD,
  BUILD_KINDS,
  BUILDING,
  snapBuildPoint,
  structureFootprint,
  VERSION,
  ITEMS,
  PIECES,
  safe,
  distance,
  placementReason,
  type Action,
  type Player,
  type Structure,
  type Bag,
  type Kind,
  type Item,
  type Point,
} from "../../../packages/shared/src/index";
import { npcs } from "../../../packages/game-data/content";
import "./style.css";
import { constructionVisual } from "./construction-visuals";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<main id="shell"><div id="game" aria-label="The Block top-down survival world"></div><header id="masthead"><a class="brand" href="#">STREET <strong>SURVIVAL</strong><small>THE BLOCK / URBAN FRONTIER</small></a><div id="connection"><i></i><span>CONNECT TO THE CITY</span></div></header><div id="game-ui" hidden><nav id="top-tools" aria-label="Game menus">${[
  ["inventory", "ui-inventory", "INVENTORY", "Tab"],
  ["craft", "ui-craft", "CRAFTING", "C"],
  ["skills", "ui-skills", "CHARACTER", "K"],
  ["build", "ui-build", "BUILDING", "B"],
  ["journal", "ui-journal", "JOURNAL", "J"],
  ["map", "ui-map", "MAP", "M"],
  ["chat", "ui-chat", "CHAT", "↵"],
]
  .map(
    ([id, icon, name, key]) =>
      `<button data-ui="${id}" aria-label="${name}" title="${name} · ${key}"><img src="/assets/${icon}.png" alt=""><span>${name}</span><kbd>${key}</kbd></button>`,
  )
  .join(
    "",
  )}</nav><section id="world-status"></section><button id="minimap-button" data-ui="map" aria-label="Open district map"><div class="map-heading"><span>THE BLOCK</span><b>N ↑</b></div><canvas id="minimap" width="200" height="150"></canvas><div id="coordinates"></div></button><aside id="objective"></aside><section id="vitals"></section><section id="needs"></section><div id="hotbar" aria-label="Quick actions"></div><div id="context"></div><div id="chat-feed" aria-live="polite"></div><div id="touch"><div class="dpad"><button data-hold="up" aria-label="Move north">▲</button><div><button data-hold="left" aria-label="Move west">◀</button><button data-hold="down" aria-label="Move south">▼</button><button data-hold="right" aria-label="Move east">▶</button></div></div><div class="touch-actions"><button data-hold="sprint">RUN</button><button data-hold="crouch">LOW</button><button data-ui="interact">E</button><button data-ui="attack">HIT</button></div></div><div id="key-help">W A S D <span>MOVE</span> · SHIFT <span>SPRINT</span> · E <span>INTERACT</span> · R <span>RELOAD</span></div></div><div id="notice" role="status"></div><section id="panel" hidden></section><div id="death" hidden><span class="eyebrow">LIFE ON THE BLOCK</span><h2>Left behind.</h2><p>Your carried gear and cash are now public loot.<br>Your skills, bank and property remain yours.</p><button id="respawn">Return to the shelter</button></div><div id="auth"><div class="auth-card"><div class="auth-mark"><span class="eyebrow">A PERSISTENT URBAN SANDBOX</span><h1>Make this<br>block <em>yours.</em></h1><p>Search the ruins. Craft your tools.<br>Build something worth protecting.</p></div><form id="login"><span class="eyebrow">YOUR LIFE ON THE BLOCK</span><h3>Step onto the street</h3><label>Street name<input name="name" autocomplete="username" placeholder="Your unique name" pattern="[a-zA-Z][a-zA-Z0-9_]{2,19}" required maxlength="20"></label><label>Password<input name="password" type="password" autocomplete="current-password" placeholder="At least 10 characters" minlength="10" maxlength="128" required></label><p class="character-style">Your survivor is a black stick figure. Make your name on the block.</p><button name="register" value="true" type="submit">Create character <span>↗</span></button><button class="secondary" name="register" value="false" type="submit">I already live here · Sign in</button><p id="auth-error" role="alert"></p><small>Start with 10,000 wood, $10, water and a snack.<br>Practice building. Wood uses no carry weight.</small></form><div class="auth-foot"><i></i> ONE SHARED CITY · NO PAID ADVANTAGES</div></div><aside class="auth-caption"><span>THE HAVEN / DISTRICT 01</span><b>A safe start.<br>An open world.</b><p>Leave the shelter when you’re ready.<br>The rest is up to you.</p></aside></div></main>`;
const $ = (s: string) => document.querySelector<HTMLElement>(s)!;
let room: Room | undefined,
  seq = 0,
  serverOffset = 0,
  self: Player | undefined;
let snapshot: {
  players: Player[];
  structures: Structure[];
  bags: Bag[];
  clock: number;
} = { players: [], structures: [], bags: [], clock: 0 };
let manifest: Record<string, any> = {},
  panel = "",
  buildKind: Kind = "foundation",
  foundation = "",
  selectedItem: Item = "water",
  aim = false,
  noticeTimer: number;
const hold = {
  up: false,
  down: false,
  left: false,
  right: false,
  sprint: false,
  crouch: false,
};
const chat: { name: string; text: string; at: number }[] = [];
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const appearanceKey = () => "player-stick";
const send = (action: Action) =>
  room?.send("intent", {
    v: VERSION,
    seq: ++seq,
    requestId: crypto.randomUUID(),
    at: Date.now() + serverOffset,
    action,
  });
function notice(text: string) {
  if (!text) return;
  $("#notice").textContent = text;
  $("#notice").classList.add("show");
  clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(
    () => $("#notice").classList.remove("show"),
    3500,
  );
}
const img = (key: string, cls = "") =>
  `<img class="${cls}" src="/assets/${key}.png" alt="">`;
const btn = (label: string, action: Action, disabled = false) =>
  `<button class="action" data-action='${esc(JSON.stringify(action))}' ${disabled ? "disabled" : ""}>${label}</button>`;
const nice = (s: string) =>
  s === "foundation" ? "Floor" : s.replace(/\b\w/g, (c) => c.toUpperCase());
function facing(p: Player) {
  return Math.abs(p.facingY) > Math.abs(p.facing)
    ? p.facingY < 0
      ? "north"
      : "south"
    : p.facing < 0
      ? "west"
      : "east";
}
function interact() {
  const n = nearest();
  if (!n) return notice("Move closer to a person, container or structure.");
  if (n.type === "scavenge") send({ type: "scavenge", index: n.index });
  else if (n.type === "guide") toggle("journal");
  else {
    panel = n.type + ":" + (n.id || "");
    renderPanel();
  }
}
function nearest() {
  if (!self) return;
  const candidates: any[] = [
    {
      title: "Mara · Corner Mart",
      ...WORLD.storePoint,
      type: "store",
      hint: "Buy supplies",
    },
    {
      title: "Otis · Scrap Exchange",
      ...WORLD.traderPoint,
      type: "trader",
      hint: "Sell recyclables",
    },
    {
      title: "June · Shelter caretaker",
      x: 550,
      y: 510,
      type: "guide",
      hint: "Survival guide",
    },
    ...WORLD.scavengePoints.map((p, index) => ({
      ...p,
      title: "Abandoned container",
      type: "scavenge",
      index,
      hint:
        (self!.cooldowns[index] || 0) > Date.now()
          ? "Depleted · return later"
          : "Search for resources",
    })),
    ...snapshot.bags.map((b) => ({
      ...b,
      title: "Public loot bag",
      type: "loot",
      hint: "Anyone can take these items",
    })),
    ...snapshot.structures
      .filter((s) => s.kind !== "roof")
      .map((s) => ({
        ...s,
        title: nice(s.kind) + (s.owner === self!.id ? " · Yours" : ""),
        type: s.kind === "storage" ? "storage" : "structure",
        hint:
          s.kind === "foundation"
            ? "Raid-proof floor"
            : s.hp <= 0
              ? "Breached"
              : s.hp + " HP",
      })),
  ];
  return candidates
    .filter((c) => distance(c, self!) < 150)
    .sort((a, b) => distance(a, self!) - distance(b, self!))[0];
}

class City extends Phaser.Scene {
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  sprites = new Map<string, Phaser.GameObjects.Sprite>();
  labels = new Map<string, Phaser.GameObjects.Text>();
  loading = new Set<string>();
  attackSeen = new Map<string, number>();
  lastHealth = new Map<string, number>();
  hurtUntil = new Map<string, number>();
  staticBuilt = false;
  lastSend = 0;
  preview!: Phaser.GameObjects.Image;
  previewText!: Phaser.GameObjects.Text;
  buildGuides!: Phaser.GameObjects.Graphics;
  lastY = new Map<string, number>();
  constructor() {
    super("city");
  }
  preload() {
    this.load.json("manifest", "/assets/manifest.json");
  }
  create() {
    manifest = this.cache.json.get("manifest").assets;
    for (const [key, a] of Object.entries(manifest)) {
      if (a.animations) {
        this.load.spritesheet(key, "/assets/" + a.file, {
          frameWidth: a.frameWidth,
          frameHeight: a.frameHeight,
        });
      } else this.load.image(key, "/assets/" + a.file);
    }
    this.load.once("complete", () => this.drawWorld());
    this.load.start();
    this.cameras.main.setBackgroundColor("#718260");
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.keys = this.input.keyboard!.addKeys(
      "W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,CTRL,E,TAB,M,B,C,K,J,ENTER,R,ESC,ONE,TWO,THREE,FOUR,FIVE,SIX,SEVEN,EIGHT,NINE,ZERO",
    ) as typeof this.keys;
    this.input.keyboard!.removeCapture(["TAB", "ENTER", "SHIFT", "CTRL"]);
    this.input.mouse!.disableContextMenu();
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (!self || self.dead) return;
      if (p.rightButtonDown()) {
        aim = true;
        send({ type: "aim", x: p.worldX, y: p.worldY });
        return;
      }
      if (panel === "build") {
        send({
          type: "build",
          kind: buildKind,
          x: p.worldX,
          y: p.worldY,
          foundation,
        });
        return;
      }
      attack({ x: p.worldX, y: p.worldY });
    });
    this.input.on("pointerup", () => (aim = false));
    this.input.on(
      "wheel",
      (_p: unknown, _o: unknown, _dx: number, dy: number) => {
        if (panel) return;
        this.cameras.main.setZoom(
          Phaser.Math.Clamp(this.cameras.main.zoom - dy * 0.0007, 0.65, 1.45),
        );
      },
    );
  }
  text(x: number, y: number, text: string, size = 12, color = "#d6dbc7") {
    return this.add
      .text(x, y, text, {
        fontFamily: "Arial",
        fontSize: size,
        color,
        backgroundColor: "#24392cd9",
        padding: { x: 9, y: 5 },
        letterSpacing: 1,
      })
      .setOrigin(0.5, 1);
  }
  drawWorld() {
    this.staticBuilt = true;
    const random = new Phaser.Math.RandomDataGenerator([
      "street-survival-the-block-v2",
    ]);
    this.add
      .tileSprite(
        WORLD.width / 2,
        WORLD.height / 2,
        WORLD.width,
        WORLD.height,
        "td-grass",
      )
      .setDepth(-10000);
    for (const r of WORLD.parcelRects) {
      this.add
        .tileSprite(
          r.x + r.width / 2,
          r.y + r.height / 2,
          r.width,
          r.height,
          "td-dirt",
        )
        .setDepth(-9500);
      const g = this.add.graphics().setDepth(-9000);
      g.lineStyle(2, 0xd2c397, 0.35);
      g.strokeRect(r.x + 8, r.y + 8, r.width - 16, r.height - 16);
      this.text(
        r.x + r.width / 2,
        r.y + 24,
        "VACANT GROUND / BUILDABLE",
        10,
        "#d4ccad",
      ).setDepth(-8900);
    }
    for (const r of WORLD.roads) {
      this.add
        .tileSprite(
          r.x + r.width / 2,
          r.y + r.height / 2,
          r.width + 64,
          r.height + 64,
          "td-concrete",
        )
        .setDepth(-8000);
      this.add
        .tileSprite(
          r.x + r.width / 2,
          r.y + r.height / 2,
          r.width,
          r.height,
          "td-asphalt",
        )
        .setDepth(-7900);
      const g = this.add.graphics().setDepth(-7800);
      g.lineStyle(3, 0xd0cda7, 0.6);
      if (r.width > r.height)
        for (let x = 0; x < r.width; x += 136)
          g.lineBetween(x + 20, r.y + r.height / 2, x + 80, r.y + r.height / 2);
      else
        for (let y = 0; y < r.height; y += 136)
          g.lineBetween(r.x + r.width / 2, y + 20, r.x + r.width / 2, y + 80);
    }
    this.add.tileSprite(410, 590, 660, 400, "td-floor").setDepth(-7000);
    this.add.tileSprite(1270, 675, 1020, 180, "td-concrete").setDepth(-7000);
    this.add.tileSprite(1930, 675, 450, 180, "td-dirt").setDepth(-6900);
    const safeOutline = this.add.graphics().setDepth(-6500);
    safeOutline.lineStyle(3, 0xa6c185, 0.65);
    safeOutline.strokeRoundedRect(83, 403, 654, 394, 8);
    WORLD.obstacles.forEach((r, i) => {
      if (i < 5) {
        this.add
          .tileSprite(
            r.x + r.width / 2,
            r.y + r.height / 2,
            r.width,
            r.height + 8,
            "td-concrete",
          )
          .setTint(0xc4cbb6)
          .setDepth(r.y + r.height);
      } else {
        this.add
          .image(
            r.x + r.width / 2,
            r.y + r.height,
            "td-building-" + (i === 5 ? 1 : i === 6 ? 2 : i % 4),
          )
          .setOrigin(0.5, 0.91)
          .setDisplaySize(r.width + 22, r.height + 60)
          .setDepth(r.y + r.height);
      }
    });
    for (const x of [160, 270, 590])
      this.add
        .image(x, 452, "td-bed")
        .setOrigin(0.5, 0.8)
        .setScale(0.6)
        .setDepth(470);
    this.add
      .image(148, 680, "td-bench")
      .setOrigin(0.5, 0.8)
      .setScale(0.65)
      .setDepth(680);
    this.add
      .image(650, 660, "td-bench")
      .setOrigin(0.5, 0.8)
      .setScale(0.65)
      .setDepth(660);
    this.text(410, 360, "THE HAVEN · PUBLIC SHELTER", 15, "#d2d9b8").setDepth(
      1000,
    );
    this.text(1090, 342, "CORNER MART", 13).setDepth(1000);
    this.text(1550, 342, "SCRAP EXCHANGE", 13).setDepth(1000);
    for (let i = 0; i < 150; i++) {
      const p = {
        x: random.integerInRange(40, 6350),
        y: random.integerInRange(80, 3100),
      };
      if (
        WORLD.roads.some(
          (r) =>
            p.x > r.x - 65 &&
            p.x < r.x + r.width + 65 &&
            p.y > r.y - 65 &&
            p.y < r.y + r.height + 65,
        ) ||
        WORLD.parcelRects.some(
          (r) =>
            p.x > r.x - 80 &&
            p.x < r.x + r.width + 80 &&
            p.y > r.y - 80 &&
            p.y < r.y + r.height + 80,
        ) ||
        WORLD.obstacles.some(
          (r) =>
            p.x > r.x - 100 &&
            p.x < r.x + r.width + 100 &&
            p.y > r.y - 100 &&
            p.y < r.y + r.height + 100,
        ) ||
        safe(p.x, p.y) ||
        (p.x < 1800 && p.y < 840)
      )
        continue;
      const tree = i % 3 !== 0,
        key = tree ? "td-tree-" + (i % 4) : i % 2 ? "td-bush" : "td-rubble";
      this.add
        .image(p.x, p.y, key)
        .setOrigin(0.5, tree ? 0.83 : 0.8)
        .setScale(tree ? random.realInRange(0.65, 0.95) : 0.5)
        .setDepth(p.y);
    }
    for (let x = 170; x < 6400; x += 620)
      this.add
        .image(x, 830, "td-streetlamp")
        .setOrigin(0.5, 0.83)
        .setScale(0.75)
        .setDepth(830);
    for (const [i, p] of WORLD.scavengePoints.entries()) {
      this.add
        .image(p.x, p.y, i % 2 ? "trash" : "dumpster")
        .setOrigin(0.5, 0.8)
        .setScale(0.65)
        .setDepth(p.y);
      this.add
        .image(p.x + 58, p.y - 10, "td-pallet")
        .setOrigin(0.5, 0.8)
        .setScale(0.55)
        .setDepth(p.y - 10);
    }
    for (const p of [
      { x: 800, y: 830 },
      { x: 2010, y: 1120 },
      { x: 3810, y: 1980 },
    ])
      this.add
        .image(p.x, p.y, "vehicle")
        .setOrigin(0.5, 0.75)
        .setScale(0.55)
        .setDepth(p.y);
    // Decorative AI props stay outside roads, build parcels and interaction points.
    for (const p of [
      { key: "td-boxes", x: 1750, y: 660, scale: 0.6 },
      { key: "td-barricade", x: 2670, y: 790, scale: 0.65 },
      { key: "td-tires", x: 2100, y: 700, scale: 0.55 },
      { key: "td-shopping-cart", x: 1980, y: 690, scale: 0.65 },
      { key: "td-water-barrel", x: 1740, y: 745, scale: 0.55 },
      { key: "td-fence", x: 2050, y: 570, scale: 0.8 },
      { key: "td-campfire", x: 655, y: 735, scale: 0.4 },
    ]) {
      this.add
        .image(p.x, p.y, p.key)
        .setOrigin(0.5, 0.8)
        .setScale(p.scale)
        .setDepth(p.y);
    }
    for (const n of npcs) {
      this.add
        .image(n.x, n.y, n.key)
        .setOrigin(0.5, 0.82)
        .setScale(0.58)
        .setDepth(n.y);
      this.text(n.x, n.y - 73, n.name, 10).setDepth(n.y + 1);
    }
    this.preview = this.add
      .image(0, 0, "foundation-intact")
      .setOrigin(0.5, 0.5)
      .setAlpha(0.65)
      .setDepth(9000)
      .setVisible(false);
    this.previewText = this.text(0, 0, "", 12).setDepth(9002).setVisible(false);
    this.buildGuides = this.add.graphics().setDepth(9000);
    for (const key of Object.keys(manifest))
      if (key.startsWith("player-") && this.textures.exists(key))
        this.makeAnimations(key);
    this.cameras.main.setZoom(this.scale.width < 700 ? 0.84 : 1.03);
    this.cameras.main.centerOn(680, 640);
  }
  makeAnimations(key: string) {
    for (const [name, a] of Object.entries(manifest[key].animations) as [
      string,
      any,
    ][])
      if (!this.anims.exists(key + "-" + name))
        this.anims.create({
          key: key + "-" + name,
          frames: this.anims.generateFrameNumbers(key, {
            start: a.start,
            end: a.end,
          }),
          frameRate: a.fps,
          repeat: name === "death" ? 0 : -1,
        });
  }
  ensureAppearance(key: string) {
    if (this.loading.has(key) || !manifest[key]) return;
    this.loading.add(key);
    this.load.spritesheet(key, "/assets/" + manifest[key].file, {
      frameWidth: 128,
      frameHeight: 128,
    });
    this.load.once("filecomplete-spritesheet-" + key, () =>
      this.makeAnimations(key),
    );
    if (!this.load.isLoading()) this.load.start();
  }
  update(time: number, delta: number) {
    if (!this.staticBuilt) return;
    const typing = ["INPUT", "SELECT", "TEXTAREA"].includes(
      document.activeElement?.tagName || "",
    );
    if (self) {
      if (!typing) {
        for (const [key, name] of [
          ["TAB", "inventory"],
          ["C", "craft"],
          ["K", "skills"],
          ["B", "build"],
          ["J", "journal"],
          ["M", "map"],
          ["ENTER", "chat"],
        ])
          if (Phaser.Input.Keyboard.JustDown(this.keys[key])) toggle(name);
        if (Phaser.Input.Keyboard.JustDown(this.keys.E)) interact();
        if (Phaser.Input.Keyboard.JustDown(this.keys.R))
          send({ type: "reload" });
        if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
          panel = "";
          renderPanel();
        }
        for (const [i, key] of [
          "ONE",
          "TWO",
          "THREE",
          "FOUR",
          "FIVE",
          "SIX",
          "SEVEN",
          "EIGHT",
          "NINE",
          "ZERO",
        ].entries())
          if (Phaser.Input.Keyboard.JustDown(this.keys[key])) quick(i);
      }
      if (time - this.lastSend > 80) {
        const k = this.keys;
        send({
          type: "move",
          dir: typing
            ? 0
            : Number(k.D.isDown || k.RIGHT.isDown || hold.right) -
              Number(k.A.isDown || k.LEFT.isDown || hold.left),
          dirY: typing
            ? 0
            : Number(k.S.isDown || k.DOWN.isDown || hold.down) -
              Number(k.W.isDown || k.UP.isDown || hold.up),
          sprint: !typing && (k.SHIFT.isDown || hold.sprint),
          crouch: !typing && (k.CTRL.isDown || hold.crouch),
        });
        this.lastSend = time;
      }
      const cam = this.cameras.main;
      cam.scrollX = Phaser.Math.Linear(
        cam.scrollX,
        self.x - this.scale.width / cam.zoom / 2,
        0.09,
      );
      cam.scrollY = Phaser.Math.Linear(
        cam.scrollY,
        self.y - this.scale.height / cam.zoom / 2,
        0.09,
      );
    }
    const entities: any[] = [
      ...snapshot.players.map((p) => ({
        ...p,
        asset: appearanceKey() + "-" + facing(p),
        entity: "player",
      })),
      ...snapshot.structures
        .filter((s) => s.kind !== "roof")
        .map((s) => ({
          ...s,
          asset:
            s.kind +
            "-" +
            (s.hp <= 0
              ? "breached"
              : s.hp < PIECES[s.kind].hp * 0.5
                ? "damaged"
                : "intact"),
          entity: "structure",
        })),
      ...snapshot.bags.map((b) => ({ ...b, asset: "loot", entity: "bag" })),
    ];
    const ids = new Set(entities.map((e) => e.id));
    for (const [id, s] of this.sprites)
      if (!ids.has(id)) {
        s.destroy();
        this.sprites.delete(id);
        this.labels.get(id)?.destroy();
        this.labels.delete(id);
      }
    const near = nearest();
    for (const e of entities) {
      if (!this.textures.exists(e.asset)) {
        this.ensureAppearance(e.asset);
        continue;
      }
      let s = this.sprites.get(e.id);
      if (!s) {
        s = this.add.sprite(e.x, e.y, e.asset);
        this.sprites.set(e.id, s);
        this.labels.set(e.id, this.text(e.x, e.y - 65, "", 11));
      }
      const previous = { x: s.x, y: s.y };
      s.x = Phaser.Math.Linear(s.x, e.x, Math.min(1, delta / 70));
      s.y = Phaser.Math.Linear(s.y, e.y, Math.min(1, delta / 70));
      s.setDepth(
        e.kind === "foundation" ? -6000 : e.kind === "roof" ? e.y + 140 : s.y,
      );
      if (e.entity === "player") {
        const previousHealth = this.lastHealth.get(e.id);
        if (previousHealth !== undefined && e.health < previousHealth) {
          this.hurtUntil.set(e.id, Date.now() + 350);
          if (e.id === self?.id) this.cameras.main.shake(120, 0.001);
        }
        this.lastHealth.set(e.id, e.health);
        const moving = distance(previous, e) > 1;
        const state = e.dead
          ? "death"
          : (this.hurtUntil.get(e.id) || 0) > Date.now()
            ? "hurt"
            : e.attackAt > Date.now()
              ? e.weapon === "pistol"
                ? "firearm"
                : e.weapon === "bat"
                  ? "melee"
                  : "idle"
              : e.id === self?.id && (this.keys.CTRL.isDown || hold.crouch)
                ? "crouch"
                : moving
                  ? e.id === self?.id && (this.keys.SHIFT.isDown || hold.sprint)
                    ? "run"
                    : "walk"
                  : e.weapon === "pistol" && aim
                    ? "firearm"
                    : "idle";
        s.setOrigin(0.5, 0.82)
          .setScale(0.64)
          .play(e.asset + "-" + state, true);
        s.setAlpha(e.protected ? 0.82 : 1);
      } else {
        s.setTexture(e.asset).setOrigin(0.5, 0.65);
        if (e.entity === "structure") {
          const visual = constructionVisual(e.kind as Kind);
          s.setAngle(e.rotation || 0);
          s.setDisplaySize(visual.width, visual.height).setOrigin(
            visual.originX,
            visual.originY,
          );
        } else s.setScale(0.45);
        s.setAlpha(
          e.kind === "door" && e.open
            ? 0.3
            : e.kind === "roof" && self && distance(self, e) < 200
              ? 0.16
              : 1,
        );
      }
      s.setTint(
        e.id === near?.id
          ? 0xe1dda9
          : manifest[e.asset]?.damageVisual === "tint"
            ? 0xc88f76
            : 0xffffff,
      );
      const label = this.labels.get(e.id)!;
      label
        .setPosition(s.x, s.y - (e.entity === "player" ? 74 : 65))
        .setDepth(s.depth + 1)
        .setText(
          e.entity === "player"
            ? e.name + (e.id === self?.id ? " · YOU" : "")
            : e.id === near?.id
              ? e.entity === "bag"
                ? "PUBLIC LOOT"
                : nice(e.kind) +
                  " · " +
                  (e.kind === "foundation" ? "RAID PROOF" : e.hp + " HP")
              : "",
        )
        .setVisible(e.entity === "player" || e.id === near?.id);
      if (
        e.entity === "player" &&
        e.attackAt > (this.attackSeen.get(e.id) || 0) &&
        e.attackAt > Date.now() - 800
      ) {
        this.attackSeen.set(e.id, e.attackAt);
        const fx = this.add
          .image(
            s.x + e.facing * 38,
            s.y - 25 + e.facingY * 30,
            e.weapon === "pistol" ? "muzzle" : "hit",
          )
          .setScale(0.23)
          .setDepth(s.y + 4);
        this.tweens.add({
          targets: fx,
          alpha: 0,
          scale: 0.4,
          duration: 170,
          onComplete: () => fx.destroy(),
        });
      }
    }
    const building = panel === "build" && !!self;
    this.buildGuides.clear();
    this.preview.setVisible(building);
    this.previewText.setVisible(building);
    if (building) {
      const p = this.input.activePointer,
        point = snapBuildPoint(
          buildKind,
          { x: p.worldX, y: p.worldY },
          snapshot.structures.find((s) => s.id === foundation),
        ),
        reason = placementReason(
          self!,
          buildKind,
          point,
          snapshot.structures,
          foundation,
        );
      const guides = this.buildGuides,
        half = BUILDING.floorSize / 2;
      for (const floor of snapshot.structures.filter(
        (s) => s.kind === "foundation" && s.owner === self!.id,
      )) {
        const selected = floor.id === foundation;
        guides.lineStyle(
          selected ? 2 : 1,
          selected ? 0xd5c47d : 0x8fa68a,
          selected ? 0.9 : 0.4,
        );
        guides.strokeRect(floor.x - half, floor.y - half, half * 2, half * 2);
        guides.lineBetween(floor.x, floor.y - half, floor.x, floor.y + half);
        guides.lineBetween(floor.x - half, floor.y, floor.x + half, floor.y);
      }
      const color = reason ? 0xf0917b : 0xa1d6aa;
      const footprint = structureFootprint({ ...point, kind: buildKind });
      guides
        .fillStyle(color, 0.12)
        .fillRect(footprint.x, footprint.y, footprint.width, footprint.height);
      guides
        .lineStyle(2, color, 0.9)
        .strokeRect(
          footprint.x,
          footprint.y,
          footprint.width,
          footprint.height,
        );
      const visual = constructionVisual(buildKind);
      this.preview
        .setPosition(point.x, point.y)
        .setTexture(buildKind + "-intact")
        .setDisplaySize(visual.width, visual.height)
        .setAngle(point.rotation || 0)
        .setOrigin(visual.originX, visual.originY)
        .setTint(reason ? 0xf0917b : 0xa1d6aa);
      this.previewText
        .setPosition(point.x, point.y - 75)
        .setText(
          reason || "CLICK TO PLACE · " + PIECES[buildKind].wood + " WOOD",
        );
    }
  }
}
new Phaser.Game({
  scene: City,
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#6d7b58",
  scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
  render: { antialias: true },
});

function toggle(name: string) {
  if (!self) return;
  panel = panel === name ? "" : name;
  renderPanel();
}
function quick(index: number) {
  if (!self) return;
  const actions: (Action | undefined)[] = [
    { type: "consume", item: "water" },
    { type: "consume", item: "snack" },
    { type: "consume", item: "bandage" },
    { type: "equip", item: "fists" },
    { type: "equip", item: "bat" },
    { type: "equip", item: "pistol" },
    { type: "reload" },
    { type: "craft", item: "bat" },
  ];
  if (index < 8) send(actions[index]!);
  else toggle(index === 8 ? "build" : "inventory");
}
function attack(point?: Point) {
  if (!self) return;
  const range = self.weapon === "pistol" ? 560 : 90;
  const targets = [
    ...snapshot.players.filter((p) => p.id !== self!.id && !p.dead),
    ...snapshot.structures.filter(
      (s) => s.hp > 0 && s.kind !== "foundation" && s.kind !== "roof",
    ),
  ].filter((t) => distance(t, self!) <= range);
  targets.sort(
    (a, b) => distance(a, point || self!) - distance(b, point || self!),
  );
  const target = targets[0];
  if (!target) return notice("No target in range.");
  if (point && distance(target, point) > 140)
    return notice("Click closer to your target.");
  send({ type: "aim", x: target.x, y: target.y });
  send({ type: "attack", target: target.id, weapon: self.weapon });
}
function drawMap(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  const sx = canvas.width / WORLD.width,
    sy = canvas.height / WORLD.height;
  ctx.fillStyle = "#6d795a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#82916b";
  ctx.lineWidth = 0.5;
  for (let x = 0; x < canvas.width; x += canvas.width / 8) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += canvas.height / 5) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  for (const r of WORLD.roads) {
    ctx.fillStyle = "#b4ad8b";
    ctx.fillRect(r.x * sx, r.y * sy, r.width * sx, r.height * sy);
  }
  for (const r of WORLD.obstacles) {
    ctx.fillStyle = "#424f47";
    ctx.fillRect(
      r.x * sx,
      r.y * sy,
      Math.max(1, r.width * sx),
      Math.max(1, r.height * sy),
    );
  }
  for (const r of WORLD.parcelRects) {
    ctx.fillStyle = "#9d9067";
    ctx.fillRect(r.x * sx, r.y * sy, r.width * sx, r.height * sy);
  }
  ctx.fillStyle = "#90bc88";
  const s = WORLD.safeRect;
  ctx.fillRect(s.x * sx, s.y * sy, s.width * sx, s.height * sy);
  for (const p of snapshot.players) {
    ctx.fillStyle = p.id === self?.id ? "#f1dfaa" : "#90cbd2";
    ctx.beginPath();
    ctx.arc(p.x * sx, p.y * sy, p.id === self?.id ? 3 : 2, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const s of snapshot.structures) {
    ctx.fillStyle = s.owner === self?.id ? "#dfb779" : "#b48764";
    ctx.fillRect(s.x * sx - 1, s.y * sy - 1, 2, 2);
  }
}
function meter(name: string, value: number, color: string) {
  return `<div class="meter"><div><span>${name}</span><b>${Math.ceil(value)}<small> / 100</small></b></div><div class="track"><i style="width:${Math.max(0, Math.min(100, value))}%;--meter:${color}"></i></div></div>`;
}
let lastPanelKey = "";
function renderHud() {
  if (!self) return;
  const p = self;
  $("#game-ui").hidden = false;
  $("#auth").hidden = true;
  $("#death").hidden = !p.dead;
  const time = Math.floor((snapshot.clock / 3600) * 24 * 60),
    hours = Math.floor(time / 60)
      .toString()
      .padStart(2, "0"),
    minutes = (time % 60).toString().padStart(2, "0");
  $("#connection").innerHTML =
    `<i class="live"></i><span>CONNECTED · ${snapshot.players.length} NEARBY</span><button data-ui="logout" title="Sign out">EXIT</button>`;
  $("#world-status").innerHTML =
    `<span class="zone-label">${safe(p.x, p.y) ? "THE HAVEN <b>SAFE ZONE</b>" : 'THE BLOCK <b class="danger">OPEN PVP</b>'}</span><span>${hours}:${minutes} <i>·</i> ${p.temperature.toFixed(0)}°C <i>·</i> $${p.cash}</span>`;
  $("#vitals").innerHTML =
    `<div class="player-name"><b>${esc(p.name)}</b><span>${p.weapon === "fists" ? "UNARMED" : nice(p.weapon)}${p.weapon === "pistol" ? " · " + p.ammo + "/6" : ""}</span></div>${meter("HEALTH", p.health, "#b95b4d")}${meter("ENERGY", p.energy, "#c6a858")}`;
  $("#needs").innerHTML =
    meter("FOOD", p.hunger, "#8fa269") + meter("WATER", p.thirst, "#6f9da9");
  const slots = [
    ["water", "Water", "1"],
    ["snack", "Snack", "2"],
    ["bandage", "Bandage", "3"],
    ["ui-fists", "Fists", "4"],
    ["bat", "Bat", "5"],
    ["pistol", "Pistol", "6"],
    ["ammo", "Reload", "7"],
    ["ui-craft", "Craft bat", "8"],
    ["ui-build", "Build", "9"],
    ["ui-inventory", "Backpack", "0"],
  ];
  $("#hotbar").innerHTML = slots
    .map(
      ([key, name, num], i) =>
        `<button data-quick="${i}" class="${p.weapon === ["", "", "", "fists", "bat", "pistol"][i] ? "active" : ""}" title="${name} · ${num}">${img(key)}<kbd>${num}</kbd><b>${i < 3 || i === 4 || i === 5 ? p.inventory[key as Item] || "" : i === 6 ? p.ammo : ""}</b></button>`,
    )
    .join("");
  $("#coordinates").textContent =
    `${Math.round(p.x)} E / ${Math.round(p.y)} S · M MAP`;
  drawMap($("#minimap") as HTMLCanvasElement);
  const built = snapshot.structures.some(
    (s) => s.kind === "foundation" && s.owner === p.id,
  );
  const wood = (p.inventory.wood || 0) > 0;
  $("#objective").innerHTML =
    `<span class="eyebrow">A FOOTHOLD IN THE CITY</span><b>${built ? "Make it your home" : wood ? "Lay your first floor" : "Scavenge the neighborhood"}</b><p>${built ? "Build walls and a door on your floors, then add storage." : wood ? "Find vacant ground east of the crossing." : "Search alley containers or buy wood at the store."}</p><button data-ui="journal">J <span>SURVIVAL JOURNAL</span> ↗</button>`;
  const near = nearest();
  $("#context").innerHTML = near
    ? `<button data-ui="interact"><kbd>E</kbd><span><b>${esc(near.title)}</b><small>${esc(near.hint)}</small></span></button>`
    : "";
  const key = JSON.stringify([
    panel,
    p.inventory,
    p.weapon,
    p.ammo,
    Object.values(p.skills).map(Math.floor),
    snapshot.structures.map((s) => [s.id, s.hp, s.open, s.inventory]),
    snapshot.bags,
  ]);
  if (
    panel &&
    key !== lastPanelKey &&
    !$("#panel").contains(document.activeElement)
  ) {
    lastPanelKey = key;
    renderPanel();
  }
}

function renderPanel() {
  const el = $("#panel");
  el.hidden = !panel;
  if (!panel || !self) return;
  const p = self;
  let title = "",
    subtitle = "",
    html = "";
  if (panel === "inventory") {
    title = "Inventory & equipment";
    subtitle = "WHAT YOU CARRY IS WHAT YOU RISK";
    const entries = Object.entries(p.inventory) as [Item, number][];
    if (!p.inventory[selectedItem] && entries[0]) selectedItem = entries[0][0];
    const n = p.inventory[selectedItem] || 0;
    const weight = entries.reduce(
      (sum, [k, n]) => sum + ITEMS[k].weight * n,
      0,
    );
    html = `<div class="inventory-layout"><aside class="character-card"><div class="portrait" style="background-image:url('/assets/${appearanceKey()}-south.png')"></div><h4>${esc(p.name)}</h4><span class="character-class">SURVIVOR · NO CLASS</span><div class="equipment-slot">${img("backpack")}<span>${p.equipped.backpack ? "Worn backpack" : "No backpack equipped"}<small>8 carrying slots</small></span></div><div class="equipment-slot">${img(p.weapon === "fists" ? "ui-fists" : p.weapon)}<span>${nice(p.weapon)}<small>${p.weapon === "pistol" ? p.ammo + "/6 loaded" : "Active weapon"}</small></span></div><div class="wallet"><span>Carried cash</span><b>$${p.cash}</b><small>Banked $${p.bank} · stays after death</small></div></aside><div class="bag-content"><div class="bag-meta"><b>BACKPACK</b><span>${entries.length}/8 slots · ${weight.toFixed(1)}/65 kg</span></div><div class="inventory-grid">${Array.from(
      { length: 8 },
      (_, i) => {
        const e = entries[i];
        return e
          ? `<button data-item="${e[0]}" class="item-slot ${selectedItem === e[0] ? "selected" : ""}" title="${nice(e[0])}">${img(e[0])}<span>${nice(e[0])}</span><b>${e[1]}</b></button>`
          : `<div class="item-slot empty"><span>EMPTY</span></div>`;
      },
    ).join(
      "",
    )}</div><div class="item-details">${n ? `${img(selectedItem)}<div><h4>${nice(selectedItem)}</h4><p>${n} carried · ${(ITEMS[selectedItem].weight * n).toFixed(1)} kg</p><div class="button-row">${["water", "snack", "bandage"].includes(selectedItem) ? btn("Use one", { type: "consume", item: selectedItem as any }) : ""}${["bat", "pistol"].includes(selectedItem) ? btn("Equip", { type: "equip", item: selectedItem as any }) : ""}${btn("Drop one", { type: "drop", item: selectedItem })}</div></div>` : "<p>Your backpack is empty. Find supplies in the city.</p>"}</div><p class="warning-note">On death, all carried items, equipped gear and cash become public loot.</p></div></div>`;
  } else if (panel === "craft") {
    title = "Crafting";
    subtitle = "MAKE SOMETHING USEFUL";
    html = `<div class="recipe featured-recipe">${img("bat")}<div><span class="eyebrow">HANDCRAFT / MELEE</span><h4>Wooden bat</h4><p>A simple close-range weapon. Crafted by hand.</p><span class="recipe-cost">${img("wood")} ${p.inventory.wood || 0} / 3 wood</span></div>${btn("Craft bat", { type: "craft", item: "bat" }, (p.inventory.wood || 0) < 3)}</div><h4 class="section-label">SHELTER & STORAGE</h4><div class="recipe-grid">${BUILD_KINDS.map((k) => `<button class="recipe-card" data-open-build="${k}">${img(k + "-intact")}<b>${nice(k)}</b><span>${PIECES[k].wood} wood · place on valid ground</span><small>OPEN BUILD MODE ↗</small></button>`).join("")}</div>`;
  } else if (panel === "build") {
    title = "Construction";
    subtitle = "A PLACE WORTH DEFENDING";
    html = `<p class="panel-intro">Place floors first, then select a floor and snap walls and doors along its edges, with storage inside. Floors can join edge to edge. Green is valid; red explains what is blocked. WASD keeps you moving while building.</p><div class="build-options">${BUILD_KINDS.map((k) => `<button data-kind="${k}" class="${buildKind === k ? "selected" : ""}">${img(k + "-intact")}<b>${nice(k)}</b><span>${PIECES[k].wood} wood</span></button>`).join("")}</div><div class="construction-info"><div><span class="eyebrow">${nice(buildKind)}</span><h4>${buildKind === "foundation" ? "Raid-proof floor" : PIECES[buildKind].hp + " structure HP"}</h4><p>${buildKind === "foundation" ? "A two-by-two floor tile. Join floors edge to edge to expand your base." : "Walls and doors snap along floor edges; storage fits inside the floor."}</p></div><b>${p.inventory.wood || 0}<small>WOOD AVAILABLE</small></b></div><label>Build on floor<select id="foundation"><option value="">Select your floor</option>${snapshot.structures
      .filter((s) => s.kind === "foundation" && s.owner === p.id)
      .sort((a, b) => distance(a, p) - distance(b, p))
      .map(
        (s) =>
          `<option value="${s.id}" ${foundation === s.id ? "selected" : ""}>${s.x} E / ${s.y} S · ${Math.round(distance(s, p))}px away</option>`,
      )
      .join(
        "",
      )}</select></label><p class="warning-note">Roads, public buildings and the shelter stay protected. Bases can be raided while you are offline.</p>`;
  } else if (panel === "skills") {
    title = "Character & skills";
    subtitle = "LEARN BY DOING";
    html = `<div class="skill-header"><div class="portrait" style="background-image:url('/assets/${appearanceKey()}-south.png')"></div><div><h4>${esc(p.name)}</h4><p>Explore, craft, trade and survive to gain field experience.<br>Learned skills persist through death.</p></div></div><div class="skill-grid">${Object.entries(
      p.skills,
    )
      .map(
        ([k, xp]) =>
          `<div class="skill-card"><span>${nice(k)}</span><b>${Math.floor(xp / 10) + 1}<small>LEVEL</small></b><div class="track"><i style="width:${(xp % 10) * 10}%;--meter:#b3a26b"></i></div><small>${xp.toFixed(1)} FIELD EXPERIENCE</small></div>`,
      )
      .join("")}</div>`;
  } else if (panel === "journal") {
    title = "Survival journal";
    subtitle = "YOUR FIRST FOOTHOLD";
    html = `<div class="journal-intro"><span class="chapter">01</span><div><h4>Make a life in The Block</h4><p>The shelter is a beginning. What you build beyond it is yours to protect.</p></div></div><ol class="journal-tasks">${[
      [
        p.skills.scavenging > 0,
        "Search the alleys",
        "Walk east to abandoned containers. Press E to search.",
      ],
      [
        (p.inventory.wood || 0) > 0 || p.skills.crafting > 0,
        "Gather building materials",
        "Keep wood for your base. Sell spare recyclables to Otis.",
      ],
      [
        snapshot.structures.some(
          (s) => s.kind === "foundation" && s.owner === p.id,
        ),
        "Claim a foothold",
        "Find the vacant grounds south-east of the main crossing. Open B to build.",
      ],
    ]
      .map(
        ([done, name, text]) =>
          `<li class="${done ? "done" : ""}"><i>${done ? "✓" : "·"}</i><div><h4>${name}</h4><p>${text}</p></div></li>`,
      )
      .join(
        "",
      )}</ol><div class="field-notes"><h4>Know the rules</h4><p>Eat and drink before your supplies run dry. The Haven protects everyone inside. Outside, combat is open. Death drops all carried gear and cash immediately. Your skills, bank and buildings remain. Walls and doors protect a base only while they stand.</p></div>`;
  } else if (panel === "map") {
    title = "The Block";
    subtitle = "DISTRICT 01 / SHARED CITY";
    html = `<canvas id="district-map" width="760" height="380"></canvas><div class="map-legend"><span><i class="safe"></i> Shelter</span><span><i class="vacant"></i> Buildable ground</span><span><i class="you"></i> You</span><span><i class="players"></i> Nearby survivors</span></div><p class="panel-intro">Corner Mart (${WORLD.storePoint.x}, ${WORLD.storePoint.y}) · Scrap Exchange (${WORLD.traderPoint.x}, ${WORLD.traderPoint.y})<br>Vacant ground lies east of the north/south crossing. Roads and public buildings cannot be claimed.</p>`;
  } else if (panel === "chat") {
    title = "Neighborhood chat";
    subtitle = "THE BLOCK / LIVE";
    html = `<div id="chat-log">${chat.map((c) => `<p><b>${esc(c.name)}</b><span>${esc(c.text)}</span></p>`).join("") || '<p class="muted">No messages yet. Say hello to the neighborhood.</p>'}</div><form id="chat-form"><input name="text" maxlength="160" placeholder="Message the neighborhood…" autocomplete="off" required><button>Send</button></form>`;
  } else if (panel.startsWith("store") || panel.startsWith("trader")) {
    const sell = panel.startsWith("trader");
    title = sell ? "Scrap Exchange" : "Corner Mart";
    subtitle = sell ? "OTIS / RECYCLABLES BUYER" : "MARA / EVERYDAY SUPPLIES";
    html = `<div class="merchant-summary"><p>${sell ? "Nothing useful goes to waste." : "A little preparation goes a long way."}</p><b>$${p.cash}<small>CARRIED CASH</small></b></div><div class="merchant-grid">${(sell ? Object.keys(p.inventory) : ["water", "snack", "bandage", "wood", "pistol", "ammo"]).map((k) => `<div class="merchant-item">${img(k)}<div><h4>${nice(k)}</h4><small>${p.inventory[k as Item] || 0} in your backpack</small></div>${btn((sell ? "Sell 1 · $" : "Buy 1 · $") + ITEMS[k as Item].price * (sell ? 1 : 2), { type: "trade", item: k as Item, sell })}</div>`).join("") || "<p>Your backpack is empty.</p>"}</div>`;
  } else {
    const id = panel.split(":")[1],
      s = snapshot.structures.find((s) => s.id === id),
      b = snapshot.bags.find((b) => b.id === id),
      c = s || b;
    title = s ? nice(s.kind) : "Public loot";
    subtitle = s
      ? s.owner === p.id
        ? "YOUR PROPERTY"
        : "PLAYER PROPERTY / RAID ACCESS"
      : "FIRST COME, FIRST SERVED";
    if (!c) html = "<p>The container is empty or out of reach.</p>";
    else {
      html = `<div class="container-heading">${img(s ? s.kind + "-" + (s.hp <= 0 ? "breached" : "intact") : "loot")}<div><h4>${s ? (s.kind === "foundation" ? "Raid immune" : s.hp + " HP") : "No claim timer"}</h4><p>${s ? "Walk through open doors. Closed walls block access to storage." : "All contents are immediately available to anyone nearby."}</p></div></div><div class="container-grid">${Object.entries(
        c.inventory,
      )
        .map(
          ([k, n]) =>
            `<div class="merchant-item">${img(k)}<div><h4>${nice(k)}</h4><small>× ${n}</small></div>${btn("Take one", { type: "loot", id, item: k as Item })}</div>`,
        )
        .join(
          "",
        )}${c.cash ? btn("Take $" + c.cash, { type: "loot", id, item: "cash" }) : ""}</div>`;
      if (s && s.owner === p.id) {
        if (s.kind === "door")
          html += btn(s.open ? "Close door" : "Open door", {
            type: "door",
            id,
          });
        if (s.kind === "storage")
          html +=
            '<h4 class="section-label">STORE AN ITEM</h4><div class="button-row">' +
            Object.keys(p.inventory)
              .map((k) =>
                btn("Store " + nice(k), { type: "store", id, item: k as Item }),
              )
              .join("") +
            "</div>";
        html +=
          '<div class="button-row">' +
          btn("Repair · 2 wood", { type: "repair", id }) +
          btn("Dismantle", { type: "dismantle", id }) +
          "</div>";
      }
      if (s && s.kind !== "foundation")
        html += btn("Attack structure", {
          type: "attack",
          target: id,
          weapon: p.weapon,
        });
    }
  }
  el.classList.toggle("build-panel", panel === "build");
  el.innerHTML = `<header class="panel-header"><div><span class="eyebrow">${subtitle}</span><h3>${title}</h3></div><button data-ui="close" class="close" aria-label="Close panel">× <kbd>ESC</kbd></button></header><div class="panel-body">${html}</div>`;
  for (const b of document.querySelectorAll<HTMLElement>("#top-tools button"))
    b.classList.toggle("active", b.dataset.ui === panel);
  if (panel === "map") drawMap($("#district-map") as HTMLCanvasElement);
}

const serverUrl = String(
  (import.meta as any).env.VITE_SERVER_URL || "http://localhost:2567",
).replace(/\/+$/, "");
async function connect(token: string) {
  const res = await fetch(serverUrl + "/world");
  if (!res.ok)
    throw Error("The city is starting. Please try again in a moment.");
  const city = await res.json();
  if (city.version !== VERSION)
    throw new Error("The city is updating. Refresh this page in a moment.");
  room = await new Client(serverUrl.replace(/^http/, "ws")).joinById(
    city.roomId,
    { token },
  );
  seq = 0;
  room.onMessage("welcome", (data) => {
    serverOffset = data.serverTime - Date.now();
    if (data.version && data.version !== VERSION)
      notice("The city is updating. Refresh this page.");
  });
  room.onMessage("snapshot", (s) => {
    self = s.self;
    snapshot = s;
    renderHud();
    if (
      !snapshot.structures.some(
        (s) => s.id === foundation && s.owner === self!.id,
      )
    ) {
      foundation =
        snapshot.structures
          .filter((s) => s.kind === "foundation" && s.owner === self!.id)
          .sort((a, b) => distance(a, self!) - distance(b, self!))[0]?.id || "";
    }
  });
  room.onMessage("notice", notice);
  room.onMessage("chat", (c) => {
    chat.push({ ...c, at: Date.now() });
    if (chat.length > 40) chat.shift();
    $("#chat-feed").innerHTML = chat
      .slice(-4)
      .map((c) => `<p><b>${esc(c.name)}</b> ${esc(c.text)}</p>`)
      .join("");
    if (panel === "chat") {
      const text = ($("#chat-form input") as HTMLInputElement)?.value || "";
      renderPanel();
      const input = $("#chat-form input") as HTMLInputElement;
      input.value = text;
      input.focus();
    }
  });
  room.onLeave(() => {
    $("#auth").hidden = false;
    $("#game-ui").hidden = true;
    $("#death").hidden = true;
    self = undefined;
    room = undefined;
    panel = "";
    $("#panel").hidden = true;
    snapshot = { players: [], structures: [], bags: [], clock: 0 };
    $("#connection").innerHTML = "<i></i><span>DISCONNECTED</span>";
    notice("Disconnected. Sign in to return to your character.");
  });
}
$("#login").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target as HTMLFormElement,
    data = new FormData(form),
    button = (event as SubmitEvent).submitter as HTMLButtonElement;
  $("#auth-error").textContent = "Connecting to The Block…";
  try {
    const res = await fetch(serverUrl + "/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        password: data.get("password"),
        register: button.value === "true",
        appearance: {
          skin: "#c98c62",
          hair: "#252939",
          top: "#ec8753",
          body: "standard",
          style: "short",
        },
      }),
    });
    const body = await res.json();
    if (!res.ok) throw Error(body.error);
    await connect(body.token);
    $("#auth-error").textContent = "";
  } catch (e) {
    $("#auth-error").textContent =
      e instanceof Error ? e.message : "Connection failed";
  }
});
document.addEventListener("click", (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>("button");
  if (!el) return;
  if (el.dataset.action) {
    const action = JSON.parse(el.dataset.action);
    if (action.type === "attack") {
      const target = snapshot.structures.find((s) => s.id === action.target);
      if (target) send({ type: "aim", x: target.x, y: target.y });
    }
    send(action);
    return;
  }
  if (el.dataset.quick) {
    quick(Number(el.dataset.quick));
    return;
  }
  if (el.dataset.item) {
    selectedItem = el.dataset.item as Item;
    renderPanel();
    return;
  }
  if (el.dataset.kind) {
    buildKind = el.dataset.kind as Kind;
    renderPanel();
    return;
  }
  if (el.dataset.openBuild) {
    buildKind = el.dataset.openBuild as Kind;
    panel = "build";
    renderPanel();
    return;
  }
  const ui = el.dataset.ui;
  if (ui === "close") {
    panel = "";
    renderPanel();
  } else if (ui === "interact") interact();
  else if (ui === "attack") attack();
  else if (ui === "logout") room?.leave();
  else if (ui) toggle(ui);
});
document.addEventListener("change", (e) => {
  if ((e.target as HTMLElement).id === "foundation")
    foundation = (e.target as HTMLSelectElement).value;
});
document.addEventListener("submit", (e) => {
  if ((e.target as HTMLElement).id === "chat-form") {
    e.preventDefault();
    const form = e.target as HTMLFormElement,
      text = new FormData(form).get("text") as string;
    if (text.trim()) send({ type: "chat", text: text.trim() });
    form.reset();
  }
});
$("#respawn").onclick = () => send({ type: "respawn" });
for (const el of document.querySelectorAll<HTMLElement>("[data-hold]")) {
  const key = el.dataset.hold as keyof typeof hold;
  el.onpointerdown = (e) => {
    hold[key] = true;
    el.setPointerCapture(e.pointerId);
  };
  el.onpointerup = () => (hold[key] = false);
  el.onpointercancel = () => (hold[key] = false);
}
window.addEventListener("blur", () => {
  for (const key of Object.keys(hold) as (keyof typeof hold)[])
    hold[key] = false;
  send({ type: "move", dir: 0, dirY: 0, sprint: false, crouch: false });
});
document.addEventListener("keydown", (event) => {
  if (
    self &&
    !["INPUT", "SELECT", "TEXTAREA"].includes(
      document.activeElement?.tagName || "",
    ) &&
    ["Tab", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
      event.key,
    )
  )
    event.preventDefault();
});
