export const DAY_MS = 86400000,
  UPKEEP_GRACE_MS = 2 * DAY_MS,
  ABANDONED_MS = 3 * DAY_MS;
export type HousingPlot = {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  price: number;
  daily: number;
};
export type Lease = { plotId: string; boughtAt: number; paidUntil: number };
export type SurvivalState = {
  version: 1;
  mapVersion?: 2;
  cash: number;
  dead: boolean;
  plots: HousingPlot[];
  lease?: Lease;
  abandoned: { plotId: string; clearAt: number }[];
  lootReadyAt: Record<string, number>;
};
const integer = (n: unknown) =>
  typeof n === "number" && Number.isSafeInteger(n) && n >= 0;
export const newSurvival = (): SurvivalState => ({
  version: 1,
  cash: 0,
  dead: false,
  plots: [],
  abandoned: [],
  lootReadyAt: {},
});
export function readSurvival(value: unknown): SurvivalState | undefined {
  if (!value || typeof value !== "object") return;
  const v = value as SurvivalState;
  if (v.version !== 1) return;
  const s = newSurvival();
  if (v.mapVersion === 2) s.mapVersion = 2;
  s.cash = integer(v.cash) ? Math.min(1000000, v.cash) : 0;
  s.dead = v.dead === true;
  const ids = new Set<string>();
  if (Array.isArray(v.plots))
    for (const p of v.plots.slice(0, 12))
      if (
        p &&
        typeof p.id === "string" &&
        /^plot-\d+$/.test(p.id) &&
        !ids.has(p.id) &&
        [p.x, p.z].every((n) => Number.isFinite(n) && Math.abs(n) < 290) &&
        [16, 24].includes(p.width) &&
        p.depth === p.width &&
        integer(p.price) &&
        p.price > 0 &&
        integer(p.daily) &&
        p.daily > 0
      ) {
        s.plots.push({ ...p });
        ids.add(p.id);
      }
  if (
    v.lease &&
    ids.has(v.lease.plotId) &&
    integer(v.lease.boughtAt) &&
    integer(v.lease.paidUntil)
  )
    s.lease = { ...v.lease };
  if (Array.isArray(v.abandoned))
    s.abandoned = v.abandoned
      .filter((a) => a && ids.has(a.plotId) && integer(a.clearAt))
      .slice(0, 12)
      .map((a) => ({ ...a }));
  if (v.lootReadyAt && typeof v.lootReadyAt === "object")
    for (const [key, n] of Object.entries(v.lootReadyAt).slice(0, 10000))
      if (/^\d+$/.test(key) && integer(n)) s.lootReadyAt[key] = n;
  return s;
}
export function settleUpkeep(s: SurvivalState, now: number) {
  let forfeited = false;
  if (s.lease && now >= s.lease.paidUntil + UPKEEP_GRACE_MS) {
    s.abandoned.push({
      plotId: s.lease.plotId,
      clearAt: s.lease.paidUntil + UPKEEP_GRACE_MS + ABANDONED_MS,
    });
    s.lease = undefined;
    forfeited = true;
  }
  const cleared = s.abandoned
    .filter((a) => now >= a.clearAt)
    .map((a) => a.plotId);
  s.abandoned = s.abandoned.filter((a) => now < a.clearAt);
  return { forfeited, cleared };
}
export function leaseStatus(s: SurvivalState, now: number) {
  return !s.lease
    ? "none"
    : now >= s.lease.paidUntil + UPKEEP_GRACE_MS
      ? "forfeited"
      : now >= s.lease.paidUntil
        ? "grace"
        : "paid";
}
export function purchasePlot(s: SurvivalState, id: string, now: number) {
  if (s.lease) return "You already own a plot";
  const p = s.plots.find((p) => p.id === id);
  if (!p) return "Plot unavailable";
  if (s.abandoned.some((a) => a.plotId === id))
    return "Abandoned property is awaiting cleanup";
  if (s.cash < p.price) return "Not enough cash";
  s.cash -= p.price;
  s.lease = { plotId: id, boughtAt: now, paidUntil: now + DAY_MS };
  return "";
}
export function payUpkeep(s: SurvivalState, days: number, now: number) {
  const p = s.plots.find((p) => p.id === s.lease?.plotId);
  if (!p || !s.lease || leaseStatus(s, now) === "forfeited")
    return "You do not own an active plot";
  if (!Number.isSafeInteger(days) || days < 1 || days > 30)
    return "Choose 1–30 days";
  const cost = p.daily * days;
  if (s.cash < cost) return "Not enough cash";
  s.cash -= cost;
  s.lease.paidUntil += DAY_MS * days;
  return "";
}
export function inPlot(
  p: { x: number; z: number },
  plot: HousingPlot,
  margin = 0,
) {
  return (
    Math.abs(p.x - plot.x) <= plot.width / 2 - margin &&
    Math.abs(p.z - plot.z) <= plot.depth / 2 - margin
  );
}
