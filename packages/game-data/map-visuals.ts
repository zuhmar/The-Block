import type { MapObject } from "../shared/src/official-map.js";
export interface SpriteFrame {
  width: number;
  height: number;
  contentBounds?: { x: number; y: number; width: number; height: number };
}
// Fit visible artwork uniformly and anchor its front edge to its collision footprint.
export function buildingVisual(object: MapObject, frame: SpriteFrame) {
  const b = frame.contentBounds || {
    x: 0,
    y: 0,
    width: frame.width,
    height: frame.height,
  };
  const scale = Math.min(
    object.width / b.width,
    (object.height + 60) / b.height,
  );
  return {
    x: object.x,
    y: object.y + object.height / 2,
    width: frame.width * scale,
    height: frame.height * scale,
    originX: (b.x + b.width / 2) / frame.width,
    originY: (b.y + b.height) / frame.height,
  };
}
