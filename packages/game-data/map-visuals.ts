import { districtFrontage } from "./district-frontage.js";
import { isPublicPlanter } from "../shared/src/map-placement.js";
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
  const scale = Math.min(object.width / b.width, object.height / b.height);
  return {
    x: object.x,
    y: object.y + object.height / 2,
    width: frame.width * scale,
    height: frame.height * scale,
    originX: (b.x + b.width / 2) / frame.width,
    originY: (b.y + b.height) / frame.height,
  };
}

// Paved public spaces use contained planters, not painted grass backings.
export function propVisual(object: MapObject): MapObject | null {
  if (object.id.startsWith("market-flowers-")) return null;
  const frontage = districtFrontage(object);
  if (frontage === null) return null;
  if (frontage) object = frontage;
  if (isPublicPlanter(object)) {
    return { ...object, asset: "map-street-planter", width: 64, height: 32 };
  }
  if (object.asset === "map-prop-6")
    return { ...object, asset: "map-street-sedan" };
  if (object.asset === "map-prop-5")
    return {
      ...object,
      asset: "map-street-bench",
      width: Math.min(64, object.width),
      height: Math.min(32, object.height),
    };
  return object;
}
// Uniform alpha-bound fitting keeps proportions and stays within reserved scenery envelopes.
export function sceneryVisual(object: MapObject, frame: SpriteFrame) {
  const bounds = frame.contentBounds || {
    x: 0,
    y: 0,
    width: frame.width,
    height: frame.height,
  };
  const tree = object.kind === "tree",
    lamp = object.asset === "map-prop-4";
  const width = tree ? 128 : object.width,
    height = tree ? 158 : object.height;
  const scale = Math.min(width / bounds.width, height / bounds.height);
  return {
    x: object.x,
    y: tree ? object.y + 19 : lamp ? object.y + object.height / 2 : object.y,
    width: frame.width * scale,
    height: frame.height * scale,
    originX: (bounds.x + bounds.width / 2) / frame.width,
    originY:
      (bounds.y + bounds.height * (tree || lamp ? 1 : 0.5)) / frame.height,
  };
}
export const usesSceneryVisual = (o: MapObject) =>
  o.kind === "tree" ||
  (((o.asset === "map-prop-8" && o.kind === "decoration") ||
    o.asset.startsWith("map-street-") ||
    o.asset.startsWith("map-nature-") ||
    ["map-prop-3", "map-prop-4", "map-prop-5", "map-prop-6"].includes(
      o.asset,
    )) &&
    !["mountain", "cliff", "waterfall"].includes(o.kind));
