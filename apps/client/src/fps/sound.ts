/** Small original WAV bank, one lazily unlocked Web Audio context, bounded polyphony. */
export const SOUND_NAMES = [
  "pistol",
  "smg",
  "rifle",
  "sniper",
  "lmg",
  "rocket-launch",
  "explosion",
  "grenade-throw",
  "c4-place",
  "detonate",
  "empty",
  "reload-out",
  "reload-in",
  "reload-rack",
  "equip",
  "punch-swing",
  "punch-hit",
  "hit-marker",
  "hurt",
  "step-pavement",
  "step-grass",
  "jump",
  "land",
  "chop",
  "mine",
  "tree-fall",
  "node-break",
  "build-wood",
  "build-stone",
  "build-metal",
  "dismantle",
  "door-open",
  "door-close",
  "pickup",
  "loot",
  "ui-open",
  "ui-close",
] as const;
export type SoundName = (typeof SOUND_NAMES)[number];
export type SoundSettings = { volume: number; muted: boolean };
export const SOUND_SETTINGS_KEY = "street-survival:sound:v1";
export const MAX_SOUND_VOICES = 24;
export function readSoundSettings(raw: string | null): SoundSettings {
  const fallback = { volume: 0.6, muted: false };
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (!value || typeof value !== "object") return fallback;
    const v = value as Partial<SoundSettings>;
    return {
      volume:
        typeof v.volume === "number" && Number.isFinite(v.volume)
          ? Math.max(0, Math.min(1, v.volume))
          : fallback.volume,
      muted: v.muted === true,
    };
  } catch {
    return fallback;
  }
}
export function spatialSound(
  listener: { x: number; z: number },
  yaw: number,
  source: { x: number; z: number },
  reach = 90,
) {
  const dx = source.x - listener.x,
    dz = source.z - listener.z,
    distance = Math.hypot(dx, dz);
  if (
    ![dx, dz, yaw, reach].every(Number.isFinite) ||
    reach <= 0 ||
    distance >= reach
  )
    return { gain: 0, pan: 0, cutoff: 2000 };
  return {
    gain: (1 - distance / reach) / (1 + distance * 0.035),
    pan:
      distance > 0.01
        ? Math.max(
            -1,
            Math.min(1, (dx * Math.cos(yaw) - dz * Math.sin(yaw)) / distance),
          )
        : 0,
    cutoff: Math.max(2200, 16000 - distance * 110),
  };
}
const files = new Map<SoundName, ArrayBuffer>();
let loading: Promise<void> | undefined;
export function preloadSoundFiles() {
  loading ??= Promise.allSettled(
    SOUND_NAMES.map(async (name) => {
      const controller = new AbortController(),
        timeout = setTimeout(() => controller.abort(), 6000);
      try {
        const response = await fetch(`/assets/audio/${name}.wav`, {
          signal: controller.signal,
        });
        if (!response.ok) throw Error(`Sound ${name}: ${response.status}`);
        files.set(name, await response.arrayBuffer());
      } finally {
        clearTimeout(timeout);
      }
    }),
  ).then(() => undefined);
  return loading;
}

type Voice = {
  source: AudioBufferSourceNode;
  nodes: AudioNode[];
  stopped: boolean;
};
export class GameSound {
  private storage?: Pick<Storage, "getItem" | "setItem">;
  private settings: SoundSettings;
  private context?: AudioContext;
  private master?: GainNode;
  private analyser?: AnalyserNode;
  private samples = new Float32Array(128);
  private buffers = new Map<SoundName, AudioBuffer>();
  private decoding?: Promise<void>;
  private voices = new Set<Voice>();
  private lastAt = new Map<SoundName, number>();
  private counts: Partial<Record<SoundName, number>> = {};
  private paused = true;
  private status = "locked";
  private lastSound = "";
  constructor(storage?: Pick<Storage, "getItem" | "setItem">) {
    let raw = null;
    try {
      this.storage = storage ?? globalThis.localStorage;
      raw = this.storage?.getItem(SOUND_SETTINGS_KEY) ?? null;
    } catch {
      /* Device storage is optional. */
    }
    this.settings = readSoundSettings(raw);
  }
  getSettings() {
    return { ...this.settings };
  }
  setVolume(volume: number) {
    if (!Number.isFinite(volume)) return;
    this.settings.volume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
    this.applyGain();
    if (!this.settings.volume) this.stopAll();
  }
  toggleMute() {
    this.settings.muted = !(this.settings.muted || this.settings.volume === 0);
    if (!this.settings.muted && this.settings.volume === 0)
      this.settings.volume = 0.6;
    this.saveSettings();
    this.applyGain();
    if (this.settings.muted) this.stopAll();
  }
  private saveSettings() {
    try {
      this.storage?.setItem(SOUND_SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      /* Gameplay continues without storage. */
    }
  }
  private applyGain() {
    if (!this.context || !this.master) return;
    const value = this.settings.muted ? 0 : this.settings.volume ** 2 * 0.7;
    this.master.gain.setTargetAtTime(value, this.context.currentTime, 0.012);
  }
  setPaused(paused: boolean) {
    this.paused = paused;
    this.applyGain();
    if (paused) this.stopAll();
  }
  async unlock() {
    if (this.settings.muted || !this.settings.volume) return;
    try {
      if (!this.context) {
        const Constructor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!Constructor) {
          this.status = "unsupported";
          return;
        }
        const context = new Constructor({ latencyHint: "interactive" });
        this.context = context;
        const master = context.createGain();
        master.gain.value = 0;
        this.master = master;
        const limiter = context.createDynamicsCompressor();
        limiter.threshold.value = -10;
        limiter.knee.value = 10;
        limiter.ratio.value = 8;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.15;
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        this.analyser = analyser;
        master.connect(limiter);
        limiter.connect(analyser);
        analyser.connect(context.destination);
        // Start resume within the user gesture, before awaiting decoding (Safari/iOS).
        this.decoding = preloadSoundFiles()
          .then(() =>
            Promise.allSettled(
              [...files].map(async ([name, bytes]) =>
                this.buffers.set(
                  name,
                  await context.decodeAudioData(bytes.slice(0)),
                ),
              ),
            ),
          )
          .then(() => undefined);
      }
      if (this.context.state !== "running" && this.context.state !== "closed")
        await this.context.resume();
      await this.decoding;
      this.status = this.context.state;
      this.applyGain();
    } catch {
      this.status = "blocked"; /* Retry on the next explicit user gesture. */
    }
  }
  play(
    name: SoundName,
    options: {
      gain?: number;
      pitch?: number;
      pan?: number;
      cutoff?: number;
      interval?: number;
      ui?: boolean;
    } = {},
  ) {
    const context = this.context,
      buffer = this.buffers.get(name);
    if (
      (this.paused && !options.ui) ||
      this.settings.muted ||
      !this.settings.volume ||
      !context ||
      context.state !== "running" ||
      !buffer ||
      !this.master
    )
      return false;
    const gain = options.gain ?? 0.7;
    if (!Number.isFinite(gain) || gain <= 0) return false;
    if (
      context.currentTime - (this.lastAt.get(name) ?? -Infinity) <
      (options.interval ?? 0.025)
    )
      return false;
    this.lastAt.set(name, context.currentTime);
    if (this.voices.size >= MAX_SOUND_VOICES)
      this.stopVoice(this.voices.values().next().value!);
    const source = context.createBufferSource(),
      level = context.createGain(),
      pan = context.createStereoPanner(),
      filter = context.createBiquadFilter();
    source.buffer = buffer;
    source.playbackRate.value = Math.max(
      0.65,
      Math.min(1.5, options.pitch ?? 0.97 + Math.random() * 0.06),
    );
    level.gain.value = Math.min(1, gain);
    pan.pan.value = Math.max(-1, Math.min(1, options.pan ?? 0));
    filter.type = "lowpass";
    filter.frequency.value = options.cutoff ?? 18000;
    source.connect(filter);
    filter.connect(pan);
    pan.connect(level);
    level.connect(this.master);
    const voice = {
      source,
      nodes: [source, filter, pan, level],
      stopped: false,
    };
    this.voices.add(voice);
    source.onended = () => this.releaseVoice(voice);
    source.start();
    this.counts[name] = (this.counts[name] ?? 0) + 1;
    this.lastSound = name;
    return true;
  }
  private releaseVoice(voice: Voice) {
    for (const node of voice.nodes) node.disconnect();
    this.voices.delete(voice);
  }
  private stopVoice(voice: Voice) {
    if (!voice.stopped) {
      voice.stopped = true;
      try {
        voice.source.stop();
      } catch {
        /* Already ended. */
      }
    }
    this.releaseVoice(voice);
  }
  private stopAll() {
    for (const voice of this.voices) this.stopVoice(voice);
  }
  diagnostics() {
    let peak = 0;
    if (this.analyser && this.context?.state === "running") {
      this.analyser.getFloatTimeDomainData(this.samples);
      for (const n of this.samples) peak = Math.max(peak, Math.abs(n));
    }
    return {
      state: this.context?.state ?? this.status,
      buffers: this.buffers.size,
      voices: this.voices.size,
      maxVoices: MAX_SOUND_VOICES,
      paused: this.paused,
      ...this.settings,
      last: this.lastSound,
      played: { ...this.counts },
      peak,
    };
  }
}

/** Cadence follows travelled ground distance, never a held key against a wall. */
export class FootstepClock {
  private distance = 0;
  reset() {
    this.distance = 0;
  }
  advance(distance: number, grounded: boolean, running: boolean) {
    if (!grounded) {
      this.reset();
      return false;
    }
    if (!Number.isFinite(distance) || distance <= 0) return false;
    this.distance += Math.min(distance, 1);
    const stride = running ? 2.3 : 1.8;
    if (this.distance < stride) return false;
    this.distance %= stride;
    return true;
  }
}
