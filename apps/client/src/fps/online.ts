import { FPS_CONTENT_VERSION } from "../../../../packages/shared/src/fps-protocol";
import { Client, type Room } from "colyseus.js";
import type {
  FpsAction,
  FpsEvent,
  FpsInput,
  FpsPose,
  FpsPrivate,
  FpsSnapshot,
} from "../../../../packages/shared/src/fps-protocol";
import { advanceFpsPose, reconcileFpsPose } from "./network-physics";
import type { Piece } from "./world";
export const ONLINE_MODE_KEY = "stb:online-mode:v1";
export const TOKEN_KEY = "stb:online-token:v1";
export const onlineMode = sessionStorage.getItem(ONLINE_MODE_KEY) === "1";
export const serverUrl = (
  import.meta.env.VITE_SERVER_URL ||
  (location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://localhost:2567"
    : "https://street-survival-server-production.up.railway.app")
).replace(/\/$/, "");
export class OnlineWorld {
  room?: Room;
  id = "";
  ready = false;
  paused = false;
  serverOffset = 0;
  seq = 0;
  pending: FpsInput[] = [];
  unsent: FpsInput[] = [];
  accumulator = 0;
  lastSend = 0;
  jump = false;
  actions = new Map<string, (value: boolean) => void>();
  deferred?: FpsPrivate;
  lastSnapshot = 0;
  constructor(
    private callbacks: {
      snapshot: (s: FpsSnapshot) => void;
      self: (s: FpsPrivate) => void;
      event: (e: FpsEvent) => void;
      status: (s: string, disconnected: boolean) => void;
    },
  ) {}
  async connect() {
    this.ready = false;
    this.callbacks.status("Connecting to The Block…", false);
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw Error("Sign in to join");
      const response = await fetch(serverUrl + "/fps/world");
      if (!response.ok) throw Error("City is starting · try again shortly");
      const world = await response.json();
      if (world.v !== 1) throw Error("Refresh to update the game");
      if (world.contentVersion !== FPS_CONTENT_VERSION)
        throw Error("City is updating · reconnect shortly");
      const room = await new Client(serverUrl.replace(/^http/, "ws")).joinById(
        world.roomId,
        { token, v: 1, contentVersion: FPS_CONTENT_VERSION },
      );
      this.room = room;
      room.onMessage("snapshot", (s: FpsSnapshot) => {
        if (s.v !== 1) return;
        this.id = s.id;
        this.lastSnapshot = performance.now();
        this.serverOffset = s.serverTime - Date.now();
        this.paused = s.paused;
        this.ready = true;
        this.pending = this.pending.filter((i) => i.seq > s.ack);
        const { self, ...rest } = s;
        this.callbacks.snapshot(rest);
        if (self) {
          if (this.actions.size) this.deferred = self;
          else this.callbacks.self(self);
        }
        this.callbacks.status(
          s.paused
            ? "ONLINE · saving unavailable · world paused"
            : `ONLINE · ${s.players.filter((p) => p.online).length} nearby`,
          false,
        );
      });
      room.onMessage(
        "result",
        (r: {
          requestId: string;
          ok: boolean;
          error?: string;
          message?: string;
          self?: FpsPrivate;
        }) => {
          const done = this.actions.get(r.requestId);
          this.actions.delete(r.requestId);
          if (r.self) this.deferred = r.self;
          if (!this.actions.size && this.deferred) {
            this.callbacks.self(this.deferred);
            this.deferred = undefined;
          }
          if (!r.ok && r.error) this.callbacks.status(r.error, false);
          else if (r.message) this.callbacks.status(r.message, false);
          done?.(r.ok);
        },
      );
      room.onMessage("event", (e: FpsEvent) => this.callbacks.event(e));
      room.onMessage("notice", (s: string) => this.callbacks.status(s, false));
      room.onLeave(() =>
        this.disconnect("Disconnected · reconnect to keep playing"),
      );
      room.send("ready");
      room.onError(() => this.disconnect("Connection interrupted · reconnect"));
    } catch (error) {
      this.disconnect(
        error instanceof Error ? error.message : "Could not connect",
      );
    }
  }
  disconnect(message: string) {
    this.ready = false;
    this.stop();
    for (const done of this.actions.values()) done(false);
    this.actions.clear();
    this.deferred = undefined;
    this.callbacks.status(message, true);
  }
  action(action: FpsAction) {
    if (!this.ready || this.paused || this.actions.size > 40) {
      this.callbacks.status("Waiting for the server…", false);
      return Promise.resolve(false);
    }
    const requestId = crypto.randomUUID();
    const result = new Promise<boolean>((resolve) =>
      this.actions.set(requestId, resolve),
    );
    this.room!.send("intent", { v: 1, requestId, action });
    return result;
  }
  stop() {
    this.room?.send("stop");
    this.pending = [];
    this.unsent = [];
    this.accumulator = 0;
    this.jump = false;
  }
  predict(
    pose: FpsPose,
    controls: { x: number; z: number; run: boolean },
    pieces: Piece[],
    dt: number,
  ) {
    if (
      !this.ready ||
      this.paused ||
      performance.now() - this.lastSnapshot > 2500
    ) {
      if (this.ready && performance.now() - this.lastSnapshot > 2500)
        this.callbacks.status(
          "Connection is slow · waiting for the world",
          false,
        );
      return pose;
    }
    this.accumulator = Math.min(0.1, this.accumulator + dt);
    while (this.accumulator >= 0.02 && this.pending.length < 50) {
      this.accumulator -= 0.02;
      const input: FpsInput = {
        seq: ++this.seq,
        ...controls,
        jump: this.jump,
        yaw: pose.yaw,
        pitch: pose.pitch,
      };
      this.jump = false;
      pose = advanceFpsPose(pose, input, pieces);
      this.pending.push(input);
      this.unsent.push(input);
    }
    if (performance.now() - this.lastSend > 45 && this.unsent.length) {
      this.room?.send("inputs", this.unsent.splice(0, 10));
      this.lastSend = performance.now();
    }
    return pose;
  }
  reconcile(pose: FpsPose, ack: number, pieces: Piece[]) {
    return reconcileFpsPose(pose, ack, this.pending, pieces);
  }
}
export function installOnlineMenu(join: () => void) {
  const card = document.querySelector(".menu-card")!;
  const section = document.createElement("section");
  section.className = "online-login";
  section.innerHTML = `<button id="online-toggle">PLAY ONLINE · PVP CITY</button><form id="online-form" hidden><label>Player name<input id="online-name" autocomplete="username" required minlength="3" maxlength="20" pattern="[a-zA-Z][a-zA-Z0-9_]{2,19}"></label><label>Password<input id="online-password" type="password" autocomplete="current-password" minlength="10" maxlength="128" required></label><label class="online-register"><input id="online-register" type="checkbox"> Create an account</label><button type="submit">JOIN THE BLOCK</button></form><p id="online-status" role="status"></p><button id="online-reconnect" hidden>RECONNECT</button><button id="online-solo" hidden>PLAY SINGLE PLAYER</button>`;
  card.insertBefore(section, document.querySelector("#start"));
  const form = section.querySelector<HTMLFormElement>("form")!,
    status = section.querySelector<HTMLElement>("#online-status")!;
  section.querySelector("#online-toggle")!.addEventListener("click", () => {
    if (localStorage.getItem(TOKEN_KEY)) {
      sessionStorage.setItem(ONLINE_MODE_KEY, "1");
      location.reload();
    } else form.hidden = !form.hidden;
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector<HTMLButtonElement>("button")!;
    button.disabled = true;
    status.textContent = "Signing in…";
    try {
      const response = await fetch(serverUrl + "/fps/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: (section.querySelector("#online-name") as HTMLInputElement)
            .value,
          password: (
            section.querySelector("#online-password") as HTMLInputElement
          ).value,
          register: (
            section.querySelector("#online-register") as HTMLInputElement
          ).checked,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Sign in failed");
      localStorage.setItem(TOKEN_KEY, data.token);
      sessionStorage.setItem(ONLINE_MODE_KEY, "1");
      location.reload();
    } catch (error) {
      status.textContent =
        error instanceof Error ? error.message : "Could not sign in";
      button.disabled = false;
    }
  });
  section.querySelector("#online-solo")!.addEventListener("click", () => {
    sessionStorage.removeItem(ONLINE_MODE_KEY);
    location.reload();
  });
  section.querySelector("#online-reconnect")!.addEventListener("click", join);
  if (onlineMode) {
    const note = document.querySelector<HTMLElement>(".save-note");
    if (note)
      note.textContent =
        "Shared PvP city · progress saved online. Menus do not pause the world. Drop everything on death.";
    section.querySelector<HTMLElement>("#online-toggle")!.hidden = true;
    section.querySelector<HTMLElement>("#online-solo")!.hidden = false;
    const signout = document.createElement("button");
    signout.textContent = "SIGN IN WITH ANOTHER ACCOUNT";
    signout.addEventListener("click", () => {
      localStorage.removeItem(TOKEN_KEY);
      form.hidden = false;
    });
    section.append(signout);
    const start = document.querySelector<HTMLButtonElement>("#start")!;
    start.disabled = true;
    start.textContent = "CONNECTING…";
  } else document.querySelector("#start")!.textContent = "PLAY SINGLE PLAYER";
}
