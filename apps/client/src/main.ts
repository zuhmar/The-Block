import { MovementPrediction } from "./movement-prediction";
import {
  movementBlocked,
  type MovementInput,
} from "../../../packages/shared/src/movement";
import { renderProfile, defaultViewZoom, viewZoom } from "./render-quality";
import { DISTRICTS } from "../../../packages/shared/src/official-map";
import { setMapReservations } from "../../../packages/shared/src/terrain";
import { MapWorld } from "./map-world";
import { cartographySVG } from "../../../packages/game-data/cartography";
import Phaser from "phaser";
import { Client, type Room } from "colyseus.js";
import {
  WORLD,
  BUILD_KINDS,
  BUILD_BUDGET,
  BUILDING,
  structureFootprint,
  VERSION,
  ITEMS,
  PIECES,
  safe,
  inRect,
  distance,
  placementReason,
  type Action,
  type Player,
  type DogView,
  type ShotVisual,
  type Structure,
  type Bag,
  type Kind,
  type Item,
  type Point,
} from "../../../packages/shared/src/index";

import { DOG_RULES } from "../../../packages/game-data/wildlife";
import { lootCrateAt } from "../../../packages/game-data/loot-crates";
import { npcs } from "../../../packages/game-data/content";
import "./style.css";
import {
  characterAppearanceKey as appearanceKey,
  characterAtlas,
  characterState,
} from "./character-visuals";
import { constructionVisual } from "./construction-visuals";
import { constructionPlan, pointerToWorld } from "./world-pointer";

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
  )}</nav><section id="world-status"></section><button id="minimap-button" data-ui="map" aria-label="Open district map"><div class="map-heading"><span>THE BLOCK</span><b>N ↑</b></div><canvas id="minimap" width="200" height="200"></canvas><div id="coordinates"></div></button><aside id="objective"></aside><section id="vitals"></section><section id="needs"></section><div id="hotbar" aria-label="Quick actions"></div><div id="context"></div><div id="chat-feed" aria-live="polite"></div><div id="touch"><div class="dpad"><button data-hold="up" aria-label="Move north">▲</button><div><button data-hold="left" aria-label="Move west">◀</button><button data-hold="down" aria-label="Move south">▼</button><button data-hold="right" aria-label="Move east">▶</button></div></div><div class="touch-actions"><button data-hold="sprint">RUN</button><button data-hold="crouch">LOW</button><button data-ui="interact">E</button><button data-ui="attack">HIT</button></div></div><div id="key-help">W A S D <span>MOVE</span> · SHIFT <span>SPRINT</span> · E <span>INTERACT</span> · R <span>RELOAD</span></div></div><div id="notice" role="status"></div><section id="panel" hidden></section><div id="death" hidden><span class="eyebrow">LIFE ON THE BLOCK</span><h2>Left behind.</h2><p>Your carried gear and cash are now public loot.<br>Your skills, bank and property remain yours.</p><button id="respawn">Return to the shelter</button></div><div id="auth"><div class="auth-card"><div class="auth-mark"><span class="eyebrow">A PERSISTENT URBAN SANDBOX</span><h1>Make this<br>block <em>yours.</em></h1><p>Search the ruins. Craft your tools.<br>Build something worth protecting.</p></div><form id="login"><span class="eyebrow">YOUR LIFE ON THE BLOCK</span><h3>Step onto the street</h3><label>Street name<input name="name" autocomplete="username" placeholder="Your unique name" pattern="[a-zA-Z][a-zA-Z0-9_]{2,19}" required maxlength="20"></label><label>Password<input name="password" type="password" autocomplete="current-password" placeholder="At least 10 characters" minlength="10" maxlength="128" required></label><p class="character-style">Your survivor is a black stick figure. Make your name on the block.</p><button name="register" value="true" type="submit">Create character <span>↗</span></button><button class="secondary" name="register" value="false" type="submit">I already live here · Sign in</button><p id="auth-error" role="alert"></p><small>Start with 10,000 wood, $10, water and a snack.<br>Practice building. Wood uses no carry weight or carrying slot.</small></form><div class="auth-foot"><i></i> ONE SHARED CITY · NO PAID ADVANTAGES</div></div><aside class="auth-caption"><span>THE HAVEN / DISTRICT 01</span><b>A safe start.<br>An open world.</b><p>Leave the shelter when you’re ready.<br>The rest is up to you.</p></aside></div></main>`;
const $ = (s: string) => document.querySelector<HTMLElement>(s)!;
let room: Room | undefined,
  seq = 0,
  serverOffset = 0,
  self: Player | undefined;
let snapshot: {
  players: Player[];
  structures: Structure[];
  bags: Bag[];
  dogs?: DogView[];
  shots?: ShotVisual[];
  clock: number;
  moveAck?: number;
  mapReservations?: { x: number; y: number; width: number; height: number }[];
} = { players: [], structures: [], bags: [], clock: 0 };
let manifest: Record<string, any> = {},
  panel = "",
  buildKind: Kind = "foundation",
  foundation = "",
  selectedItem: Item = "water",
  noticeTimer: number;
const hold = {
  up: false,
  down: false,
  left: false,
  right: false,
  sprint: false,
  crouch: false,
};
let flushMovement = () => {};
let resetMovement = () => {};
const chat: { name: string; text: string; at: number }[] = [];
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const send = (action: Action) => {
  if (!room) return 0;
  const next = ++seq;
  room.send("intent", {
    v: VERSION,
    seq: next,
    requestId: crypto.randomUUID(),
    at: Date.now() + serverOffset,
    action,
  });
  return next;
};
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
function facing(p: Pick<Player, "facing" | "facingY">) {
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
      title: `T${lootCrateAt(index).tier} · ${lootCrateAt(index).name}`,
      type: "scavenge",
      index,
      hint:
        (self!.cooldowns[index] || 0) > Date.now() + serverOffset
          ? "Depleted · return later"
          : `Up to ${lootCrateAt(index).rolls} loot rolls · Press E to search`,
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

function lootVisualSize(index: number) {
  const crate = lootCrateAt(index),
    asset = manifest[crate.key];
  return {
    width: crate.size,
    height: (crate.size * asset.height) / asset.width,
  };
}

let renderRatio = renderProfile(
  window.innerWidth,
  window.innerHeight,
  window.devicePixelRatio,
).ratio;
class City extends Phaser.Scene {
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  sprites = new Map<string, Phaser.GameObjects.Sprite>();
  labels = new Map<string, Phaser.GameObjects.Text>();
  loading = new Set<string>();
  attackSeen = new Map<string, number>();
  attackAnimationSeen = new Map<string, number>();
  shotSeen = new Map<string, number>();
  lastHealth = new Map<string, number>();
  hurtUntil = new Map<string, number>();
  staticBuilt = false;
  mapWorld?: MapWorld;
  private cameraPlayer?: string;
  lastSend = 0;
  prediction = new MovementPrediction();
  movementSeq = 0;
  movementFacing?: { facing: number; facingY: number };
  movementInput: MovementInput = {
    dir: 0,
    dirY: 0,
    sprint: false,
    crouch: false,
  };
  predictionSnapshot: unknown;
  predictionFrameAt = 0;
  preview!: Phaser.GameObjects.Image;
  previewText!: Phaser.GameObjects.Text;
  buildGuides!: Phaser.GameObjects.Graphics;
  lootGuides!: Phaser.GameObjects.Graphics;
  lootProps = new Map<number, Phaser.GameObjects.Image>();
  lootLabels = new Map<number, Phaser.GameObjects.Text>();
  lastY = new Map<string, number>();
  constructor() {
    super("city");
  }
  preload() {
    this.load.json("manifest", "/assets/manifest.json");
  }
  create() {
    flushMovement = () => this.sendMovement();
    resetMovement = () => {
      this.prediction = new MovementPrediction();
      this.movementSeq = 0;
      this.movementFacing = undefined;
      this.predictionSnapshot = undefined;
      this.predictionFrameAt = 0;
      this.movementInput = { dir: 0, dirY: 0, sprint: false, crouch: false };
      this.cameraPlayer = "";
      for (const key of Object.keys(hold) as (keyof typeof hold)[])
        hold[key] = false;
    };
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
        send({ type: "aim", ...pointerToWorld(p, this.cameras.main) });
        return;
      }
      if (panel === "build") {
        const target = constructionPlan(
          p,
          this.cameras.main,
          buildKind,
          self.id,
          snapshot.structures,
          foundation,
        );
        send({
          type: "build",
          kind: buildKind,
          x: target.point.x,
          y: target.point.y,
          foundation: target.foundation,
        });
        return;
      }
      attack(pointerToWorld(p, this.cameras.main));
    });
    this.input.on(
      "wheel",
      (_p: unknown, _o: unknown, _dx: number, dy: number) => {
        if (panel) return;
        this.cameras.main.setZoom(
          viewZoom(this.cameras.main.zoom, renderRatio, dy) * renderRatio,
        );
      },
    );
  }
  text(x: number, y: number, text: string, size = 12, color = "#d6dbc7") {
    return this.add
      .text(x, y, text, {
        fontFamily: "Arial",
        fontSize: size,
        resolution: renderRatio,
        color,
        backgroundColor: "#24392cd9",
        padding: { x: 9, y: 5 },
        letterSpacing: 1,
      })
      .setOrigin(0.5, 1);
  }
  drawWorld() {
    this.staticBuilt = true;
    this.lootGuides = this.add.graphics().setDepth(WORLD.height + 1000);
    this.mapWorld = new MapWorld(this, renderRatio);
    this.mapWorld.update(this.cameras.main.worldView);
    this.events.once("shutdown", () => this.mapWorld?.destroy());
    for (const [i, p] of WORLD.scavengePoints.entries()) {
      const crate = lootCrateAt(i),
        visual = lootVisualSize(i);
      this.lootProps.set(
        i,
        this.add
          .image(p.x, p.y, crate.key)
          .setOrigin(0.5, 0.5)
          .setDisplaySize(visual.width, visual.height)
          .setDepth(p.y),
      );
      this.lootLabels.set(
        i,
        this.text(p.x, p.y - visual.height / 2 - 12, "", 10, crate.color)
          .setPadding(5, 3)
          .setDepth(WORLD.height + 1001),
      );
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
      .setDepth(WORLD.height + 2000)
      .setVisible(false);
    this.previewText = this.text(0, 0, "", 12)
      .setDepth(WORLD.height + 2002)
      .setVisible(false);
    this.buildGuides = this.add.graphics().setDepth(WORLD.height + 2000);
    for (const key of Object.keys(manifest))
      if (manifest[key].animations && this.textures.exists(key))
        this.makeAnimations(key);
    this.cameras.main.setZoom(
      defaultViewZoom(this.scale.width / renderRatio) * renderRatio,
    );
    this.cameras.main.centerOn(WORLD.spawn.x, WORLD.spawn.y);
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
          repeat: ["death", "attack", "melee", "firearm"].includes(name)
            ? 0
            : -1,
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
  combatEffect(key: string, x: number, y: number, size: number, rotation = 0) {
    const effect = this.add
      .image(x, y, key)
      .setDisplaySize(size, size)
      .setRotation(rotation)
      .setDepth(8502);
    this.tweens.add({
      targets: effect,
      alpha: 0,
      duration: 180,
      onComplete: () => effect.destroy(),
    });
  }
  drawShots() {
    const now = Date.now() + serverOffset;
    for (const [id, at] of this.shotSeen)
      if (now - at > 5000) this.shotSeen.delete(id);
    for (const shot of snapshot.shots || []) {
      if (this.shotSeen.has(shot.id) || now - shot.at > 800) continue;
      this.shotSeen.set(shot.id, shot.at);
      const length = distance(shot.from, shot.to) || 1,
        dx = (shot.to.x - shot.from.x) / length,
        dy = (shot.to.y - shot.from.y) / length;
      const start = { x: shot.from.x + dx * 26, y: shot.from.y - 24 + dy * 8 },
        end = { x: shot.to.x, y: shot.to.y - 24 };
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      this.combatEffect("fx-muzzle", start.x, start.y, 24, angle);
      const bullet = this.add
        .image(start.x, start.y, "projectile-bullet")
        .setDisplaySize(32, 32)
        .setRotation(angle)
        .setDepth(8502);
      this.tweens.add({
        targets: bullet,
        x: end.x,
        y: end.y,
        duration: Math.max(35, Math.min(260, (length / 2200) * 1000)),
        onComplete: () => {
          bullet.destroy();
          this.combatEffect("fx-bullet-impact", end.x, end.y, 26);
        },
      });
    }
  }
  drawLootHints() {
    const graphics = this.lootGuides.clear(),
      now = Date.now() + serverOffset;
    for (const [index, p] of WORLD.scavengePoints.entries()) {
      const crate = lootCrateAt(index),
        remaining = Math.max(0, (self?.cooldowns[index] || 0) - now);
      const depleted = remaining > 0,
        nearby = !!self && distance(self, p) < 650,
        close = !!self && distance(self, p) < 150;
      const visual = lootVisualSize(index);
      const color = depleted ? 0x90958a : parseInt(crate.color.slice(1), 16);
      this.lootProps.get(index)?.setAlpha(depleted ? 0.42 : 1);
      this.lootLabels
        .get(index)
        ?.setVisible(nearby)
        .setColor(depleted ? "#b5b8ac" : crate.color)
        .setText(
          `T${crate.tier} · ${depleted ? "EMPTY " + Math.ceil(remaining / 1000) + "s" : close ? "E SEARCH" : "LOOT"}`,
        );
      graphics
        .lineStyle(2, color, depleted ? 0.35 : 0.9)
        .strokeRoundedRect(
          p.x - visual.width / 2 - 5,
          p.y - visual.height / 2 - 5,
          visual.width + 10,
          visual.height + 10,
          8,
        );
      if (!depleted)
        graphics
          .fillStyle(color, 1)
          .fillTriangle(
            p.x,
            p.y - visual.height / 2 - 4,
            p.x - 4,
            p.y - visual.height / 2 - 10,
            p.x + 4,
            p.y - visual.height / 2 - 10,
          );
    }
    for (const dog of snapshot.dogs || []) {
      if (dog.health <= 0 || !self || distance(self, dog) > 500) continue;
      graphics.fillStyle(0x3b2926, 0.9).fillRect(dog.x - 18, dog.y - 57, 36, 4);
      graphics
        .fillStyle(0xd88168, 1)
        .fillRect(
          dog.x - 18,
          dog.y - 57,
          (36 * Math.max(0, dog.health)) / DOG_RULES.health,
          4,
        );
    }
    for (const bag of snapshot.bags) {
      graphics.lineStyle(2, 0xf1d68c, 0.9).strokeCircle(bag.x, bag.y, 27);
    }
  }
  readMovement(): MovementInput {
    const typing = ["INPUT", "SELECT", "TEXTAREA"].includes(
        document.activeElement?.tagName || "",
      ),
      k = this.keys;
    return {
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
    };
  }
  sendMovement() {
    if (!self || !room) return;
    this.movementInput = this.readMovement();
    if (this.movementInput.dir || this.movementInput.dirY)
      this.movementFacing = {
        facing: this.movementInput.dir,
        facingY: this.movementInput.dirY,
      };
    this.movementSeq = send({ type: "move", ...this.movementInput });
  }
  update(time: number, delta: number) {
    if (!this.staticBuilt) return;
    this.mapWorld?.setReservations(snapshot.mapReservations || []);
    this.mapWorld?.update(this.cameras.main.worldView);
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
      const input = this.readMovement();
      if (
        time - this.lastSend > 80 ||
        JSON.stringify(input) !== JSON.stringify(this.movementInput)
      ) {
        this.sendMovement();
        this.lastSend = time;
      }
      const movementNow = performance.now();
      const movementDt = this.predictionFrameAt
        ? (movementNow - this.predictionFrameAt) / 1000
        : delta / 1000;
      this.predictionFrameAt = movementNow;
      const blocked = (p: Point) => movementBlocked(snapshot.structures, p);
      if (this.predictionSnapshot !== snapshot) {
        this.prediction.reconcile(self, snapshot.moveAck, movementNow, blocked);
        this.predictionSnapshot = snapshot;
      }
      const displayed = this.prediction.update(
        input,
        this.movementSeq,
        movementDt,
        movementNow,
        blocked,
      );
      const cam = this.cameras.main;
      const follow = 1 - Math.exp(-Math.min(0.1, Math.max(0, movementDt)) * 6);
      if (this.cameraPlayer !== self.id) {
        cam.centerOn(displayed.x, displayed.y);
        this.cameraPlayer = self.id;
      }
      cam.scrollX = Phaser.Math.Linear(
        cam.scrollX,
        displayed.x - cam.width / 2,
        follow,
      );
      cam.scrollY = Phaser.Math.Linear(
        cam.scrollY,
        displayed.y - cam.height / 2,
        follow,
      );
    }
    const localFacing =
      this.movementSeq > (snapshot.moveAck || 0)
        ? this.movementFacing
        : undefined;
    const entities: any[] = [
      ...snapshot.players.map((p) => {
        const visual =
          p.id === self?.id && snapshot.moveAck !== undefined
            ? { ...p, ...this.prediction.position(), ...localFacing }
            : p;
        return {
          ...visual,
          asset: characterAtlas(p.weapon, facing(visual)),
          entity: "player",
        };
      }),
      ...(snapshot.dogs || []).map((d) => ({
        ...d,
        asset: `dog-stray-${facing(d)}`,
        entity: "dog",
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
        this.attackAnimationSeen.delete(id);
        this.attackSeen.delete(id);
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
      const ownPredicted =
        e.entity === "player" &&
        e.id === self?.id &&
        snapshot.moveAck !== undefined;
      s.x = ownPredicted
        ? e.x
        : Phaser.Math.Linear(s.x, e.x, Math.min(1, delta / 70));
      s.y = ownPredicted
        ? e.y
        : Phaser.Math.Linear(s.y, e.y, Math.min(1, delta / 70));
      s.setDepth(
        e.kind === "foundation" ? -6000 : e.kind === "roof" ? e.y + 140 : s.y,
      );
      if (e.entity === "dog") {
        const now = Date.now() + serverOffset;
        const state =
          e.health <= 0
            ? "death"
            : e.hurtUntil > now
              ? "hurt"
              : e.attackUntil > now
                ? "attack"
                : e.state === "chase"
                  ? "run"
                  : e.state === "walk"
                    ? "walk"
                    : "idle";
        const animation = e.asset + "-" + state;
        s.setOrigin(0.5, 0.82)
          .setScale(0.55)
          .setAlpha(e.health <= 0 ? 0.55 : 1);
        if (
          s.anims.currentAnim?.key !== animation ||
          (state !== "attack" && state !== "death")
        )
          s.play(animation, true);
        if (
          e.attackAt > (this.attackSeen.get(e.id) || 0) &&
          now - e.attackAt < 800
        ) {
          this.attackSeen.set(e.id, e.attackAt);
          const attackAt = e.attackAt;
          this.time.delayedCall(
            Math.max(0, attackAt + DOG_RULES.windupMs - now),
            () => {
              const dog = snapshot.dogs?.find((d) => d.id === e.id);
              if (dog && dog.health > 0 && dog.attackAt === attackAt)
                this.combatEffect(
                  "fx-bite",
                  dog.x + dog.facing * 18,
                  dog.y - 18 + dog.facingY * 8,
                  24,
                );
            },
          );
        }
      } else if (e.entity === "player") {
        const previousHealth = this.lastHealth.get(e.id);
        if (previousHealth !== undefined && e.health < previousHealth) {
          this.hurtUntil.set(e.id, Date.now() + 350);
          if (e.id === self?.id) this.cameras.main.shake(120, 0.001);
        }
        this.lastHealth.set(e.id, e.health);
        const moving = distance(previous, e) > 1;
        const state = characterState(e, {
          now: Date.now(),
          moving,
          hurt: (this.hurtUntil.get(e.id) || 0) > Date.now(),
          crouching:
            e.id === self?.id && (this.keys.CTRL.isDown || hold.crouch),
          sprinting:
            e.id === self?.id && (this.keys.SHIFT.isDown || hold.sprint),
        });
        const animation = e.asset + "-" + state,
          attacking = state === "melee" || state === "firearm";
        const newAttack =
          attacking && this.attackAnimationSeen.get(e.id) !== e.attackAt;
        if (newAttack) this.attackAnimationSeen.set(e.id, e.attackAt);
        s.setOrigin(0.5, 0.82).setScale(0.64);
        if (
          newAttack ||
          s.anims.currentAnim?.key !== animation ||
          (!attacking && state !== "death")
        )
          s.play(animation, !newAttack);
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
        .setPosition(
          s.x,
          s.y -
            (e.entity === "player"
              ? 74
              : e.entity === "bag"
                ? 36
                : e.entity === "dog"
                  ? 62
                  : 65),
        )
        .setDepth(s.depth + 1)
        .setColor(e.entity === "dog" ? "#e6a38d" : "#d6dbc7")
        .setText(
          e.entity === "player"
            ? e.name + (e.id === self?.id ? " · YOU" : "")
            : e.entity === "dog"
              ? e.health > 0
                ? "STRAY DOG"
                : "DOWN"
              : e.entity === "bag"
                ? "LOOT BAG"
                : e.id === near?.id
                  ? nice(e.kind) +
                    " · " +
                    (e.kind === "foundation" ? "RAID PROOF" : e.hp + " HP")
                  : "",
        )
        .setVisible(
          e.entity === "player" ||
            e.id === near?.id ||
            (e.entity === "bag" && !!self && distance(self, e) < 650) ||
            (e.entity === "dog" && !!self && distance(self, e) < 450),
        );
      if (
        e.entity === "player" &&
        e.weapon !== "pistol" &&
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
    this.drawShots();
    this.drawLootHints();
    const building = panel === "build" && !!self;
    this.buildGuides.clear();
    this.preview.setVisible(building);
    this.previewText.setVisible(building);
    if (building) {
      const p = this.input.activePointer,
        plan = constructionPlan(
          p,
          this.cameras.main,
          buildKind,
          self!.id,
          snapshot.structures,
          foundation,
        ),
        point = plan.point,
        reason = placementReason(
          self!,
          buildKind,
          point,
          snapshot.structures,
          plan.foundation,
        );
      const guides = this.buildGuides,
        half = BUILDING.floorSize / 2;
      for (const floor of snapshot.structures.filter(
        (s) => s.kind === "foundation" && s.owner === self!.id,
      )) {
        const selected = floor.id === plan.foundation;
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
  scale: {
    mode: Phaser.Scale.NONE,
    width: Math.round(window.innerWidth * renderRatio),
    height: Math.round(window.innerHeight * renderRatio),
    zoom: 1 / renderRatio,
  },
  render: {
    antialias: true,
    antialiasGL: false,
    pixelArt: false,
    roundPixels: true,
  },
  callbacks: {
    postBoot(game) {
      const resize = () => {
        const profile = renderProfile(
            window.innerWidth,
            window.innerHeight,
            window.devicePixelRatio,
          ),
          oldRatio = renderRatio;
        const cameras = game.scene.getScenes(true).flatMap((scene) =>
          scene.cameras.cameras.map((camera) => ({
            scene,
            camera,
            zoom: camera.zoom / oldRatio,
            x: camera.scrollX + camera.width / 2,
            y: camera.scrollY + camera.height / 2,
          })),
        );
        renderRatio = profile.ratio;
        game.scale.setZoom(1 / renderRatio);
        game.scale.resize(profile.width, profile.height);
        for (const { scene, camera, zoom, x, y } of cameras) {
          camera.setZoom(zoom * renderRatio).centerOn(x, y);
          if (scene instanceof City) scene.mapWorld?.setPixelRatio(renderRatio);
          for (const child of scene.children.list)
            if (child instanceof Phaser.GameObjects.Text)
              child.setResolution(renderRatio);
        }
      };
      window.addEventListener("resize", resize);
      game.events.once("destroy", () =>
        window.removeEventListener("resize", resize),
      );
    },
  },
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
    ...(snapshot.dogs || []).filter((d) => d.health > 0),
    ...snapshot.structures.filter(
      (s) =>
        s.hp > 0 &&
        s.kind !== "foundation" &&
        s.kind !== "roof" &&
        (!!point || s.owner !== self!.id),
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
const mapBases = new Map<string, HTMLImageElement>();
function mapBase(width: number, height: number, logicalWidth: number) {
  setMapReservations(snapshot.mapReservations || []);
  const key =
    width +
    "x" +
    height +
    "@" +
    logicalWidth +
    JSON.stringify(snapshot.mapReservations || []);
  let img = mapBases.get(key);
  if (!img) {
    img = new Image();
    img.src =
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(cartographySVG(width, height, logicalWidth));
    img.onload = () => {
      if (snapshot) {
        drawMap($("#minimap") as HTMLCanvasElement);
        const large =
          document.querySelector<HTMLCanvasElement>("#district-map");
        if (large) drawMap(large);
      }
    };
    mapBases.set(key, img);
  }
  return img;
}
function drawMap(canvas: HTMLCanvasElement) {
  const logicalWidth = canvas.clientWidth || canvas.width,
    pixels = Math.round(
      logicalWidth * Math.min(window.devicePixelRatio || 1, 2),
    );
  if (canvas.width !== pixels || canvas.height !== pixels) {
    canvas.width = pixels;
    canvas.height = pixels;
  }
  const ctx = canvas.getContext("2d")!;
  const sx = canvas.width / WORLD.width,
    sy = canvas.height / WORLD.height;
  const base = mapBase(canvas.width, canvas.height, logicalWidth);
  if (!base.complete || !base.naturalWidth) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(base, 0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#90bc88";
  const s = WORLD.safeRect;
  ctx.fillRect(s.x * sx, s.y * sy, s.width * sx, s.height * sy);
  for (const [index, p] of WORLD.scavengePoints.entries()) {
    const crate = lootCrateAt(index),
      size = canvas.width > 300 ? 6 : 3;
    ctx.fillStyle =
      (self?.cooldowns[index] || 0) > Date.now() + serverOffset
        ? "#8b9083"
        : crate.color;
    ctx.strokeStyle = "#24352a";
    ctx.lineWidth = 1;
    ctx.fillRect(p.x * sx - size / 2, p.y * sy - size / 2, size, size);
    ctx.strokeRect(p.x * sx - size / 2, p.y * sy - size / 2, size, size);
  }
  for (const dog of snapshot.dogs || [])
    if (dog.health > 0) {
      ctx.fillStyle = "#de8065";
      ctx.beginPath();
      ctx.arc(
        dog.x * sx,
        dog.y * sy,
        canvas.width > 300 ? 3 : 2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
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
    `<span class="zone-label">${safe(p.x, p.y) ? "THE HAVEN <b>SAFE ZONE</b>" : inRect(p, WORLD.townRect) ? `${DISTRICTS.find((d) => inRect(p, d))?.name.toUpperCase() || "CITY OUTSKIRTS"} <b class="danger">TOWN · NO BUILDING</b>` : 'WOODLAND <b class="danger">OPEN PVP</b>'}</span><span>${hours}:${minutes} <i>·</i> ${p.temperature.toFixed(0)}°C <i>·</i> $${p.cash}</span>`;
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
    `<span class="eyebrow">A HOME OUTSIDE TOWN</span><b>${built ? "Make it your home" : wood ? "Lay your first floor" : "Scavenge the neighborhood"}</b><p>${built ? "Build walls and a door on your floors, then add storage." : wood ? "Follow a road beyond city limits. Find open ground for your home." : "Search alley containers or buy wood at the store."}</p><button data-ui="journal">J <span>SURVIVAL JOURNAL</span> ↗</button>`;
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
    html = `<div class="inventory-layout"><aside class="character-card"><div class="portrait" style="background-image:url('/assets/${appearanceKey(p.weapon)}-south.png')"></div><h4>${esc(p.name)}</h4><span class="character-class">SURVIVOR · NO CLASS</span><div class="equipment-slot">${img("backpack")}<span>${p.equipped.backpack ? "Worn backpack" : "No backpack equipped"}<small>8 carrying slots</small></span></div><div class="equipment-slot">${img(p.weapon === "fists" ? "ui-fists" : p.weapon)}<span>${nice(p.weapon)}<small>${p.weapon === "pistol" ? p.ammo + "/6 loaded" : "Active weapon"}</small></span></div><div class="wallet"><span>Carried cash</span><b>$${p.cash}</b><small>Banked $${p.bank} · stays after death</small></div></aside><div class="bag-content"><div class="bag-meta"><b>BACKPACK</b><span>${entries.filter(([item]) => item !== "wood").length}/8 slots · ${weight.toFixed(1)}/65 kg</span></div><div class="inventory-grid">${Array.from(
      { length: Math.max(8, entries.length) },
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
    html = `<p class="panel-intro">Build on open ground outside town. Water, cliffs and trees block placement. Town streets and road shoulders are protected. Place floors first, then hover a floor to snap walls and doors along its outer or interior grid lines, with storage inside. The floor under your cursor is selected automatically. Floors can join edge to edge. Green is valid; red explains what is blocked. WASD keeps you moving while building.</p><div class="build-options">${BUILD_KINDS.map((k) => `<button data-kind="${k}" class="${buildKind === k ? "selected" : ""}">${img(k + "-intact")}<b>${nice(k)}</b><span>${PIECES[k].wood} wood</span></button>`).join("")}</div><div class="construction-info"><div><span class="eyebrow">${nice(buildKind)}</span><h4>${buildKind === "foundation" ? "Raid-proof floor" : PIECES[buildKind].hp + " structure HP"}</h4><p>${buildKind === "foundation" ? "A two-by-two floor tile. Join floors edge to edge to expand your base." : "Walls and doors snap to outer or interior floor grid lines; storage fits inside the floor."}</p></div><b>${p.inventory.wood || 0}<small>WOOD AVAILABLE</small></b></div><label>Preferred floor at shared edges<select id="foundation"><option value="">Select your floor</option>${snapshot.structures
      .filter((s) => s.kind === "foundation" && s.owner === p.id)
      .sort((a, b) => distance(a, p) - distance(b, p))
      .map(
        (s) =>
          `<option value="${s.id}" ${foundation === s.id ? "selected" : ""}>${s.x} E / ${s.y} S · ${Math.round(distance(s, p))}px away</option>`,
      )
      .join(
        "",
      )}</select></label><p class="warning-note">Roads, public buildings and the shelter stay protected. Bases can be raided while you are offline. Build budget: ${BUILD_BUDGET} pieces per player.</p>`;
  } else if (panel === "skills") {
    title = "Character & skills";
    subtitle = "LEARN BY DOING";
    html = `<div class="skill-header"><div class="portrait" style="background-image:url('/assets/${appearanceKey(p.weapon)}-south.png')"></div><div><h4>${esc(p.name)}</h4><p>Explore, craft, trade and survive to gain field experience.<br>Learned skills persist through death.</p></div></div><div class="skill-grid">${Object.entries(
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
        "Follow the roads east or south beyond town and find open ground. Open B to build.",
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
    title = "World Map";
    subtitle = "STREET SURVIVAL / FIVE DISTRICTS";
    html = `<canvas id="district-map" width="760" height="760"></canvas><div class="map-legend"><span><i class="safe"></i> Shelter</span><span><i class="vacant"></i> Open ground outside town</span><span>Dark green · Forest · Blue · Water · Grey · Cliffs</span><span><i class="you"></i> You</span><span><i class="players"></i> Nearby survivors</span><span><i class="loot"></i> Loot crates · T1–T5</span><span><i class="dogs"></i> Nearby strays</span></div><p class="panel-intro">Corner Mart (${WORLD.storePoint.x}, ${WORLD.storePoint.y}) · Scrap Exchange (${WORLD.traderPoint.x}, ${WORLD.traderPoint.y})<br>Follow the winding roads and bridges out of town. Build anywhere on open land outside town; roads, water, cliffs and trees must stay clear.</p>`;
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
  resetMovement();
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
    resetMovement();
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
    e.preventDefault();
    hold[key] = true;
    el.setPointerCapture(e.pointerId);
    flushMovement();
  };
  const release = () => {
    if (!hold[key]) return;
    hold[key] = false;
    flushMovement();
  };
  el.onpointerup = release;
  el.onpointercancel = release;
  el.onlostpointercapture = release;
}
const releaseMovement = () => {
  for (const key of Object.keys(hold) as (keyof typeof hold)[])
    hold[key] = false;
  send({ type: "move", dir: 0, dirY: 0, sprint: false, crouch: false });
};
window.addEventListener("blur", releaseMovement);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) releaseMovement();
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
