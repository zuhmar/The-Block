import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  SOUND_NAMES,
  MAX_SOUND_VOICES,
  readSoundSettings,
  spatialSound,
  FootstepClock,
  GameSound,
  preloadSoundFiles,
  SOUND_SETTINGS_KEY,
} from "../apps/client/src/fps/sound";
test("all 37 original WAVs are real bounded mono audio with headroom and distinct content", () => {
  const base = "apps/client/static/assets/audio/",
    manifest = JSON.parse(readFileSync(base + "manifest.json", "utf8"));
  assert.deepEqual(
    manifest.sounds.map((s: { id: string }) => s.id),
    [...SOUND_NAMES],
  );
  let bytes = 0;
  const hashes = new Set();
  for (const name of SOUND_NAMES) {
    const b = readFileSync(base + name + ".wav");
    bytes += b.length;
    assert.equal(b.toString("utf8", 0, 4), "RIFF");
    assert.equal(b.toString("utf8", 8, 12), "WAVE");
    assert.equal(b.readUInt16LE(20), 1);
    assert.equal(b.readUInt16LE(22), 1);
    assert.equal(b.readUInt32LE(24), 24000);
    assert.equal(b.readUInt16LE(34), 16);
    let peak = 0,
      power = 0;
    for (let i = 44; i < b.length; i += 2) {
      const v = b.readInt16LE(i) / 32768;
      peak = Math.max(peak, Math.abs(v));
      power += v * v;
    }
    assert(peak > 0.5 && peak < 0.8);
    assert(power > 1);
    const sha = createHash("sha256").update(b).digest("hex");
    assert.equal(
      manifest.sounds.find((s: { id: string }) => s.id === name).sha256,
      sha,
    );
    hashes.add(sha);
  }
  assert.equal(hashes.size, 37);
  assert(bytes < 600000);
});
test("sound preferences sanitize corrupt saves, clamp volume and preserve mute without touching game data", () => {
  assert.deepEqual(readSoundSettings("broken"), { volume: 0.6, muted: false });
  assert.deepEqual(readSoundSettings('{"volume":5,"muted":true}'), {
    volume: 1,
    muted: true,
  });
  assert.equal(readSoundSettings('{"volume":-3}').volume, 0);
  assert.equal(readSoundSettings('{"volume":"loud"}').volume, 0.6);
  const values = new Map([["base", "keep"]]),
    storage = {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => {
        values.set(k, v);
      },
    };
  const sound = new GameSound(storage);
  sound.setVolume(0.35);
  sound.toggleMute();
  assert.deepEqual(new GameSound(storage).getSettings(), {
    volume: 0.35,
    muted: true,
  });
  assert.equal(values.get("base"), "keep");
  sound.setVolume(0);
  sound.toggleMute();
  assert.deepEqual(sound.getSettings(), { volume: 0.6, muted: false });
  assert(values.has(SOUND_SETTINGS_KEY));
  const unavailable = new GameSound({
    getItem() {
      throw Error("blocked");
    },
    setItem() {
      throw Error("quota");
    },
  });
  assert.doesNotThrow(() => {
    unavailable.setVolume(0.2);
    unavailable.toggleMute();
  });
});
test("distance/pan follows the listener heading and rejects invalid or out-of-range emitters", () => {
  const p = { x: 0, z: 0 };
  assert(spatialSound(p, 0, { x: 10, z: 0 }).pan > 0.99);
  assert(spatialSound(p, 0, { x: -10, z: 0 }).pan < -0.99);
  assert(spatialSound(p, Math.PI / 2, { x: 0, z: 10 }).pan < -0.99);
  assert(
    spatialSound(p, 0, { x: 0, z: 0 }).gain >
      spatialSound(p, 0, { x: 0, z: 30 }).gain,
  );
  assert.equal(spatialSound(p, 0, { x: 0, z: 91 }).gain, 0);
  assert.equal(spatialSound(p, NaN, { x: 0, z: 1 }).gain, 0);
});
test("footsteps depend on actual grounded distance and reset during jumping or pause", () => {
  const clock = new FootstepClock();
  for (let i = 0; i < 100; i++) assert(!clock.advance(0, true, false));
  for (let i = 0; i < 3; i++) assert(!clock.advance(0.5, true, false));
  assert(clock.advance(0.5, true, false));
  clock.reset();
  assert(!clock.advance(0.9, true, true));
  assert(!clock.advance(0.9, true, true));
  assert(clock.advance(0.6, true, true));
  clock.advance(0.9, true, false);
  assert(!clock.advance(10, false, false));
  assert(!clock.advance(1, true, false));
  clock.reset();
  assert(!clock.advance(1, true, false));
  assert(!clock.advance(NaN, true, false));
});
test("one audio context decodes once, bounds overlapping voices and immediately honors pause/mute", async () => {
  let contexts = 0,
    decodes = 0;
  const param = () => ({ value: 0, setTargetAtTime() {} });
  class Node {
    gain = param();
    threshold = param();
    knee = param();
    ratio = param();
    attack = param();
    release = param();
    frequency = param();
    pan = param();
    playbackRate = param();
    fftSize = 256;
    type = "";
    buffer: unknown;
    onended?: () => void;
    stopped = false;
    connect() {
      return this;
    }
    disconnect() {}
    start() {}
    stop() {
      this.stopped = true;
      this.onended?.();
    }
    getFloatTimeDomainData(samples: Float32Array) {
      samples.fill(0.01);
    }
  }
  class Context {
    currentTime = 0;
    state = "suspended";
    destination = new Node();
    constructor() {
      contexts++;
    }
    createGain() {
      return new Node();
    }
    createDynamicsCompressor() {
      return new Node();
    }
    createAnalyser() {
      return new Node();
    }
    createBufferSource() {
      return new Node();
    }
    createStereoPanner() {
      return new Node();
    }
    createBiquadFilter() {
      return new Node();
    }
    async resume() {
      this.state = "running";
    }
    async decodeAudioData() {
      decodes++;
      return { duration: 0.2 };
    }
  }
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window"),
    oldFetch = globalThis.fetch;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { AudioContext: Context },
  });
  globalThis.fetch = async () => new Response(new Uint8Array(8));
  try {
    await preloadSoundFiles();
    const sound = new GameSound({ getItem: () => null, setItem() {} });
    assert.equal(sound.diagnostics().state, "locked");
    assert(!sound.play("pistol"));
    sound.setPaused(false);
    await sound.unlock();
    await sound.unlock();
    assert.equal(contexts, 1);
    assert.equal(decodes, 37);
    for (let i = 0; i < 40; i++) assert(sound.play("lmg", { interval: 0 }));
    assert.equal(sound.diagnostics().voices, MAX_SOUND_VOICES);
    sound.setPaused(true);
    assert.equal(sound.diagnostics().voices, 0);
    assert(!sound.play("pistol"));
    assert(sound.play("ui-open", { ui: true }));
    sound.toggleMute();
    assert.equal(sound.diagnostics().voices, 0);
    assert(!sound.play("ui-open", { ui: true, interval: 0 }));
    sound.toggleMute();
    await sound.unlock();
    assert.equal(contexts, 1);
    sound.setPaused(false);
    assert(sound.play("pistol", { interval: 0 }));
    sound.setVolume(0);
    assert.equal(sound.diagnostics().voices, 0);
    assert(!sound.play("pistol", { interval: 0 }));
  } finally {
    globalThis.fetch = oldFetch;
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
