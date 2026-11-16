// Bound pixel density independently of world coordinates and CSS viewport size.
export function renderProfile(
  width: number,
  height: number,
  deviceRatio: number,
) {
  const budgetRatio = Math.sqrt(6_000_000 / Math.max(1, width * height));
  const ratio = Math.max(
    1,
    Math.floor(Math.min(deviceRatio || 1, 2, budgetRatio) * 4) / 4,
  );
  return {
    ratio,
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}
export const defaultViewZoom = (cssWidth: number) => (cssWidth < 700 ? 0.9 : 1);
export const viewZoom = (
  physicalZoom: number,
  ratio: number,
  wheelDelta: number,
) => Math.max(0.65, Math.min(1.45, physicalZoom / ratio - wheelDelta * 0.0007));
