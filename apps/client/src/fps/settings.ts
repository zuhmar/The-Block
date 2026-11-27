export const SETTINGS_KEY = "street-survival:preferences:v1";
export type GameSettings = {
  sensitivity: number;
  crosshair: boolean;
  fov: number;
  quality: "low" | "balanced" | "high";
  invertY: boolean;
  headBob: boolean;
};
export const DEFAULT_SETTINGS: GameSettings = {
  sensitivity: 1,
  crosshair: true,
  fov: 72,
  quality: "balanced",
  invertY: false,
  headBob: true,
};
export function readGameSettings(raw: string | null): GameSettings {
  let v: Partial<GameSettings> = {};
  try {
    const p = JSON.parse(raw ?? "null");
    if (p && typeof p === "object" && !Array.isArray(p)) v = p;
  } catch {
    /* Use safe defaults. */
  }
  const number = (
    value: unknown,
    fallback: number,
    min: number,
    max: number,
  ) =>
    typeof value === "number" && Number.isFinite(value)
      ? Math.min(max, Math.max(min, value))
      : fallback;
  return {
    sensitivity: number(v.sensitivity, 1, 0.25, 3),
    fov: number(v.fov, 72, 60, 100),
    quality:
      v.quality === "low" || v.quality === "high" ? v.quality : "balanced",
    crosshair: typeof v.crosshair === "boolean" ? v.crosshair : true,
    invertY: v.invertY === true,
    headBob: typeof v.headBob === "boolean" ? v.headBob : true,
  };
}
export function settingsPixelRatio(
  dpr: number,
  mobile: boolean,
  quality: GameSettings["quality"],
) {
  return Math.min(
    Number.isFinite(dpr) && dpr > 0 ? dpr : 1,
    quality === "low"
      ? 0.75
      : quality === "high"
        ? mobile
          ? 1.75
          : 2
        : mobile
          ? 1.25
          : 1.5,
  );
}
