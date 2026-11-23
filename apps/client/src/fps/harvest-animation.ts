export type HarvestMotion = "chop" | "mine";
/** Wind-up, accelerated strike at 55%, follow-through, then return to the exact grip pose. */
export function harvestPose(kind: HarvestMotion, progress: number) {
  if (progress <= 0 || progress >= 1)
    return { shoulder: 0, elbow: 0, wrist: 0, side: 0 };
  const frames = [
    [0, 0, 0, 0],
    [0.28, kind === "chop" ? 0.85 : 1.15, -0.9, -0.2],
    [0.55, -0.9, -0.15, 0.25],
    [0.72, -1.02, -0.05, 0.18],
    [1, 0, 0, 0],
  ];
  const p = Math.max(0, Math.min(1, progress)),
    index = Math.max(
      1,
      frames.findIndex((f) => f[0] >= p),
    ),
    a = frames[index - 1],
    b = frames[index];
  let t = (p - a[0]) / (b[0] - a[0]);
  t = t * t * (3 - 2 * t);
  const value = (i: number) => a[i] + (b[i] - a[i]) * t;
  return {
    shoulder: value(1),
    elbow: value(2),
    wrist: value(3),
    side:
      kind === "chop"
        ? Math.sin(p * Math.PI * 2) * 0.35
        : Math.sin(p * Math.PI) * 0.08,
  };
}
