/** Shared wall-clock cycle: 20 minutes from 06:00–18:00, ten minutes overnight. */
export const DAY_MS = 20 * 60 * 1000;
export const NIGHT_MS = 10 * 60 * 1000;
export const CYCLE_MS = DAY_MS + NIGHT_MS;
export const CYCLE_EPOCH = Date.UTC(2026, 0, 1);
const smooth = (a: number, b: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export function dayNightState(now: number) {
  const elapsed =
    ((((Number.isFinite(now) ? now : CYCLE_EPOCH) - CYCLE_EPOCH) % CYCLE_MS) +
      CYCLE_MS) %
    CYCLE_MS;
  const hour =
    (elapsed < DAY_MS
      ? 6 + (elapsed / DAY_MS) * 12
      : 18 + ((elapsed - DAY_MS) / NIGHT_MS) * 12) % 24;
  const angle = ((hour - 6) / 24) * Math.PI * 2;
  const elevation = Math.sin(angle);
  const daylight = smooth(-0.18, 0.3, elevation);
  const lamps = 1 - smooth(-0.12, 0.16, elevation);
  const phase =
    hour >= 5 && hour < 7
      ? "Dawn"
      : hour >= 7 && hour < 17
        ? "Day"
        : hour >= 17 && hour < 19
          ? "Dusk"
          : "Night";
  const minute = Math.floor(hour * 60);
  return {
    hour,
    angle,
    daylight,
    lamps,
    phase,
    time: `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`,
    warmth: daylight * (1 - smooth(0.1, 0.65, elevation)),
  };
}
