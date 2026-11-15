import Phaser from "phaser";
import { Client, type Room } from "colyseus.js";
import {
  WORLD,
  PIECES,
  ITEMS,
  safe,
  type Action,
  type Player,
  type Structure,
  type Bag,
  type Kind,
  type Item,
} from "../../../packages/shared/src/index";
import { npcs } from "../../../packages/game-data/content";
import "./style.css";
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<main id="shell"><header><a class="brand" href="#">STREET<span>SURVIVAL</span><small>AN OPEN WORLD. AN UNEVEN START.</small></a><div class="district"><i></i> THE BLOCK <span>01 / CITY DISTRICT</span></div><div id="connection">LOCAL MULTIPLAYER</div></header><section id="stage"><div id="game"></div><div id="world-label"><span class="eyebrow">WELCOME TO THE NEIGHBORHOOD</span><h1>The Block<span>.</span></h1><p>Make a living. Build a place. Protect what’s yours.</p></div><div id="hud" hidden></div><div id="notice" role="status"></div><div id="context" hidden></div><div id="panel" hidden></div><div id="death" hidden><h2>Left on the street.</h2><p>Your carried items and cash are now public loot.<br>Your skills, bank and property remain yours.</p><button id="respawn">Return to shelter</button></div><div id="auth"><div class="auth-intro"><span class="eyebrow">PERSISTENT ONLINE SURVIVAL</span><h2>Every block<br>has a story.<br><em>Start yours.</em></h2><p>Scavenge the alleys. Trade what you find.<br>Build a home in a city that never sleeps.</p><div class="tags"><span>SHARED CITY</span><span>FREE BUILDING</span><span>OPEN PVP</span></div></div><form id="login"><span class="eyebrow">YOUR LIFE ON THE BLOCK</span><h3>Step onto the street</h3><label>Street name<input name="name" autocomplete="username" placeholder="Your unique name" pattern="[a-zA-Z][a-zA-Z0-9_]{2,19}" required maxlength="20"></label><label>Password<input name="password" type="password" autocomplete="current-password" placeholder="At least 10 characters" minlength="10" maxlength="128" required></label><div class="appearance"><label>Skin<select name="skin"><option value="#c98c62">Warm</option><option value="#865641">Deep</option><option value="#efbe95">Light</option></select></label><label>Top<select name="top"><option value="#ec8753">Terracotta</option><option value="#5ba9aa">Teal</option><option value="#a897cf">Lilac</option></select></label><label>Hair<select name="hair"><option value="#252939">Ink</option><option value="#72492e">Brown</option><option value="#e4bb65">Blond</option></select></label></div><div class="appearance"><label>Body<select name="body"><option value="standard">Standard</option><option value="broad">Broad</option></select></label><label>Hair style<select name="style"><option value="short">Short</option><option value="long">Long</option></select></label></div><button name="register" value="true" type="submit">Create character <span>↗</span></button><button class="secondary" name="register" value="false" type="submit">I already live here · Sign in</button><p id="auth-error" role="alert"></p><small>Start with $10, water and a snack.<br>No classes. No paid advantages. Just you and the city.</small></form></div><div id="touch" hidden><button data-hold="left">◀</button><button data-hold="right">▶</button><button data-hold="sprint">RUN</button><button data-ui="interact">E</button><button data-hold="crouch">LOW</button><button data-ui="attack">HIT</button><button data-ui="reload">R</button></div></section><footer><div><span class="live-dot"></span><span id="footer-status">A CITY THAT KEEPS GOING</span></div><nav><button data-ui="inventory">Tab <span>Backpack</span></button><button data-ui="build">B <span>Build</span></button><button data-ui="map">M <span>District map</span></button><button data-ui="chat">↵ <span>Chat</span></button></nav><small>A / D MOVE · SHIFT RUN · E INTERACT</small></footer></main>`;
const $ = (s: string) => document.querySelector<HTMLElement>(s)!;
let serverOffset = 0;
let room: Room | undefined,
  seq = 0,
  self: Player | undefined,
  snapshot: {
    players: Player[];
    structures: Structure[];
    bags: Bag[];
    clock: number;
  } = { players: [], structures: [], bags: [], clock: 0 };
const appearanceKey = (p: Player) =>
  `player-${["#c98c62", "#865641", "#efbe95"].indexOf(p.appearance.skin)}-${["#252939", "#72492e", "#e4bb65"].indexOf(p.appearance.hair)}-${["#ec8753", "#5ba9aa", "#a897cf"].indexOf(p.appearance.top)}-${p.appearance.body}-${p.appearance.style}`;
let manifest: any,
  scene: City,
  panel = "",
  buildKind: Kind = "foundation",
  foundation = "",
  aim = false,
  noticeTimer: number;
const hold = { left: false, right: false, sprint: false, crouch: false };
const send = (action: Action) =>
  room?.send("intent", {
    v: 1,
    seq: ++seq,
    requestId: crypto.randomUUID(),
    at: Date.now() + serverOffset,
    action,
  });
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
function notice(text: string) {
  $("#notice").textContent = text;
  $("#notice").classList.add("show");
  clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(
    () => $("#notice").classList.remove("show"),
    3500,
  );
}
const label = (
  x: number,
  y: number,
  text: string,
  size = 14,
  color = "#263b43",
) =>
  scene.add
    .text(x, y, text, {
      fontFamily: "Arial",
      fontSize: size,
      color,
      backgroundColor: "#e8e6d7dd",
      padding: { x: 8, y: 5 },
    })
    .setOrigin(0.5, 1);
class City extends Phaser.Scene {
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  sprites = new Map<string, Phaser.GameObjects.Sprite>();
  labels = new Map<string, Phaser.GameObjects.Text>();
  staticBuilt = false;
  lastSend = 0;
  preview!: Phaser.GameObjects.Image;
  previewText!: Phaser.GameObjects.Text;
  constructor() {
    super("city");
    scene = this;
  }
  preload() {
    this.load.json("manifest", "/assets/manifest.json");
  }
  create() {
    manifest = this.cache.json.get("manifest").assets;
    for (const [key, a] of Object.entries(manifest) as [string, any][]) {
      if (key.startsWith("player")) {
        if (key.includes("player-0-0-0-standard-short"))
          this.load.spritesheet(key, "/assets/" + a.file, {
            frameWidth: 128,
            frameHeight: 128,
          });
      } else this.load.image(key, "/assets/" + a.file);
    }
    this.load.once("complete", () => this.drawWorld());
    this.load.start();
    this.cameras.main.setBackgroundColor("#c6d8d9");
    this.cameras.main.setBounds(0, 0, WORLD.width, 760);
    this.keys = this.input.keyboard!.addKeys(
      "A,D,SHIFT,CTRL,E,TAB,M,B,ENTER,R",
    ) as typeof this.keys;
    this.input.keyboard!.removeCapture(["TAB", "ENTER", "SHIFT", "CTRL"]);
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (!self || p.y < 70) return;
      if (panel === "build") {
        send({ type: "build", kind: buildKind, x: p.worldX, foundation });
        return;
      }
      if (p.rightButtonDown()) {
        aim = true;
        return;
      }
      attack();
    });
    this.input.on("pointerup", () => (aim = false));
    this.input.mouse!.disableContextMenu();
  }
  drawWorld() {
    this.staticBuilt = true;
    this.add.rectangle(3200, 350, 6400, 480, 0xc6d8d9);
    this.add.circle(900, 130, 64, 0xefe8c7).setScrollFactor(0.15);
    for (let i = 0; i < 30; i++)
      this.add
        .image(i * 260, 470, "building-" + (i % 6))
        .setOrigin(0, 1)
        .setScale(0.78 + (i % 3) * 0.12)
        .setAlpha(0.42)
        .setScrollFactor(0.45, 1);
    for (let i = 0; i < 26; i++)
      this.add
        .image(i * 280, 520, "building-" + ((i + 2) % 6))
        .setOrigin(0, 1)
        .setAlpha(0.82)
        .setScrollFactor(0.8, 1);
    this.add.tileSprite(3200, 580, 6400, 120, "sidewalk");
    this.add.tileSprite(3200, 682, 6400, 88, "asphalt");
    this.add.tileSprite(3200, 634, 6400, 16, "curb");
    for (let i = 0; i < 45; i++)
      this.add.rectangle(i * 160, 690, 80, 5, 0xd3c9a5);
    this.add.image(410, 560, "shelter").setOrigin(0.5, 1).setScale(1.5);
    this.add.image(1090, 560, "shop").setOrigin(0.5, 1).setScale(1.25);
    for (let x = 220; x < 6400; x += 640)
      this.add.image(x, 560, "streetlight").setOrigin(0.5, 1);
    this.add.image(1690, 654, "vehicle").setOrigin(0.5, 1);
    this.add.image(4420, 654, "vehicle").setOrigin(0.5, 1).setFlipX(true);
    for (const [l, r] of WORLD.parcels) {
      this.add.rectangle((l + r) / 2, 552, r - l, 9, 0xa3ad83, 0.8);
      label((l + r) / 2, 478, "VACANT · FREE BUILDING", 12);
    }
    WORLD.scavenge.forEach((x, i) => {
      this.add
        .image(x, 560, i % 2 ? "trash" : "dumpster")
        .setOrigin(0.5, 1)
        .setScale(0.85);
      label(x, 445, "SCAVENGE", 11);
    });
    for (const n of npcs) {
      this.add.image(n.x, 560, n.key).setOrigin(0.5, 0.94).setScale(0.85);
      label(n.x, 443, n.name, 13);
    }
    label(420, 290, "SAFE ZONE · PUBLIC SHELTER", 15);
    label(1500, 315, "SCRAP & SECOND CHANCES", 17);
    label(3040, 280, "EAST BLOCK / RESIDENTIAL", 22);
    this.preview = this.add
      .image(0, 488, "foundation-intact")
      .setOrigin(0.5, 1)
      .setAlpha(0.6)
      .setDepth(10)
      .setVisible(false);
    this.previewText = label(0, 420, "", 13).setDepth(11).setVisible(false);
    for (const [key, asset] of Object.entries(manifest) as [string, any][])
      if (key.startsWith("player-"))
        for (const [name, a] of Object.entries(asset.animations) as [
          string,
          any,
        ][])
          if (this.textures.exists(key))
            this.anims.create({
              key: key + "-" + name,
              frames: this.anims.generateFrameNumbers(key, {
                start: a.start,
                end: a.end,
              }),
              frameRate: a.fps,
              repeat: name === "death" ? 0 : -1,
            });
    this.cameras.main.setZoom(
      Math.max(0.68, Math.min(1.1, this.scale.width / 1300)),
    );
    this.cameras.main.centerOn(650, 390);
  }
  attackSeen = new Map<string, number>();
  loading = new Set<string>();
  ensureAppearance(key: string) {
    if (this.loading.has(key)) return;
    this.loading.add(key);
    const a = manifest[key];
    if (!a) return;
    this.load.spritesheet(key, "/assets/" + a.file, {
      frameWidth: 128,
      frameHeight: 128,
    });
    this.load.once("filecomplete-spritesheet-" + key, () => {
      for (const [name, anim] of Object.entries(a.animations) as [
        string,
        any,
      ][])
        this.anims.create({
          key: key + "-" + name,
          frames: this.anims.generateFrameNumbers(key, {
            start: anim.start,
            end: anim.end,
          }),
          frameRate: anim.fps,
          repeat: name === "death" ? 0 : -1,
        });
    });
    if (!this.load.isLoading()) this.load.start();
  }
  update(time: number, delta: number) {
    if (!this.staticBuilt) return;
    const typing = ["INPUT", "SELECT", "TEXTAREA"].includes(
      document.activeElement?.tagName || "",
    );
    if (self) {
      if (!typing) {
        const k = this.keys;
        if (Phaser.Input.Keyboard.JustDown(k.TAB)) {
          toggle("inventory");
        }
        if (Phaser.Input.Keyboard.JustDown(k.B)) toggle("build");
        if (Phaser.Input.Keyboard.JustDown(k.M)) toggle("map");
        if (Phaser.Input.Keyboard.JustDown(k.ENTER)) toggle("chat");
        if (Phaser.Input.Keyboard.JustDown(k.E)) interact();
        if (Phaser.Input.Keyboard.JustDown(k.R)) send({ type: "reload" });
      }
      if (time - this.lastSend > 80) {
        send({
          type: "move",
          dir: typing
            ? 0
            : Number(this.keys.D.isDown || hold.right) -
              Number(this.keys.A.isDown || hold.left),
          sprint: !typing && (this.keys.SHIFT.isDown || hold.sprint),
          crouch: !typing && (this.keys.CTRL.isDown || hold.crouch),
        });
        this.lastSend = time;
      }
      this.cameras.main.scrollX = Phaser.Math.Linear(
        this.cameras.main.scrollX,
        self.x - this.scale.width / this.cameras.main.zoom / 2,
        0.08,
      );
    }
    const entities: any[] = [
      ...snapshot.players.map((p) => ({
        ...p,
        asset: appearanceKey(p) + "-" + (p.facing < 0 ? "left" : "right"),
        entity: "player",
      })),
      ...snapshot.structures.map((s) => ({
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
    for (const e of entities) {
      if (e.entity === "player" && !this.textures.exists(e.asset)) {
        this.ensureAppearance(e.asset);
        continue;
      }
      let s = this.sprites.get(e.id);
      if (!s) {
        s = this.add
          .sprite(
            e.x,
            e.entity === "structure"
              ? 488
              : e.entity === "player" && e.lane === "parcel"
                ? 488
                : 560,
            e.asset,
          )
          .setOrigin(0.5, e.entity === "player" ? 0.94 : 1)
          .setDepth(5);
        this.sprites.set(e.id, s);
        this.labels.set(e.id, label(e.x, 423, "", 12).setDepth(6));
      }
      s.y =
        e.entity === "structure"
          ? 488
          : e.entity === "player" && e.lane === "parcel"
            ? 488
            : 560;
      const previous = s.x;
      s.x = Phaser.Math.Linear(s.x, e.x, Math.min(1, delta / 65));
      if (e.entity === "player") {
        const state = e.dead
          ? "death"
          : Date.now() - e.attackAt < 0
            ? "melee"
            : e.id === self?.id && (this.keys.CTRL.isDown || hold.crouch)
              ? "crouch"
              : Math.abs(previous - e.x) > 2
                ? e.id === self?.id && this.keys.SHIFT.isDown
                  ? "run"
                  : "walk"
                : e.weapon === "pistol" && aim
                  ? "firearm"
                  : "idle";
        s.play(e.asset + "-" + state, true);
        s.setAlpha(e.protected ? 0.65 : 1);
      } else {
        s.setTexture(e.asset);
        if (e.kind === "door" && e.open) s.setAlpha(0.35);
        else s.setAlpha(1);
      }
      if (
        e.entity === "player" &&
        e.attackAt > (this.attackSeen.get(e.id) || 0) &&
        e.attackAt > Date.now() - 800
      ) {
        this.attackSeen.set(e.id, e.attackAt);
        const fx = this.add
          .image(
            s.x + e.facing * 55,
            s.y - 65,
            e.weapon === "pistol" ? "muzzle" : "hit",
          )
          .setScale(0.3)
          .setDepth(9);
        this.tweens.add({
          targets: fx,
          alpha: 0,
          scale: 0.5,
          duration: 190,
          onComplete: () => fx.destroy(),
        });
      }
      const text = this.labels.get(e.id)!;
      text.setPosition(s.x, s.y - (e.entity === "player" ? 137 : 135));
      text.setText(
        e.entity === "player"
          ? e.name + (e.id === self?.id ? " · YOU" : "")
          : e.entity === "bag"
            ? "PUBLIC LOOT"
            : e.kind.toUpperCase() +
              " · " +
              (e.kind === "foundation" ? "RAID PROOF" : e.hp + " HP"),
      );
    }
    const build = panel === "build" && !!self;
    this.preview.setVisible(build);
    this.previewText.setVisible(build);
    if (build) {
      const x = Math.round(this.input.activePointer.worldX / 64) * 64;
      const owned = snapshot.structures.find(
        (s) =>
          s.id === foundation &&
          s.kind === "foundation" &&
          s.owner === self!.id,
      );
      const reason = !WORLD.parcels.some(([l, r]) => x >= l + 32 && x <= r - 32)
        ? "PROTECTED ROAD / OUTSIDE PARCEL"
        : Math.abs(x - self!.x) > 210
          ? "MOVE CLOSER"
          : (self!.inventory.wood || 0) < PIECES[buildKind].wood
            ? "MISSING WOOD"
            : snapshot.structures.filter((s) => s.owner === self!.id).length >=
                40
              ? "BUILD LIMIT"
              : snapshot.structures.some(
                    (s) =>
                      s.x === x &&
                      (s.kind === buildKind ||
                        (["wall", "door", "storage"].includes(s.kind) &&
                          ["wall", "door", "storage"].includes(buildKind))),
                  )
                ? "COLLISION"
                : buildKind === "foundation" &&
                    snapshot.structures.some(
                      (s) => s.kind === "foundation" && Math.abs(s.x - x) < 192,
                    )
                  ? "FOUNDATION TOO CLOSE"
                  : buildKind !== "foundation" &&
                      (!owned || Math.abs(owned.x - x) > 128)
                    ? "SELECT OWNED FOUNDATION WITHIN 128 PX"
                    : "";
      const valid = !reason;
      this.preview
        .setTexture(buildKind + "-intact")
        .setX(x)
        .setTint(valid ? 0x92d9a7 : 0xf18c82);
      this.previewText
        .setX(x)
        .setText(valid ? "CLICK TO PLACE · SERVER VALIDATES" : reason);
    }
  }
}
new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#c6d8d9",
  scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
  scene: City,
  render: { antialias: true },
});
const serverUrl =
  (import.meta as any).env.VITE_SERVER_URL || "http://localhost:2567";
$("#login").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(event.target as HTMLFormElement);
  const button = (event as SubmitEvent).submitter as HTMLButtonElement;
  $("#auth-error").textContent = "Connecting to The Block…";
  try {
    const res = await fetch(serverUrl + "/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        password: data.get("password"),
        register: button.value === "true",
        appearance: Object.fromEntries(
          ["skin", "hair", "top", "body", "style"].map((k) => [k, data.get(k)]),
        ),
      }),
    });
    const body = await res.json();
    if (!res.ok) throw Error(body.error);
    const city = await (await fetch(serverUrl + "/world")).json();
    room = await new Client(serverUrl.replace(/^http/, "ws")).joinById(
      city.roomId,
      { token: body.token },
    );
    seq = 0;
    room.onMessage("welcome", (data) => {
      serverOffset = data.serverTime - Date.now();
    });
    room.onMessage("snapshot", (s) => {
      self = s.self;
      snapshot = s;
      $("#auth").hidden = true;
      $("#world-label").hidden = true;
      $("#hud").hidden = false;
      $("#context").hidden = false;
      $("#touch").hidden = false;
      $("#connection").textContent = "● CONNECTED · THE BLOCK";
      renderHud();
    });
    room.onMessage("notice", notice);
    room.onMessage("chat", (c) => {
      chat.push(c);
      if (chat.length > 40) chat.shift();
      if (panel === "chat") renderPanel();
      else notice(c.name + ": " + c.text);
    });
    room.onLeave(() => {
      notice("Disconnected. Sign in again to reconnect.");
      $("#auth").hidden = false;
      $("#connection").textContent = "DISCONNECTED";
      self = undefined;
      room = undefined;
    });
    $("#auth-error").textContent = "";
  } catch (e) {
    $("#auth-error").textContent =
      e instanceof Error ? e.message : "Connection failed";
  }
});
let lastPanel = 0;
const chat: { name: string; text: string }[] = [];
function renderHud() {
  if (!self) return;
  const p = self;
  $("#hud").innerHTML =
    `<div class="player-tag"><span class="eyebrow">${safe(p.x) ? "SHELTER · PROTECTED" : "OPEN STREET · PVP ACTIVE"}</span><b>${esc(p.name)}</b><small>$${p.cash} carried · $${p.bank} banked</small></div><div class="stats">${(["health", "hunger", "thirst", "energy"] as const).map((k) => `<div><img src="/assets/${k}.png" alt=""><span>${k}<b>${Math.ceil(p[k])}</b></span><meter min="0" max="100" value="${p[k]}"></meter></div>`).join("")}<div class="temp">${p.temperature.toFixed(0)}°C<br><small>${Math.floor(
      snapshot.clock / 60,
    )
      .toString()
      .padStart(2, "0")}:${Math.floor(snapshot.clock % 60)
      .toString()
      .padStart(2, "0")} / day</small></div></div>`;
  $("#death").hidden = !p.dead;
  $("#footer-status").textContent =
    `${snapshot.players.length} NEARBY · ${Math.round(p.x)} M EAST`;
  const nearby = nearest();
  $("#context").innerHTML =
    `<div><span class="eyebrow">${nearby?.title || "YOUR NEXT MOVE"}</span><b>${nearby ? "E · Interact" : "Find supplies in the alleys east of the store"}</b><small>${p.weapon.toUpperCase()} ${p.weapon === "pistol" ? p.ammo + "/6 · R reload" : "· CLICK TO ATTACK"}</small></div><button data-ui="interact">E ↗</button>`;
  if (panel && Date.now() - lastPanel > 800) {
    renderPanel();
    lastPanel = Date.now();
  }
}
function nearest() {
  if (!self) return;
  const x = self.x;
  const candidates = [
    { title: "Corner Mart · buy supplies", x: WORLD.store, type: "store" },
    { title: "Otis · sell recyclables", x: WORLD.trader, type: "trader" },
    ...WORLD.scavenge.map((x, index) => ({
      title: "Alley container · scavenge",
      x,
      type: "scavenge",
      index,
    })),
    ...snapshot.bags.map((b) => ({
      title: "Public loot bag",
      x: b.x,
      type: "loot",
      id: b.id,
    })),
    ...snapshot.structures.map((s) => ({
      title:
        s.kind +
        " · " +
        (s.owner === self!.id ? "your property" : "player property"),
      x: s.x,
      type: s.kind === "storage" ? "storage" : "structure",
      id: s.id,
    })),
  ];
  return candidates
    .filter((c) => Math.abs(c.x - x) < 150)
    .sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0] as any;
}
function interact() {
  const n = nearest();
  if (!n) return notice("No interaction nearby");
  if (n.type === "scavenge") send({ type: "scavenge", index: n.index });
  else {
    panel = n.type + ":" + (n.id || "");
    renderPanel();
  }
}
function toggle(name: string) {
  panel = panel === name ? "" : name;
  renderPanel();
}
function itemRow(k: Item, n: number, buttons: string) {
  return `<div class="item"><img src="/assets/${k}.png" alt=""><span>${k}<small>×${n} · ${ITEMS[k].weight} kg each</small></span>${buttons}</div>`;
}
const btn = (label: string, action: Action) =>
  `<button class="small" data-action='${esc(JSON.stringify(action))}'>${label}</button>`;
function renderPanel() {
  const el = $("#panel");
  el.hidden = !panel;
  if (!panel || !self) return;
  const p = self;
  let title = "",
    html = "";
  if (panel === "inventory") {
    title = "Your backpack";
    html = `<p>8 slots · 65 kg maximum · equipped: ${Object.keys(p.equipped).join(", ") || "none"}</p>${(Object.entries(p.inventory) as [Item, number][]).map(([k, n]) => itemRow(k, n, (["water", "snack", "bandage"].includes(k) ? btn("Use", { type: "consume", item: k as any }) : "") + (["bat", "pistol"].includes(k) ? btn("Equip", { type: "equip", item: k as any }) : "") + btn("Drop", { type: "drop", item: k }))).join("")}${p.lane === "parcel" ? btn("Exit to street", { type: "exit" }) : ""}${btn("Equip fists", { type: "equip", item: "fists" })}${btn("Craft bat · 3 wood", { type: "craft", item: "bat" })}<h4>Learned skills</h4><p>${Object.entries(
      p.skills,
    )
      .map(([k, v]) => esc(k) + " " + v.toFixed(1))
      .join(" · ")}</p>`;
  } else if (panel === "build") {
    title = "Build a foothold";
    html = `<p>Foundations have a separate base lane so streets stay open. Enter at the west edge to access storage. Build only on vacant ground. Walk close, choose a piece, then click its position. Foundations support modules within 128 px.</p><div class="build-options">${(Object.keys(PIECES) as Kind[]).map((k) => `<button class="${buildKind === k ? "selected" : ""}" data-kind="${k}"><img src="/assets/${k}-intact.png" alt="">${k}<small>${PIECES[k].wood} wood</small></button>`).join("")}</div><label>Owned foundation<select id="foundation"><option value="">Choose foundation</option>${snapshot.structures
      .filter((s) => s.kind === "foundation" && s.owner === p.id)
      .map(
        (s) =>
          `<option value="${s.id}" ${foundation === s.id ? "selected" : ""}>Foundation at ${s.x}</option>`,
      )
      .join(
        "",
      )}</select></label><p>${p.inventory.wood || 0} wood carried · Green preview: potential placement<br>Red: road, reach or materials. Server checks all placement.</p>`;
  } else if (panel === "map") {
    title = "The Block / District 01";
    html = `<div class="map-strip"><i style="left:${(p.x / WORLD.width) * 100}%"></i></div><p>WEST → EAST</p><ol><li>80–740 · Public shelter / safe zone</li><li>1090 · Corner Mart</li><li>1510 · Scrap trader</li><li>1850–5330 · Alley scavenging</li><li>2900–6150 · Vacant building parcels</li></ol><p>Downtown, Industrial, The Projects and Uptown are planned expansions.</p>`;
  } else if (panel === "chat") {
    title = "Neighborhood chat";
    html = `<div class="messages">${chat.map((c) => `<p><b>${esc(c.name)}</b> ${esc(c.text)}</p>`).join("")}</div><form id="chat-form"><input name="text" maxlength="160" placeholder="Say something…" required autocomplete="off"><button>Send</button></form>`;
  } else if (panel.startsWith("store") || panel.startsWith("trader")) {
    const sell = panel.startsWith("trader");
    title = sell ? "Otis / Scrap buyer" : "Corner Mart / Supplies";
    html = `<p>$${p.cash} carried · all transactions server validated</p>${(sell ? Object.keys(p.inventory) : ["water", "snack", "bandage", "wood", "pistol", "ammo"]).map((k) => itemRow(k as Item, p.inventory[k as Item] || 0, btn(`${sell ? "Sell" : "Buy"} $${ITEMS[k as Item].price * (sell ? 1 : 2)}`, { type: "trade", item: k as Item, sell }))).join("")}`;
  } else {
    const id = panel.split(":")[1],
      s = snapshot.structures.find((s) => s.id === id),
      b = snapshot.bags.find((b) => b.id === id),
      c = s || b;
    title = s
      ? s.kind +
        " / " +
        (s.owner === p.id ? "Owned by you" : "Public raid access")
      : "Public loot";
    if (!c) html = "<p>Container gone or out of range.</p>";
    else {
      html =
        (s
          ? `<p>${s.hp} HP · ${s.kind === "foundation" ? "Raid immune" : s.hp <= 0 ? "Breached" : "Intact"}</p>`
          : "") +
        Object.entries(c.inventory)
          .map(([k, n]) =>
            itemRow(
              k as Item,
              n,
              btn("Take 1", { type: "loot", id, item: k as Item }),
            ),
          )
          .join("") +
        (c.cash
          ? btn("Take $" + c.cash, { type: "loot", id, item: "cash" })
          : "");
      if (s?.kind === "foundation")
        html += btn("Enter base · west edge", {
          type: "enter",
          foundation: s.id,
        });
      if (p.lane === "parcel") html += btn("Exit to street", { type: "exit" });
      if (s && s.owner === p.id) {
        if (s.kind === "door")
          html += btn(s.open ? "Close door" : "Open door", {
            type: "door",
            id,
          });
        if (s.kind === "storage")
          html +=
            "<h4>Store one item</h4>" +
            Object.keys(p.inventory)
              .map((k) =>
                btn("Store " + k, { type: "store", id, item: k as Item }),
              )
              .join("");
        html +=
          btn("Repair · 2 wood", { type: "repair", id }) +
          btn("Dismantle", { type: "dismantle", id });
      }
      if (s?.kind !== "foundation" && s)
        html += btn("Attack structure", {
          type: "attack",
          target: id,
          weapon: p.weapon,
        });
    }
  }
  el.innerHTML = `<div class="panel-title"><h3>${title}</h3><button data-ui="close" aria-label="Close panel">×</button></div>${html}`;
}
function attack() {
  if (!self) return;
  const targets = [
    ...snapshot.players.filter((p) => p.id !== self!.id && !p.dead),
    ...snapshot.structures.filter((s) => s.hp > 0 && s.kind !== "foundation"),
  ]
    .filter((t) => (t.x - self!.x) * self!.facing >= 0)
    .sort((a, b) => Math.abs(a.x - self!.x) - Math.abs(b.x - self!.x));
  if (targets[0])
    send({ type: "attack", target: targets[0].id, weapon: self.weapon });
  else notice("No target in front of you");
}
document.addEventListener("click", (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>("button");
  if (!el) return;
  if (el.dataset.action) {
    send(JSON.parse(el.dataset.action));
    return;
  }
  if (el.dataset.kind) {
    buildKind = el.dataset.kind as Kind;
    renderPanel();
    return;
  }
  const ui = el.dataset.ui;
  if (ui === "close") {
    panel = "";
    renderPanel();
  } else if (ui === "interact") interact();
  else if (ui === "attack") attack();
  else if (ui === "reload") send({ type: "reload" });
  else if (ui) toggle(ui);
});
document.addEventListener("change", (e) => {
  if ((e.target as HTMLElement).id === "foundation")
    foundation = (e.target as HTMLSelectElement).value;
});
document.addEventListener("submit", (e) => {
  if ((e.target as HTMLElement).id === "chat-form") {
    e.preventDefault();
    const f = e.target as HTMLFormElement;
    const text = new FormData(f).get("text") as string;
    if (text.trim()) send({ type: "chat", text });
    f.reset();
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
  hold.left = hold.right = hold.sprint = hold.crouch = false;
  send({ type: "move", dir: 0, sprint: false, crouch: false });
});

document.addEventListener("keydown", (event) => {
  if (
    self &&
    !["INPUT", "SELECT", "TEXTAREA"].includes(
      document.activeElement?.tagName || "",
    ) &&
    ["Tab", "ArrowLeft", "ArrowRight"].includes(event.key)
  )
    event.preventDefault();
});
